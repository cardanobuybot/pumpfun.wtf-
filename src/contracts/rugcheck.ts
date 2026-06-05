// Deterministic, on-chain rug analysis. We compute the hard facts ourselves
// (mint status, liquidity/graduation, holder concentration, and wallet-overlap
// among the top holders) — an LLM can't query the chain, so it only phrases
// these facts. The signals also stand on their own if Cocoon isn't configured.
import { Address } from '@ton/core';
import type { OnchainToken } from './launchpad';
import { fetchMintable } from './launchpad';
import { fetchHolders, fetchFunder, type Holder } from './tonapi';

export type Flag = { kind: 'red' | 'warn' | 'green'; text: string };

export type WalletCluster = {
  funder: string; // wallet that seeded these holders
  members: string[]; // top-holder wallets sharing that funder
  isDev: boolean; // funder is the token's dev/creator
};

export type RugSignals = {
  mintable: boolean;
  graduated: boolean;
  liquidityLocked: boolean; // funds sit inside the bonding-curve contract
  holderCount: number;
  circulating: number; // total tokens held by real buyers (excl. the curve)
  topHolderPct: number; // largest non-curve holder, % of circulating
  topHolderOwner: string;
  topHolderIsDev: boolean;
  devPct: number; // dev wallet, % of circulating
  top10Pct: number;
  scamHolders: number;
  clusters: WalletCluster[]; // funders that seeded >= 2 top holders
  devFundedHolders: number; // # of probed top holders funded by the dev
  score: number; // 0-100 risk
  level: 'low' | 'medium' | 'high';
  flags: Flag[];
};

function sameAddr(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  try {
    return Address.parse(a).equals(Address.parse(b));
  } catch {
    return a === b;
  }
}

const PROBE = 12; // how many top holders we trace funders for (bounds tonapi cost)

