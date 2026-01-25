// Trading pairs configuration
export const TRADING_PAIRS = [
  { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', icon: '₿', decimals: 2 },
  { symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', icon: 'Ξ', decimals: 2 },
  { symbol: 'BNB/USDT', base: 'BNB', quote: 'USDT', icon: '◉', decimals: 2 },
  { symbol: 'EOS/USDT', base: 'EOS', quote: 'USDT', icon: '◈', decimals: 4 },
  { symbol: 'TRX/USDT', base: 'TRX', quote: 'USDT', icon: '◇', decimals: 4 },
] as const;

export type TradingPair = typeof TRADING_PAIRS[number];

// Binance WebSocket endpoints for live prices
export const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
export const BINANCE_REST_URL = 'https://api.binance.com/api/v3';

// CoinGecko fallback
export const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// App routes
export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  TRADE: '/trade',
  WALLET: '/wallet',
  HISTORY: '/history',
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_USERS: '/admin/users',
  ADMIN_DEPOSITS: '/admin/deposits',
  ADMIN_WITHDRAWALS: '/admin/withdrawals',
  ADMIN_TRADES: '/admin/trades',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

// Formatting utilities
export const formatCurrency = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatCrypto = (value: number, decimals = 8): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatFullDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};
