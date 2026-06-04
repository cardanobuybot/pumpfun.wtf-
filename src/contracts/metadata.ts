import { beginCell, Cell, Dictionary } from '@ton/core';
import { sha256_sync } from '@ton/crypto';

// TEP-64 on-chain jetton metadata: build and parse.

const ONCHAIN_PREFIX = 0x00;
const SNAKE_PREFIX = 0x00;
const CELL_MAX_BITS = 1023;

export type TokenMetadata = {
    name: string;
    symbol: string;
    description?: string;
    image?: string;
    decimals?: string;
};

function makeSnakeCell(data: Buffer): Cell {
    const chunks: Buffer[] = [];
    const firstChunkBytes = Math.floor((CELL_MAX_BITS - 8) / 8);
    const restChunkBytes = Math.floor(CELL_MAX_BITS / 8);
    let offset = 0;
    chunks.push(data.subarray(offset, offset + firstChunkBytes));
    offset += firstChunkBytes;
    while (offset < data.length) {
        chunks.push(data.subarray(offset, offset + restChunkBytes));
        offset += restChunkBytes;
    }
    let curr: Cell | null = null;
    for (let i = chunks.length - 1; i >= 0; i--) {
        const b = beginCell();
        if (i === 0) b.storeUint(SNAKE_PREFIX, 8);
        b.storeBuffer(chunks[i]);
        if (curr) b.storeRef(curr);
        curr = b.endCell();
    }
    return curr ?? beginCell().storeUint(SNAKE_PREFIX, 8).endCell();
}

function parseSnakeCell(cell: Cell): string {
    let result = Buffer.alloc(0);
    let c: Cell | null = cell;
    let first = true;
    while (c) {
        const s = c.beginParse();
        if (first) {
            s.loadUint(8); // snake prefix
            first = false;
        }
        const remainingBytes = Math.floor(s.remainingBits / 8);
        if (remainingBytes > 0) result = Buffer.concat([result, s.loadBuffer(remainingBytes)]);
        c = s.remainingRefs > 0 ? s.loadRef() : null;
    }
    return result.toString('utf8');
}

const KEYS = ['name', 'symbol', 'description', 'image', 'decimals'] as const;

export function buildTokenContent(meta: TokenMetadata): Cell {
    const dict = Dictionary.empty(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell());
    const entries: Record<string, string> = {
        name: meta.name,
        symbol: meta.symbol,
        decimals: meta.decimals ?? '9',
    };
    if (meta.description) entries.description = meta.description;
    if (meta.image) entries.image = meta.image;
    for (const [key, value] of Object.entries(entries)) {
        dict.set(sha256_sync(key), makeSnakeCell(Buffer.from(value, 'utf8')));
    }
    return beginCell().storeUint(ONCHAIN_PREFIX, 8).storeDict(dict).endCell();
}

export function parseTokenContent(cell: Cell): TokenMetadata {
    const s = cell.beginParse();
    const prefix = s.loadUint(8);
    const result: TokenMetadata = { name: '', symbol: '' };
    if (prefix !== ONCHAIN_PREFIX) return result;
    const dict = s.loadDict(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell());
    for (const key of KEYS) {
        const valCell = dict.get(sha256_sync(key));
        if (valCell) {
            (result as Record<string, string>)[key] = parseSnakeCell(valCell);
        }
    }
    return result;
}