export async function analyzeToken(token: OnchainToken, dev: string | null): Promise<RugSignals> {
  const [mintable, holdersRaw] = await Promise.all([
    fetchMintable(token.address).catch(() => false),
    fetchHolders(token.address, 50).catch(() => [] as Holder[]),
  ]);

  // The bonding curve master holds the unsold reserve — it's not a real holder.
  const buyers = holdersRaw
    .filter((h) => !sameAddr(h.owner, token.address))
    .sort((a, b) => b.amount - a.amount);
  const circulating = buyers.reduce((s, h) => s + h.amount, 0);
  const pct = (a: number) => (circulating > 0 ? (a / circulating) * 100 : 0);

  const topHolder = buyers[0];
  const topHolderPct = topHolder ? pct(topHolder.amount) : 0;
  const topHolderIsDev = topHolder ? sameAddr(topHolder.owner, dev) : false;
  const devHolder = dev ? buyers.find((h) => sameAddr(h.owner, dev)) : undefined;
  const devPct = devHolder ? pct(devHolder.amount) : 0;
  const top10Pct = buyers.slice(0, 10).reduce((s, h) => s + pct(h.amount), 0);
  const scamHolders = buyers.filter((h) => h.isScam).length;

  // Wallet overlap: trace who first funded each top holder. A funder seeding
  // several top wallets is a strong "one operator behind many wallets" signal.
  const probe = buyers.slice(0, PROBE);
  const funders = await Promise.all(probe.map((h) => fetchFunder(h.owner).catch(() => '')));
  const byFunder = new Map<string, string[]>();
  probe.forEach((h, i) => {
    const f = funders[i];
    if (!f || sameAddr(f, h.owner) || sameAddr(f, token.address)) return;
    const arr = byFunder.get(f) ?? [];
    arr.push(h.owner);
    byFunder.set(f, arr);
  });
  const clusters: WalletCluster[] = [...byFunder.entries()]
    .filter(([, m]) => m.length >= 2)
    .map(([funder, members]) => ({ funder, members, isDev: sameAddr(funder, dev) }))
    .sort((a, b) => b.members.length - a.members.length);
  const devFundedHolders = dev ? funders.filter((f) => sameAddr(f, dev)).length : 0;

  // ---- scoring (transparent heuristics) ----
  let score = 0;
  const flags: Flag[] = [];

  if (topHolderPct >= 80) {
    score += 45;
    flags.push({ kind: 'red', text: `One wallet holds ${topHolderPct.toFixed(0)}% of the float` });
  } else if (topHolderPct >= 50) {
    score += 30;
    flags.push({ kind: 'red', text: `Top wallet holds ${topHolderPct.toFixed(0)}% of the float` });
  } else if (topHolderPct >= 30) {
    score += 15;
    flags.push({ kind: 'warn', text: `Top wallet holds ${topHolderPct.toFixed(0)}% of the float` });
  } else if (circulating > 0) {
    flags.push({ kind: 'green', text: `Top wallet holds ${topHolderPct.toFixed(0)}% — well spread` });
  }

  if (devPct >= 50) {
    score += 25;
    flags.push({ kind: 'red', text: `Dev wallet holds ${devPct.toFixed(0)}% of the float` });
  } else if (devPct >= 25) {
    score += 12;
    flags.push({ kind: 'warn', text: `Dev wallet holds ${devPct.toFixed(0)}% of the float` });
  }

  if (devFundedHolders >= 2) {
    score += 20;
    flags.push({
      kind: 'red',
      text: `Dev seeded ${devFundedHolders} of the top wallets (possible insiders)`,
    });
  }
  const sybil = clusters.filter((c) => !c.isDev);
  if (sybil.length) {
    const linked = sybil.reduce((s, c) => s + c.members.length, 0);
    score += Math.min(30, linked * 8);
    flags.push({
      kind: 'red',
      text: `${linked} top wallets share a common funder (possible sybil cluster)`,
    });
  }

  if (mintable && token.graduated) {
    score += 20;
    flags.push({ kind: 'red', text: 'Mint still open after graduation — supply can be diluted' });
  } else if (mintable) {
    flags.push({ kind: 'warn', text: 'Mint open (controlled by the bonding curve until graduation)' });
  } else {
    flags.push({ kind: 'green', text: 'Mint closed' });
  }

  // Liquidity: pre-graduation the raised funds live inside the curve contract —
  // the dev can't pull them. After graduation they migrate to a DEX (LP-lock
  // status is outside this contract, so we flag it for manual checking).
  const liquidityLocked = !token.graduated;
  if (liquidityLocked) {
    flags.push({ kind: 'green', text: 'Liquidity locked in the bonding curve (dev cannot withdraw)' });
  } else {
    score += 8;
    flags.push({ kind: 'warn', text: 'Graduated to DEX — verify the LP is locked' });
  }

  if (buyers.length > 0 && buyers.length < 5) {
    score += 10;
    flags.push({ kind: 'warn', text: `Only ${buyers.length} holders` });
  }
  if (scamHolders > 0) {
    score += 15;
    flags.push({ kind: 'red', text: `${scamHolders} holder(s) flagged as scam by tonapi` });
  }

  score = Math.max(0, Math.min(100, score));
  const level: RugSignals['level'] = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';

  return {
    mintable,
    graduated: token.graduated,
    liquidityLocked,
    holderCount: buyers.length,
    circulating,
    topHolderPct,
    topHolderOwner: topHolder?.owner ?? '',
    topHolderIsDev,
    devPct,
    top10Pct,
    scamHolders,
    clusters,
    devFundedHolders,
    score,
    level,
    flags,
  };
}

// Compact, human-readable fact sheet handed to Cocoon for the plain-language
// verdict. Kept terse so the model reasons over numbers, not prose. Written in
// English; the model mirrors the user's language in its reply.
export function signalsToPrompt(token: OnchainToken, s: RugSignals): string {
  const lines = [
    `Token: ${token.symbol} (${token.name})`,
    `Bonding-curve progress: ${token.progress.toFixed(1)}% ${s.graduated ? '(GRADUATED / live on DEX)' : '(still on the curve)'}`,
    `Mint open: ${s.mintable ? 'yes' : 'no'}`,
    `Liquidity locked in the curve contract: ${s.liquidityLocked ? 'yes (dev cannot withdraw)' : 'no — migrated to a DEX, LP lock unverified'}`,
    `Holders: ${s.holderCount}`,
    `Largest wallet: ${s.topHolderPct.toFixed(1)}% of float${s.topHolderIsDev ? ' (this is the dev wallet)' : ''}`,
    `Dev wallet: ${s.devPct.toFixed(1)}% of float`,
    `Top-10 wallets combined: ${s.top10Pct.toFixed(1)}% of float`,
    `Top wallets seeded by the dev: ${s.devFundedHolders}`,
    `Clusters sharing a common funder (possible sybils): ${s.clusters.length ? s.clusters.map((c) => `${c.members.length} wallets${c.isDev ? ' from dev' : ''}`).join(', ') : 'none'}`,
    `Holders flagged as scam: ${s.scamHolders}`,
    `Internal risk score: ${s.score}/100 (${s.level})`,
  ];
  return lines.join('\n');
}
