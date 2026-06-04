export interface TokenSocials {
  website?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
}

export interface Token {
  id: string;
  ticker: string;
  name: string;
  shortId: string;
  description: string;
  progress: number;
  marketCap: string;
  timeAgo: string;
  txs: number;
  volume24h: string;
  kingOfHillProgress: number;
  image: string;
  socials?: TokenSocials;
}

export const kingOfHillToken: Token = {
  id: '5b5f76a1',
  ticker: 'TIKR',
  name: 'Pepe Coin',
  shortId: '5b5f..76a1',
  description: 'Combining blockchain technology with ocean conservation initiatives.',
  progress: 23.48,
  marketCap: '$12.3K',
  timeAgo: '3h ago',
  txs: 51,
  volume24h: '$1.26k',
  kingOfHillProgress: 15.4,
  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pepe&backgroundColor=b6e3f4',
  socials: {
    website: 'https://pepecoin.xyz',
    twitter: 'https://x.com/pepecoin',
    telegram: 'https://t.me/pepecoin',
  },
};

export const tokenFeed: Token[] = [
  {
    id: '5b5f76a2',
    ticker: 'LUNA',
    name: 'LunaVerse',
    shortId: '5b5f..76a2',
    description: 'A decentralized platform for connecting virtual worlds and creating metaverse...',
    progress: 23.48,
    marketCap: '$12.3K',
    timeAgo: '3h ago',
    txs: 51,
    volume24h: '$1.26k',
    kingOfHillProgress: 12.1,
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luna&backgroundColor=c0aede',
    socials: {
      twitter: 'https://x.com/lunaverse',
      discord: 'https://discord.gg/lunaverse',
    },
  },
  {
    id: '5b5f76a3',
    ticker: 'SOLR',
    name: 'SolarDAO',
    shortId: '5b5f..76a3',
    description: 'A token powering renewable energy investments through blockchain...',
    progress: 23.48,
    marketCap: '$12.3K',
    timeAgo: '3h ago',
    txs: 51,
    volume24h: '$1.26k',
    kingOfHillProgress: 8.7,
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=solar&backgroundColor=ffd5dc',
    socials: {
      website: 'https://solardao.io',
      telegram: 'https://t.me/solardao',
    },
  },
  {
    id: '5b5f76a4',
    ticker: 'ECO',
    name: 'EcoToken',
    shortId: '5b5f..76a4',
    description: 'Supports reforestation efforts by tokenizing carbon credits...',
    progress: 23.48,
    marketCap: '$12.3K',
    timeAgo: '3h ago',
    txs: 51,
    volume24h: '$1.26k',
    kingOfHillProgress: 6.3,
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eco&backgroundColor=d1f4e0',
    socials: {
      twitter: 'https://x.com/ecotoken',
      discord: 'https://discord.gg/ecotoken',
      telegram: 'https://t.me/ecotoken',
    },
  },
  {
    id: '5b5f76a5',
    ticker: 'TRRA',
    name: 'TerraBlock',
    shortId: '5b5f..76a5',
    description: 'A blockchain platform optimizing land management...',
    progress: 23.48,
    marketCap: '$12.3K',
    timeAgo: '3h ago',
    txs: 51,
    volume24h: '$1.26k',
    kingOfHillProgress: 4.1,
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=terra&backgroundColor=ffdfbf',
  },
  {
    id: '5b5f76a6',
    ticker: 'ORBT',
    name: 'OrbitDex',
    shortId: '5b5f..76a6',
    description: 'Decentralized exchange with minimal transaction fees...',
    progress: 23.48,
    marketCap: '$12.3K',
    timeAgo: '3h ago',
    txs: 51,
    volume24h: '$1.26k',
    kingOfHillProgress: 3.2,
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=orbit&backgroundColor=c0aede',
    socials: {
      website: 'https://orbitdex.io',
      twitter: 'https://x.com/orbitdex',
    },
  },
  {
    id: '5b5f76a7',
    ticker: 'ENRG',
    name: 'EnergyCoin',
    shortId: '5b5f..76a7',
    description: 'Transforming energy markets through blockchain-based...',
    progress: 23.48,
    marketCap: '$12.3K',
    timeAgo: '3h ago',
    txs: 51,
    volume24h: '$1.26k',
    kingOfHillProgress: 2.8,
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=energy&backgroundColor=b6e3f4',
    socials: {
      telegram: 'https://t.me/energycoin',
    },
  },
  {
    id: '5b5f76a8',
    ticker: 'RARE',
    name: 'RareBits',
    shortId: '5b5f..76a8',
    description: 'Focused on rare collectibles and NFT trading through...',
    progress: 23.48,
    marketCap: '$12.3K',
    timeAgo: '3h ago',
    txs: 51,
    volume24h: '$1.26k',
    kingOfHillProgress: 1.5,
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rare&backgroundColor=ffd5dc',
    socials: {
      twitter: 'https://x.com/rarebits',
      discord: 'https://discord.gg/rarebits',
      website: 'https://rarebits.io',
    },
  },
];

export interface Trade {
  time: string;
  type: 'BUY' | 'SELL';
  amount: string;
  price: string;
}

export const lastTrades: Trade[] = [
  { time: '11h', type: 'BUY', amount: '5,000', price: '0.00000802' },
  { time: '11h', type: 'SELL', amount: '3,500', price: '0.00000798' },
  { time: '13h', type: 'BUY', amount: '12,000', price: '0.00000815' },
  { time: '23h', type: 'SELL', amount: '8,000', price: '0.00000789' },
  { time: '1d', type: 'BUY', amount: '15,000', price: '0.00000823' },
  { time: '2d', type: 'SELL', amount: '7,500', price: '0.00000795' },
  { time: '5d', type: 'BUY', amount: '20,000', price: '0.00000834' },
  { time: '7d', type: 'SELL', amount: '9,000', price: '0.00000778' },
  { time: '14d', type: 'BUY', amount: '25,000', price: '0.00000845' },
];

export const chartData = [
  { time: '00:00', price: 0.012 },
  { time: '04:00', price: 0.014 },
  { time: '08:00', price: 0.011 },
  { time: '12:00', price: 0.016 },
  { time: '16:00', price: 0.013 },
  { time: '20:00', price: 0.019 },
  { time: '10:03', price: 0.018938 },
  { time: '11:00', price: 0.021 },
  { time: '12:00', price: 0.017 },
  { time: '13:00', price: 0.022 },
  { time: '14:00', price: 0.020 },
  { time: '15:00', price: 0.024 },
];
