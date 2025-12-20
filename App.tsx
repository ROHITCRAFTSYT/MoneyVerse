
import React, { useState, useEffect } from 'react';
import { Icons } from './components/Icons';
import Dashboard from './components/Dashboard';
import BudgetTracker from './components/BudgetTracker';
import InvestSim from './components/InvestSim';
import LearningHub from './components/LearningHub';
import Goals from './components/Goals';
import Profile from './components/Profile';
import { UserProfile, Transaction, TransactionType, PortfolioItem, Asset, Quest, Goal, Badge, DEFAULT_CATEGORIES, CURRENCY_SYMBOLS } from './types';
import { db } from './services/database';
import { QUEST_TEMPLATES, getInitialQuests } from './data/quests';

// Mock Data
const INITIAL_USER: UserProfile = {
  name: 'Alex',
  xp: 120,
  level: 1,
  streak: 1,
  walletBalance: 0,
  simulatedCash: 10000,
  customCategories: [],
  currency: 'USD',
  unlockedBadges: ['1'],
  lastLoginDate: '',
  theme: 'dark',
  avatar: ''
};

const BADGES: Badge[] = [
  { id: '1', name: 'Newbie', description: 'Joined the MoneyVerse', icon: '👋' },
  { id: '2', name: 'Saver', description: 'Saved your first $100', icon: '🐷' },
  { id: '3', name: 'Investor', description: 'Bought your first asset', icon: '📈' },
  { id: '4', name: 'Scholar', description: 'Completed 5 lessons', icon: '🎓' },
  { id: '5', name: 'Goal Getter', description: 'Completed a savings goal', icon: '🏆' },
  { id: '6', name: 'Streak Master', description: '7 day login streak', icon: '🔥' },
  { id: '7', name: 'Big Spender', description: 'Logged 50 transactions', icon: '💸' },
  { id: '8', name: 'Diamond Hands', description: 'Held crypto for 1 month', icon: '💎' },
];

