PALCOREX

A Solana wallet signs in with an expiring message challenge and hatches a pixel
cardboard robot. The SHA-256 avatar seed fixes its name, eyes, lights and accessory
for a given public address. A public-address preview needs no signature.

Run Node.js 22 or later from the project root:
  node server.mjs
Open http://localhost:3000 with Phantom, Backpack, or Solflare installed. Use that exact
local origin, or set CLAUDEBOX_ORIGIN to your public HTTPS URL before starting.

Server environment:
  ANTHROPIC_API_KEY          Enables real Claude chat.
  ANTHROPIC_MODEL            Optional, defaults to claude-sonnet-5-5.
  CLAUDEBOX_ORIGIN           Exact site origin. Defaults to http://localhost:PORT.
  CLAUDEBOX_ALLOWED_WALLETS  Optional comma-separated wallet allowlist for chat.
  PORT                       Defaults to 3000.

Host the Node process behind HTTPS for a public deployment. The static site supports wallet connection and local hatching. Wallet signature
verification and Claude chat use the same-origin Node server.
Keep the API key in the host's environment settings. Chat has per-wallet and
server-wide limits. Session state and recent chat history live in one process
and expire after eight hours or when the process restarts. Minting and token
economics are concept features.

Phantom integration: https://docs.phantom.com/solana/integrating-phantom
Claude Messages API: https://platform.claude.com/docs/en/api/overview
