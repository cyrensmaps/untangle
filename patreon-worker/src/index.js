// Untangle Patreon Worker
//
// Stateless Cloudflare Worker that does the Patreon OAuth handshake on
// Untangle's behalf and hands back a signed ES256 JWT the Foundry module can
// verify locally (via Web Crypto, no server call needed per feature check).
//
// Routes:
//   GET /login     -> redirects to Patreon's OAuth authorize page
//   GET /callback  -> exchanges the code, checks membership, signs a JWT,
//                     shows an HTML page with the token to copy into Foundry
//
// No KV/D1/database. CSRF state is protected with a short-lived, HttpOnly
// double-submit cookie (no server-side storage needed).

const PATREON_AUTHORIZE_URL = 'https://www.patreon.com/oauth2/authorize';
const PATREON_TOKEN_URL = 'https://www.patreon.com/api/oauth2/token';
// include=memberships.campaign (not just memberships) so each membership
// tells us WHICH campaign it's for — a Patreon account's identity call
// returns memberships across every campaign the user supports, not just
// this one, so without the campaign relationship there's no way to tell
// "an active patron of Untangle" apart from "an active patron of anything."
const PATREON_IDENTITY_URL =
  'https://www.patreon.com/api/oauth2/v2/identity?include=memberships.campaign&fields%5Bmember%5D=patron_status&fields%5Bcampaign%5D=creation_name';
// Campaigns the logged-in user OWNS (as a creator) — separate from
// memberships (campaigns they support as a patron). This is how the
// campaign owner finds their own campaign's id: they'll never appear as a
// "member" of their own page, so the identity call's memberships list can
// never surface it. Requires the `campaigns` scope in addition to identity.
const PATREON_CAMPAIGNS_URL =
  'https://www.patreon.com/api/oauth2/v2/campaigns?fields%5Bcampaign%5D=creation_name';

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Pulls the campaign id/name/status for one membership entry out of the
// identity response's `included` array (JSON:API sideloading).
function membershipInfo(membershipRef, included) {
  const member = included.find((inc) => inc.type === 'member' && inc.id === membershipRef.id);
  const campaignId = member?.relationships?.campaign?.data?.id;
  const campaign = included.find((inc) => inc.type === 'campaign' && inc.id === campaignId);
  return {
    campaignId,
    campaignName: campaign?.attributes?.creation_name || '(unnamed campaign)',
    status: member?.attributes?.patron_status,
  };
}

