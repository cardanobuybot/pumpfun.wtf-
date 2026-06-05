// Cocoon — TON's decentralized, confidential AI inference network.
// We talk to a Cocoon proxy through our own nginx reverse proxy at /api/cocoon/,
// which injects the tonconsole API key server-side (so it never ships in the
// browser bundle — same pattern as /api/tonapi/). The proxy exposes an
// OpenAI-compatible API: GET /v1/models (live whitelist) + POST
// /v1/chat/completions. Attestation / RA-TLS is handled by the proxy.
const COCOON_BASE = '/api/cocoon';

let cachedModel: string | null = null;

// Thrown when the Cocoon proxy isn't wired up yet (no key / bad upstream), so
// the UI can fall back to the deterministic on-chain analysis gracefully.
export class CocoonNotConfigured extends Error {}

// Resolve a usable model id from the proxy's whitelist. Cached for the session.
export async function getCocoonModel(): Promise<string> {
  if (cachedModel) return cachedModel;
  let res: Response;
  try {
    res = await fetch(`${COCOON_BASE}/v1/models`, { headers: { Accept: 'application/json' } });
  } catch {
    throw new CocoonNotConfigured('Cocoon proxy unreachable');
  }
  if (res.status === 502 || res.status === 404 || res.status === 401 || res.status === 403) {
    throw new CocoonNotConfigured(`Cocoon not configured (${res.status})`);
  }
  if (!res.ok) throw new Error(`cocoon models ${res.status}`);
  const data = await res.json();
  const id: string | undefined = data?.data?.[0]?.id ?? data?.models?.[0]?.id;
  if (!id) throw new CocoonNotConfigured('No Cocoon models available');
  cachedModel = id;
  return id;
}

// Run a single chat completion and return the assistant's text.
export async function cocoonChat(system: string, user: string): Promise<string> {
  const model = await getCocoonModel();
  let res: Response;
  try {
    res = await fetch(`${COCOON_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });
  } catch {
    throw new CocoonNotConfigured('Cocoon proxy unreachable');
  }
  if (res.status === 502 || res.status === 404 || res.status === 401 || res.status === 403) {
    throw new CocoonNotConfigured(`Cocoon not configured (${res.status})`);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`cocoon ${res.status} ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty Cocoon response');
  return content.trim();
}
