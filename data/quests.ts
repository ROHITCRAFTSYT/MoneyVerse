import { QuestTemplate } from '../types';

export const QUEST_TEMPLATES: QuestTemplate[] = [
  // --- ROOT QUESTS (Available at start) ---
  { 
    id: '1', 
    title: 'Budgeting 101', 
    description: 'Learn why the 50/30/20 rule matters.', 
    xpReward: 500, 
    category: 'LEARNING' 
  },
  { 
    id: '2', 
    title: 'First Investment', 
    description: 'Buy your first asset in the simulator.', 
    xpReward: 300, 
    category: 'INVESTING',
    actionPath: 'invest'
  },
  { 
    id: '3', 
    title: 'Expense Logger', 
    description: 'Log your first real expense.', 
    xpReward: 100, 
    category: 'FINANCE',
    actionPath: 'budget'
  },

  // --- LEARNING TRACK (Unlocks after Budgeting 101) ---
  { 
    id: '4', 
    title: 'Needs vs. Wants', 
    description: 'Master the art of prioritizing spending.', 
    xpReward: 200, 
    category: 'LEARNING',
    prerequisiteId: '1'
  },
  { 
    id: '5', 
    title: 'The Savings Mindset', 
    description: 'Pay yourself first. Learn how.', 
    xpReward: 250, 
    category: 'LEARNING',
    prerequisiteId: '4'
  },
  {
    id: '6',
    title: 'Goal Setter',
    description: 'Create a Savings Goal in the Goals tab.',
    xpReward: 400,
    category: 'FINANCE',
    prerequisiteId: '5',
    actionPath: 'goals'
  },

  // --- INVESTING TRACK (Unlocks after First Investment) ---
  { 
    id: '7', 
    title: 'Crypto Basics', 
    description: 'Understand the blockchain revolution.', 
    xpReward: 200, 
    category: 'LEARNING',
    prerequisiteId: '2'
  },
  { 
    id: '8', 
    title: 'Risk Management', 
    description: 'High reward comes with high risk.', 
    xpReward: 300, 
    category: 'LEARNING',
    prerequisiteId: '7'
  },
  {
    id: '9',
    title: 'Diversification',
    description: 'Own at least 2 different assets.',
    xpReward: 500,
    category: 'INVESTING',
    prerequisiteId: '8',
    actionPath: 'invest'
  },
  {
    id: '10',
    title: 'Market Cycles',
    description: 'Learn about Bulls and Bears.',
    xpReward: 250, 
    category: 'LEARNING',
    prerequisiteId: '9'
  },

  // --- FINANCE TRACK (Unlocks after Expense Logger) ---
  {
    id: '11',
    title: 'Income Tracker',
    description: 'Log a source of Income (Allowance/Job).',
    xpReward: 150,
    category: 'FINANCE',
    prerequisiteId: '3',
    actionPath: 'budget'
  },
  {
    id: '12',
    title: 'Category Pro',
    description: 'Add a custom category in Budget.',
    xpReward: 200,
    category: 'FINANCE',
    prerequisiteId: '11',
    actionPath: 'budget'
  },
  {
    id: '13',
    title: 'Inflation 101',
    description: 'Why does money lose value over time?',
    xpReward: 300,
    category: 'LEARNING',
    prerequisiteId: '12'
  },
  
  // --- ADVANCED ---
  {
    id: '14',
    title: 'Compound Interest',
    description: 'The 8th wonder of the world.',
    xpReward: 600,
    category: 'LEARNING',
    prerequisiteId: '13'
  },
  {
    id: '15',
    title: 'Wealth Builder',
    description: 'Reach a Net Worth of 500 (Real or Sim).',
    xpReward: 1000,
    category: 'FINANCE',
    prerequisiteId: '14'
  }
];

export const getInitialQuests = () => {
  return QUEST_TEMPLATES.filter(q => !q.prerequisiteId).map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    xpReward: t.xpReward,
    completed: false,
    category: t.category
  }));
};