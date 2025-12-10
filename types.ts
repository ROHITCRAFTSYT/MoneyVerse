

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export const DEFAULT_CATEGORIES = [
  'Food',
  'Transport',
  'Entertainment',
  'Shopping',
  'Savings',
  'Allowance',
  'Side Hustle',
  'Other'
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$'
};

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: TransactionType;
  date: string;
}

export interface Asset {
  id: string; // Coingecko ID
  symbol: string;
  name: string;
  price: number;
  type: 'CRYPTO' | 'STOCK' | 'ETF';
  change24h: number; // percentage
  image?: string;
}

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  category: 'LEARNING' | 'FINANCE' | 'INVESTING';
}

export interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  category: 'LEARNING' | 'FINANCE' | 'INVESTING';
  prerequisiteId?: string;
  actionPath?: 'budget' | 'invest' | 'goals'; // Where to direct the user
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  emoji: string;
  completed: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface UserProfile {
  name: string;
  avatar?: string; // URL or Base64 string
  xp: number;
  level: number;
  streak: number;
  walletBalance: number; // Real money tracked
  simulatedCash: number; // Fake money for investing game
  customCategories?: string[];
  currency: string;
  unlockedBadges: string[];
  lastLoginDate?: string;
  theme: 'light' | 'dark';
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  tag: string;
}

export enum OrderType {
  STOP_LOSS = 'STOP_LOSS',
  TAKE_PROFIT = 'TAKE_PROFIT'
}

export interface Order {
  id: string;
  assetSymbol: string;
  type: OrderType;
  targetPrice: number;
  quantity: number;
}
