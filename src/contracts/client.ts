import { getHttpEndpoint } from '@orbs-network/ton-access';
import { TonClient } from '@ton/ton';
import { NETWORK } from './config';

let clientPromise: Promise<TonClient> | null = null;

export function getClient(): Promise<TonClient> {
    if (!clientPromise) {
        clientPromise = getHttpEndpoint({ network: NETWORK }).then(
            (endpoint) => new TonClient({ endpoint }),
        );
    }
    return clientPromise;
}
