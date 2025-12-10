
import { UserProfile, Transaction, PortfolioItem, Quest, Goal, Order } from '../types';

// Keys for persistence
const STORAGE_KEYS = {
  USER: 'mv_user',
  TRANSACTIONS: 'mv_transactions',
  PORTFOLIO: 'mv_portfolio',
  QUESTS: 'mv_quests',
  GOALS: 'mv_goals',
  ORDERS: 'mv_orders'
};

// Simulated Network Delay to make it feel like a real DB
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Database Methods ---

export const db = {
  user: {
    get: async (): Promise<UserProfile | null> => {
      await delay(200); // Simulate network fetch
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    },
    update: async (data: Partial<UserProfile>): Promise<UserProfile> => {
      await delay(300); // Simulate network save
      const current = localStorage.getItem(STORAGE_KEYS.USER);
      const currentUser = current ? JSON.parse(current) : {};
      const updatedUser = { ...currentUser, ...data };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      return updatedUser;
    },
    reset: async (defaultUser: UserProfile) => {
      await delay(500);
      localStorage.clear();
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(defaultUser));
      return defaultUser;
    }
  },

  transactions: {
    getAll: async (): Promise<Transaction[]> => {
      await delay(100);
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    },
    add: async (transaction: Transaction): Promise<Transaction[]> => {
      await delay(200);
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const current = data ? JSON.parse(data) : [];
      const updated = [...current, transaction];
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
      return updated;
    },
    delete: async (id: string): Promise<Transaction[]> => {
      await delay(200);
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const current: Transaction[] = data ? JSON.parse(data) : [];
      const updated = current.filter(t => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
      return updated;
    }
  },

  portfolio: {
    get: async (): Promise<PortfolioItem[]> => {
      const data = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
      return data ? JSON.parse(data) : [];
    },
    save: async (portfolio: PortfolioItem[]): Promise<void> => {
      await delay(200);
      localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(portfolio));
    }
  },

  quests: {
    get: async (defaults: Quest[]): Promise<Quest[]> => {
      const data = localStorage.getItem(STORAGE_KEYS.QUESTS);
      return data ? JSON.parse(data) : defaults;
    },
    save: async (quests: Quest[]): Promise<void> => {
      localStorage.setItem(STORAGE_KEYS.QUESTS, JSON.stringify(quests));
    }
  },

  goals: {
    get: async (): Promise<Goal[]> => {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      return data ? JSON.parse(data) : [];
    },
    save: async (goals: Goal[]): Promise<void> => {
      await delay(200);
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    }
  },

  orders: {
    getAll: async (): Promise<Order[]> => {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return data ? JSON.parse(data) : [];
    },
    add: async (order: Order): Promise<Order[]> => {
      await delay(100);
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const current = data ? JSON.parse(data) : [];
      const updated = [...current, order];
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
      return updated;
    },
    delete: async (id: string): Promise<Order[]> => {
      await delay(100);
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const current: Order[] = data ? JSON.parse(data) : [];
      const updated = current.filter(o => o.id !== id);
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
      return updated;
    }
  }
};