const INITIAL_GOALS: Goal[] = [];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'budget' | 'invest' | 'goals' | 'learn'>('home');
  const [showProfile, setShowProfile] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // State
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);

  // Load Data on Mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, txData, portData, questData, goalData] = await Promise.all([
          db.user.get(),
          db.transactions.getAll(),
          db.portfolio.get(),
          db.quests.get(getInitialQuests()),
          db.goals.get()
        ]);

        if (userData) setUser(userData);
        if (txData) setTransactions(txData);
        if (portData) setPortfolio(portData);
        if (questData) setQuests(questData);
        if (goalData) setGoals(goalData);
        
        setIsDataLoaded(true);
      } catch (e) {
        console.error("Database load error:", e);
        setIsDataLoaded(true); // Still load app even if error
      }
    };
    loadData();
  }, []);

  // Check for unlocked quests whenever quests change or data loads
  useEffect(() => {
    if (!isDataLoaded) return;
    checkQuestUnlocks(quests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quests.length, isDataLoaded]);

  const checkQuestUnlocks = async (currentQuests: Quest[]) => {
    let hasNewUnlock = false;
    const updatedQuests = [...currentQuests];
    const completedIds = new Set(currentQuests.filter(q => q.completed).map(q => q.id));

    QUEST_TEMPLATES.forEach(template => {
      // If we don't have this quest yet
      if (!updatedQuests.find(q => q.id === template.id)) {
        // Check if prerequisite is met
        if (template.prerequisiteId && completedIds.has(template.prerequisiteId)) {
          updatedQuests.push({
            id: template.id,
            title: template.title,
            description: template.description,
            xpReward: template.xpReward,
            completed: false,
            category: template.category
          });
          hasNewUnlock = true;
        }
      }
    });

    if (hasNewUnlock) {
      setQuests(updatedQuests);
      await db.quests.save(updatedQuests);
    }
  };

  // Apply Theme
  useEffect(() => {
    if (user.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user.theme]);

  // Streak Logic
  useEffect(() => {
    if (!isDataLoaded) return;

    const checkStreak = async () => {
      const today = new Date();
      const todayStr = today.toDateString();
      const lastLogin = user.lastLoginDate;

      if (lastLogin === todayStr) {
        return; // Already logged in today
      }

      let newStreak = 1;
      let badgeUnlocked = false;

      if (lastLogin) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (yesterday.toDateString() === lastLogin) {
          // Logged in consecutive days
          newStreak = user.streak + 1;
        } else {
          // Missed a day or more
          newStreak = 1;
        }
      }

      // Check for Streak Master Badge (7 days)
      let newBadges = [...user.unlockedBadges];
      if (newStreak >= 7 && !newBadges.includes('6')) {
        newBadges.push('6');
        badgeUnlocked = true;
      }

      const updatedUser = {
        ...user,
        streak: newStreak,
        lastLoginDate: todayStr,
        unlockedBadges: newBadges
      };

      setUser(updatedUser);
      await db.user.update(updatedUser);

      if (badgeUnlocked) {
        setTimeout(() => alert("🔥 Streak Master Badge Unlocked! You're on fire!"), 500);
      }
    };

    checkStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataLoaded]); 

  // Recalculate wallet balance locally
  useEffect(() => {
    const balance = transactions.reduce((acc, t) => {
      return t.type === TransactionType.INCOME ? acc + t.amount : acc - t.amount;
    }, 0);
    // Avoid infinite loop
    if (balance !== user.walletBalance && isDataLoaded) {
       setUser(prev => ({ ...prev, walletBalance: balance }));
       db.user.update({ walletBalance: balance });
       
       // Check Wealth Builder Quest (ID: 15)
       if (balance >= 500) completeSpecificQuest('15');
    }
  }, [transactions, isDataLoaded]);

  const addXp = async (amount: number) => {
    const newXp = user.xp + amount;
    const newLevel = Math.floor(newXp / 1000) + 1;
    const updatedUser = { ...user, xp: newXp, level: newLevel };
    setUser(updatedUser);
    await db.user.update(updatedUser);
  };

  const handleUpdateUser = (updated: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updated }));
  };

  const handleResetData = async () => {
    const resetUser = await db.user.reset(INITIAL_USER);
    setUser(resetUser);
    setTransactions([]);
    setPortfolio([]);
    setQuests(getInitialQuests());
    setGoals(INITIAL_GOALS);
    setShowProfile(false);
    setActiveTab('home');
    window.location.reload();
  };

  const unlockBadge = async (badgeId: string) => {
    if (!user.unlockedBadges.includes(badgeId)) {
      const newBadges = [...user.unlockedBadges, badgeId];
      const updatedUser = { ...user, unlockedBadges: newBadges };
      setUser(updatedUser);
      await db.user.update(updatedUser);
      alert(`🏆 Badge Unlocked: ${BADGES.find(b => b.id === badgeId)?.name}!`);
    }
  };

  // Helper to complete a specific quest by ID if active
  const completeSpecificQuest = async (questId: string) => {
    const quest = quests.find(q => q.id === questId);
    if (quest && !quest.completed) {
      handleCompleteQuest(questId);
    }
  };

  const handleAddTransaction = async (t: Omit<Transaction, 'id' | 'date'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: Date.now().toString(),
      date: new Date().toISOString()
    };
    
    // Optimistic Update
    const newTxList = [...transactions, newTransaction];
    setTransactions(newTxList);
    
    // DB Save
    await db.transactions.add(newTransaction);
    
    addXp(20); 

    // Quest Checks
    completeSpecificQuest('3'); // Expense Logger
    
    if (t.type === TransactionType.INCOME) {
      completeSpecificQuest('11'); // Income Tracker
    }
    
    if (newTxList.length >= 50) unlockBadge('7');
  };

  const handleEditTransaction = async (updatedT: Transaction) => {
    // Optimistic Update
    setTransactions(prev => prev.map(t => t.id === updatedT.id ? updatedT : t));
    // DB Save
    await db.transactions.update(updatedT);
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    await db.transactions.delete(id);
  };

  const handleAddCategory = async (newCat: string) => {
    const currentCustoms = user.customCategories || [];
    if (!DEFAULT_CATEGORIES.includes(newCat) && !currentCustoms.includes(newCat)) {
      const updatedCategories = [...currentCustoms, newCat];
      setUser(prev => ({ ...prev, customCategories: updatedCategories }));
      await db.user.update({ customCategories: updatedCategories });
      
      // Quest Check
      completeSpecificQuest('12'); // Category Pro
    }
  };

  const handleBuyAsset = async (asset: Asset, qty: number) => {
    const cost = asset.price * qty;
    if (user.simulatedCash >= cost) {
      const newCash = user.simulatedCash - cost;
      
      let updatedPortfolio = [...portfolio];
      const existing = updatedPortfolio.find(p => p.symbol === asset.symbol);
      
      if (existing) {
        updatedPortfolio = updatedPortfolio.map(p => p.symbol === asset.symbol ? { ...p, quantity: p.quantity + qty } : p);
      } else {
        updatedPortfolio.push({ symbol: asset.symbol, quantity: qty, avgBuyPrice: asset.price });
      }

      setUser(prev => ({ ...prev, simulatedCash: newCash }));
      setPortfolio(updatedPortfolio);
      
      await db.user.update({ simulatedCash: newCash });
      await db.portfolio.save(updatedPortfolio);

      addXp(50);
      
      // Quest Checks
      completeSpecificQuest('2'); // First Investment
      
      if (updatedPortfolio.length >= 2) {
        completeSpecificQuest('9'); // Diversification
      }
      
      unlockBadge('3');
    } else {
      alert("Not enough simulated cash!");
    }
  };

  const handleSellAsset = async (asset: Asset, qty: number) => {
    const existing = portfolio.find(p => p.symbol === asset.symbol);
    if (existing && existing.quantity >= qty) {
       const value = asset.price * qty;
       const newCash = user.simulatedCash + value;
       
       const updatedPortfolio = portfolio.map(p => p.symbol === asset.symbol ? { ...p, quantity: p.quantity - qty } : p).filter(p => p.quantity > 0);
       
       setUser(prev => ({ ...prev, simulatedCash: newCash }));
       setPortfolio(updatedPortfolio);

       await db.user.update({ simulatedCash: newCash });
       await db.portfolio.save(updatedPortfolio);

       addXp(50);
    } else {
      alert("Not enough assets to sell!");
    }
  };

  const handleCompleteQuest = async (id: string) => {
    const updatedQuests = quests.map(q => q.id === id ? { ...q, completed: true } : q);
    
    // Check if we need to add unlocked quests immediately to state
    // (useEffect will also catch this, but immediate update feels snappier)
    setQuests(updatedQuests);
    await db.quests.save(updatedQuests);

    const quest = quests.find(q => q.id === id);
    if (quest) {
      addXp(quest.xpReward);
      // Optional: Show a toast/alert
    }
    
    // Check unlocks
    checkQuestUnlocks(updatedQuests);
  };

  const handleAddGoal = async (goal: Omit<Goal, 'id' | 'currentAmount' | 'completed'>) => {
    const newGoal: Goal = {
      ...goal,
      id: Date.now().toString(),
      currentAmount: 0,
      completed: false
    };
    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    await db.goals.save(updatedGoals);
    addXp(50);
    
    completeSpecificQuest('6'); // Goal Setter
  };

  const handleAddFundsToGoal = async (goalId: string, amount: number) => {
    let goalCompleted = false;
    const updatedGoals = goals.map(g => {
      if (g.id === goalId) {
        const newAmount = g.currentAmount + amount;
        if (newAmount >= g.targetAmount && !g.completed) {
          goalCompleted = true;
          return { ...g, currentAmount: newAmount, completed: true };
        }
        return { ...g, currentAmount: newAmount };
      }
      return g;
    });

    setGoals(updatedGoals);
    await db.goals.save(updatedGoals);

    const goalTitle = goals.find(g => g.id === goalId)?.title || 'Goal';
    handleAddTransaction({
      amount: amount,
      description: `Saved for ${goalTitle}`,
      category: 'Savings',
      type: TransactionType.EXPENSE
    });

    if (goalCompleted) {
      addXp(500); 
      unlockBadge('5'); 
    }
    
    if (user.walletBalance > 100) unlockBadge('2');
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white flex-col gap-4">
        <Icons.Wallet size={48} className="animate-bounce text-verse-accent" />
        <p className="font-display font-bold text-xl animate-pulse">Loading MoneyVerse...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-verse-bg text-slate-900 dark:text-slate-100 font-sans selection:bg-verse-accent selection:text-white transition-colors duration-300">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-verse-bg/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center transition-colors duration-300">
        <div className="flex items-center gap-2">
          <div className="bg-verse-accent p-1.5 rounded-lg">
            <Icons.Wallet size={20} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-lg tracking-tight hidden sm:block">MoneyVerse</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Streak Indicator */}
          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold bg-orange-100 dark:bg-orange-400/10 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-400/20" title="Daily Streak">
            <Icons.Zap size={14} fill="currentColor" />
            <span className="text-xs">{user.streak}</span>
          </div>

          <select 
            value={user.currency} 
            onChange={async (e) => {
               const newCurr = e.target.value;
               setUser({...user, currency: newCurr});
               await db.user.update({ currency: newCurr });
            }}
            className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2 focus:outline-none focus:border-verse-accent cursor-pointer hidden sm:block transition-colors"
          >
            {Object.keys(CURRENCY_SYMBOLS).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          
          <button 
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-transparent dark:hover:border-slate-700 rounded-full pl-3 pr-1 py-1 transition-all cursor-pointer group"
          >
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-verse-accent dark:text-verse-warning uppercase">Lvl {user.level}</span>
              <div className="w-16 sm:w-20 h-1.5 bg-slate-300 dark:bg-slate-900 rounded-full mt-0.5 overflow-hidden">
                <div 
                  className="h-full bg-verse-accent dark:bg-verse-warning rounded-full transition-all group-hover:brightness-110" 
                  style={{ width: `${(user.xp / (user.level * 1000)) * 100}%` }} 
                />
              </div>
            </div>
            <div className="w-8 h-8 bg-slate-300 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-xs text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 group-hover:border-verse-accent transition-colors overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.name[0]
              )}
            </div>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4">
        {activeTab === 'home' && <Dashboard user={user} transactions={transactions} />}
        {activeTab === 'budget' && (
          <BudgetTracker 
            transactions={transactions} 
            categories={[...DEFAULT_CATEGORIES, ...(user.customCategories || [])]}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onAddCategory={handleAddCategory}
            currencySymbol={CURRENCY_SYMBOLS[user.currency] || '$'}
          />
        )}
        {activeTab === 'invest' && (
          <InvestSim 
            user={user} 
            portfolio={portfolio} 
            onBuy={handleBuyAsset}
            onSell={handleSellAsset}
          />
        )}
        {activeTab === 'goals' && (
          <Goals 
            goals={goals}
            currency={user.currency}
            onAddGoal={handleAddGoal}
            onAddFunds={handleAddFundsToGoal}
          />
        )}
        {activeTab === 'learn' && (
          <LearningHub 
            quests={quests}
            onCompleteQuest={handleCompleteQuest}
            onNavigate={setActiveTab}
          />
        )}
      </main>

      {/* Profile Modal */}
      {showProfile && (
        <Profile 
          user={user} 
          badges={BADGES}
          onClose={() => setShowProfile(false)} 
          onUpdateUser={handleUpdateUser}
          onResetData={handleResetData}
        />
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-verse-card border-t border-slate-200 dark:border-slate-700 pb-safe z-40 transition-colors duration-300">
        <div className="max-w-2xl mx-auto flex justify-around items-center">
          <NavButton 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
            icon={Icons.Dashboard} 
            label="Home" 
          />
          <NavButton 
            active={activeTab === 'budget'} 
            onClick={() => setActiveTab('budget')} 
            icon={Icons.Wallet} 
            label="Budget" 
          />
          <div className="-mt-8">
            <button 
              onClick={() => setActiveTab('invest')}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border-4 border-slate-50 dark:border-verse-bg ${activeTab === 'invest' ? 'bg-verse-accent text-white' : 'bg-slate-700 text-slate-400'}`}
            >
              <Icons.Invest size={24} />
            </button>
          </div>
          <NavButton 
            active={activeTab === 'goals'} 
            onClick={() => setActiveTab('goals')} 
            icon={Icons.PiggyBank} 
            label="Goals" 
          />
          <NavButton 
            active={activeTab === 'learn'} 
            onClick={() => setActiveTab('learn')} 
            icon={Icons.Learn} 
            label="Learn" 
          />
        </div>
      </nav>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  hiddenLabel?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon: Icon, label, hiddenLabel }) => {
  if (hiddenLabel) return <div className="w-12" />; 
  
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-3 w-16 transition-colors ${active ? 'text-verse-accent' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
    >
      <Icon size={22} className={active ? 'drop-shadow-glow' : ''} />
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );
};

export default App;
