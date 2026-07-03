// One-off script: generates an ECDSA P-256 (ES256) signing keypair for the
// Patreon Worker's JWTs. Run once with `node generate-keys.js`, then:
//   - paste the PRIVATE JWK into `wrangler secret put JWT_PRIVATE_KEY`
//   - paste the PUBLIC JWK into app/state.js as PATREON_PUBLIC_JWK
// The private key must never be committed to the repo or embedded in the
// Foundry module — only the Worker (via a Cloudflare secret) should have it.

const { webcrypto } = require('node:crypto');

async function main() {
  const keyPair = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const privateJwk = await webcrypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicJwk = await webcrypto.subtle.exportKey('jwk', keyPair.publicKey);

  console.log('=== PRIVATE JWK (secret — Cloudflare only) ===');
  console.log(JSON.stringify(privateJwk));
  console.log('\nSet it with:');
  console.log('  wrangler secret put JWT_PRIVATE_KEY');
  console.log('  (paste the JSON above as the value when prompted)');

  console.log('\n=== PUBLIC JWK (safe to embed in the Foundry module) ===');
  console.log(JSON.stringify(publicJwk));
  console.log('\nPaste this into app/state.js as the PATREON_PUBLIC_JWK constant.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
