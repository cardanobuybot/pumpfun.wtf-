// Image upload to IPFS via Pinata. The JWT is read from the build env
// (VITE_PINATA_JWT); on testnet it ships in the client bundle, on mainnet it
// should move behind a small proxy. The gateway is configurable so a dedicated
// Pinata gateway can be used instead of the shared public one.

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;
const PINATA_GATEWAY =
    (import.meta.env.VITE_PINATA_GATEWAY as string | undefined)?.replace(/\/+$/, '') ||
    'https://gateway.pinata.cloud';

export const ipfsConfigured = Boolean(PINATA_JWT);

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function ipfsToHttp(url: string): string {
    if (url.startsWith('ipfs://')) {
        return `${PINATA_GATEWAY}/ipfs/${url.slice('ipfs://'.length)}`;
    }
    return url;
}

// Uploads a file to IPFS and returns a gateway https URL pointing at it.
export async function uploadImageToIPFS(file: File): Promise<string> {
    if (!PINATA_JWT) {
        throw new Error('Image upload is not configured (missing VITE_PINATA_JWT).');
    }
    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error('Image is too large (max 5 MB).');
    }

    const form = new FormData();
    form.append('file', file);
    form.append('pinataMetadata', JSON.stringify({ name: file.name || 'token-image' }));

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: { Authorization: `Bearer ${PINATA_JWT}` },
        body: form,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Pinata upload failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as { IpfsHash?: string };
    if (!data.IpfsHash) throw new Error('Pinata returned no IPFS hash.');
    return `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`;
}