function base64url(bytes) {
  let binary = '';
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlFromString(str) {
  return base64url(new TextEncoder().encode(str));
}

function randomState() {
  return base64url(crypto.getRandomValues(new Uint8Array(24)));
}

async function signJwt(payload, privateJwkString) {
  const privateJwk = JSON.parse(privateJwkString);
  const key = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const header = { alg: 'ES256', typ: 'JWT' };
  const signingInput = `${base64urlFromString(JSON.stringify(header))}.${base64urlFromString(
    JSON.stringify(payload)
  )}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64url(signature)}`;
}

function htmlPage(title, bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #1b1712; color: #e8dfce; max-width: 640px; margin: 60px auto; padding: 0 20px; line-height: 1.5; }
  h1 { color: #c8a24a; font-size: 1.4em; }
  textarea { width: 100%; height: 100px; background: #2a241c; color: #e8dfce; border: 1px solid #4a3f2e; border-radius: 6px; padding: 10px; font-family: monospace; font-size: 0.85em; }
  .hint { color: #b0a58c; font-size: 0.9em; }
  .error { color: #d97a6c; }
</style></head><body>${bodyHtml}</body></html>`;
}

async function handleLogin(request, env) {
  const url = new URL(request.url);
  const state = randomState();
  const redirectUri = `${url.origin}/callback`;
  const authorizeUrl = new URL(PATREON_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', env.PATREON_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'identity identity.memberships campaigns');
  authorizeUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      'Set-Cookie': `untangle_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/callback`,
    },
  });
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookieState = (cookieHeader.match(/untangle_state=([^;]+)/) || [])[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return new Response(
      htmlPage(
        'Untangle — Link failed',
        `<h1>Link failed</h1><p class="error">Missing or mismatched state. Please try logging in again from Foundry's Untangle Settings page.</p>`
      ),
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const redirectUri = `${url.origin}/callback`;

  const tokenRes = await fetch(PATREON_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: env.PATREON_CLIENT_ID,
      client_secret: env.PATREON_CLIENT_SECRET,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return new Response(
      htmlPage(
        'Untangle — Link failed',
        `<h1>Link failed</h1><p class="error">Patreon rejected the authorization code. Please try again.</p>`
      ),
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const tokenData = await tokenRes.json();

  const identityRes = await fetch(PATREON_IDENTITY_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!identityRes.ok) {
    return new Response(
      htmlPage(
        'Untangle — Link failed',
        `<h1>Link failed</h1><p class="error">Could not read your Patreon membership. Please try again.</p>`
      ),
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const identity = await identityRes.json();
  const patreonUserId = identity?.data?.id;
  const memberships = identity?.data?.relationships?.memberships?.data || [];
  const included = identity?.included || [];

  // One-time bootstrap: until PATREON_CAMPAIGN_ID is set, the Worker has no
  // way to know which campaign is Untangle's own. Log in as the campaign
  // OWNER (you) to see it listed below — owners don't show up in their own
  // memberships list, so this uses the separate /campaigns endpoint (the
  // "campaigns you own" one), not the identity/memberships one above.
  if (!env.PATREON_CAMPAIGN_ID) {
    const campaignsRes = await fetch(PATREON_CAMPAIGNS_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const campaignsData = campaignsRes.ok ? await campaignsRes.json() : { data: [] };
    const ownedCampaigns = (campaignsData?.data || []).map((c) => ({
      id: c.id,
      name: c.attributes?.creation_name || '(unnamed campaign)',
    }));
    const membershipRows = memberships.map((m) => membershipInfo(m, included));

    return new Response(
      htmlPage(
        'Untangle — Setup needed',
        `<h1>One more setup step</h1>
         <p>The Worker doesn't yet know which Patreon campaign is <em>yours</em>, so it can't tell "an active patron of Untangle" apart from "an active patron of anything." Log in here as <strong>the campaign owner</strong> (which you just did) — your own campaign(s) are listed below. Find yours, then run:</p>
         <p><code>wrangler secret put PATREON_CAMPAIGN_ID</code></p>
         <p>...with that campaign's id as the value, redeploy, and log in again.</p>
         <h3 style="font-size:1.05em;margin-top:24px">Campaigns you own</h3>
         ${ownedCampaigns.length
           ? `<ul>${ownedCampaigns.map(c => `<li><code>${escHtml(c.id)}</code> — ${escHtml(c.name)}</li>`).join('')}</ul>`
           : `<p>None found. Make sure you logged in with the Patreon account that <em>created</em> your campaign (not a separate patron account), and that the app's requested scopes include "campaigns."</p>`}
         <h3 style="font-size:1.05em;margin-top:20px" class="hint">For reference — campaigns you support as a patron</h3>
         ${membershipRows.length
           ? `<ul>${membershipRows.map(r => `<li><code>${escHtml(r.campaignId)}</code> — ${escHtml(r.campaignName)} (${escHtml(r.status || 'no status')})</li>`).join('')}</ul>`
           : `<p class="hint">None.</p>`}`
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const entitled = memberships.some((m) => {
    const info = membershipInfo(m, included);
    return info.status === 'active_patron' && info.campaignId === env.PATREON_CAMPAIGN_ID;
  });

  if (!entitled) {
    return new Response(
      htmlPage(
        'Untangle — No active pledge',
        `<h1>No active pledge found</h1><p>We didn't find an active Patreon pledge on this account. If you believe this is wrong, make sure you're logged into the correct Patreon account and try again.</p>`
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt(
    { sub: patreonUserId, entitled: true, iat: now, exp: now + TOKEN_TTL_SECONDS },
    env.JWT_PRIVATE_KEY
  );

  return new Response(
    htmlPage(
      'Untangle — Linked!',
      `<h1>You're linked!</h1>
       <p>Copy the token below and paste it into Foundry's <strong>Settings → Configure Settings → Untangle → Premium Features</strong> panel.</p>
       <textarea readonly onclick="this.select()">${jwt}</textarea>
       <p class="hint">This token is valid for 30 days. When it expires, just come back to this page and log in again.</p>`
    ),
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}

// Test-only bypass: signs a fake "entitled" JWT without touching Patreon at
// all, so the campaign owner can verify the JWT-signing/Foundry paste-in/
// premium-unlock code path without needing a second Patreon account to
// actually pledge. Gated behind a long random secret (TEST_BYPASS_SECRET) so
// nobody else can hit it once deployed. If that secret isn't set, this route
// is completely disabled — there's no way to enable it by accident.
async function handleTestLogin(request, env) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  if (!env.TEST_BYPASS_SECRET || secret !== env.TEST_BYPASS_SECRET) {
    return new Response('Not found', { status: 404 });
  }

  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt(
    { sub: 'test-user', entitled: true, iat: now, exp: now + TOKEN_TTL_SECONDS },
    env.JWT_PRIVATE_KEY
  );

  return new Response(
    htmlPage(
      'Untangle — Linked! (TEST MODE)',
      `<h1>You're linked! <span style="color:#d97a6c">(TEST MODE)</span></h1>
       <p>This token was generated by the test bypass, not a real Patreon login — no membership was actually checked. Paste it into Foundry's <strong>Settings → Configure Settings → Untangle → Premium Features</strong> panel to confirm the "Linked" status and premium-feature checkboxes unlock correctly, then discard it.</p>
       <textarea readonly onclick="this.select()">${jwt}</textarea>
       <p class="hint">Signed the same way and valid for the same 30 days as a real token — Foundry verifies it identically, which is the point of this bypass.</p>`
    ),
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/login') return handleLogin(request, env);
      if (url.pathname === '/callback') return handleCallback(request, env);
      if (url.pathname === '/test-login') return handleTestLogin(request, env);
      return new Response('Untangle Patreon Worker. Try /login.', { status: 200 });
    } catch (err) {
      return new Response(
        htmlPage('Untangle — Error', `<h1>Something went wrong</h1><p class="error">${String(err.message || err)}</p>`),
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }
  },
};
