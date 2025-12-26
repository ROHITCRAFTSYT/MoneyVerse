
import React, { useEffect, useState, useMemo } from 'react';
import { UserProfile, Transaction, TransactionType, CURRENCY_SYMBOLS } from '../types';
import { Icons } from './Icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getFinancialAdvice } from '../services/geminiService';

interface DashboardProps {
  user: UserProfile;
  transactions: Transaction[];
}

const COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899', '#64748b'];

const Dashboard: React.FC<DashboardProps> = ({ user, transactions }) => {
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [isNewInsight, setIsNewInsight] = useState(false);

  // Derived Balance Logic - Ensures instantaneous updates when transactions are added
  const { currentBalance, totalIncome, totalExpense } = useMemo(() => {
    return transactions.reduce((acc, t) => {
      const amount = t.amount || 0;
      if (t.type === TransactionType.INCOME) {
        acc.totalIncome += amount;
        acc.currentBalance += amount;
      } else {
        acc.totalExpense += amount;
        acc.currentBalance -= amount;
      }
      return acc;
    }, { currentBalance: 0, totalIncome: 0, totalExpense: 0 });
  }, [transactions]);

  const currencySymbol = CURRENCY_SYMBOLS[user.currency] || '$';

  // Prepare Pie Chart Data (Category Breakdown)
  const expensesByCategory = useMemo(() => {
    return transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);
  }, [transactions]);

  const pieData = useMemo(() => {
    return Object.keys(expensesByCategory).map(key => ({
      name: key,
      value: expensesByCategory[key]
    }));
  }, [expensesByCategory]);

  // Prepare Trend Data (Daily Spending)
  const trendData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Initialize map with zeros
    last14Days.forEach(day => dailyMap[day] = 0);

    // Fill with actual data
    transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .forEach(t => {
        const dateKey = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dailyMap.hasOwnProperty(dateKey)) {
          dailyMap[dateKey] += t.amount;
        }
      });

    return Object.keys(dailyMap).map(date => ({
      date,
      amount: dailyMap[date]
    }));
  }, [transactions]);

  const fetchAdvice = async () => {
    setLoadingAi(true);
    setIsNewInsight(false);
    const advice = await getFinancialAdvice(transactions);
    setAiInsight(advice);
    setLoadingAi(false);
    setIsNewInsight(true);
    
    setTimeout(() => {
      setIsNewInsight(false);
    }, 10000);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Real Balance Card */}
        <div className="bg-white dark:bg-verse-card p-4 rounded-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden shadow-sm dark:shadow-none transition-all group">
          <div className="absolute top-0 right-0 p-2 opacity-10 text-slate-900 dark:text-white group-hover:scale-110 transition-transform">
            <Icons.Wallet size={64} />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Real Balance</p>
          <h2 key={currentBalance} className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-1 animate-scale-in">
            {currencySymbol}{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
            <Icons.Income size={12} className="animate-pulse" />
            <span>+{currencySymbol}{totalIncome.toLocaleString()} earned</span>
          </div>
        </div>

        {/* Sim Portfolio Card */}
        <div className="bg-white dark:bg-verse-card p-4 rounded-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden shadow-sm dark:shadow-none transition-all group">
           <div className="absolute top-0 right-0 p-2 opacity-10 text-slate-900 dark:text-white group-hover:scale-110 transition-transform">
            <Icons.Invest size={64} />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Sim Cash</p>
          <h2 className="text-2xl font-display font-bold text-verse-accent mt-1">
            {currencySymbol}{user.simulatedCash.toLocaleString()}
          </h2>
           <div className="mt-2 text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1 font-bold">
            <Icons.Zap size={12} />
            <span>Ready to trade</span>
          </div>
        </div>
      </div>

      {/* AI Insights Card */}
      <div className={`bg-gradient-to-r from-indigo-800 to-slate-900 dark:from-indigo-900 dark:to-slate-900 p-5 rounded-2xl border border-indigo-500/30 shadow-lg text-white transition-all duration-500 ${isNewInsight ? 'ring-2 ring-indigo-400 shadow-indigo-500/40' : ''}`}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-display font-bold text-indigo-100 flex items-center gap-2">
              <Icons.AI className={`text-indigo-300 ${loadingAi ? 'animate-spin' : isNewInsight ? 'animate-bounce' : ''}`} />
              Gemini Insights
            </h3>
            {isNewInsight && (
              <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse shadow-sm">
                NEW
              </span>
            )}
          </div>
          <button 
            onClick={fetchAdvice}
            disabled={loadingAi}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-full transition-colors disabled:opacity-50 flex items-center gap-2 group"
          >
            <Icons.Refresh size={12} className={`${loadingAi ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            {loadingAi ? "Thinking..." : "Refresh"}
          </button>
        </div>
        <div className={`relative text-sm text-indigo-50 leading-relaxed bg-black/20 p-4 rounded-lg min-h-[80px] transition-all overflow-hidden ${isNewInsight ? 'animate-pulse-glow border border-indigo-500/30' : ''}`}>
          {loadingAi && (
            <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          
          {aiInsight ? (
            <div className={`whitespace-pre-line ${isNewInsight ? 'animate-fade-in' : ''}`}>
              {aiInsight}
            </div>
          ) : (
            <p className="italic opacity-70">Tap Refresh to analyze your spending habits...</p>
          )}
        </div>
      </div>

      {/* Spending Trend Chart */}
      <div className="bg-white dark:bg-verse-card p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">Daily Spending</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 14 Days</span>
        </div>
        <div className="h-48 w-full">
          {transactions.filter(t => t.type === TransactionType.EXPENSE).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontSize: '12px',
                    color: '#fff',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                  cursor={{ stroke: '#8b5cf6', strokeWidth: 2 }}
                  formatter={(value) => [`${currencySymbol}${Number(value).toFixed(2)}`, 'Spent']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8b5cf6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
              <Icons.TrendingUp size={48} className="mb-2 opacity-50" />
              <p>Start logging to see your trend</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown (Pie Chart) */}
      <div className="bg-white dark:bg-verse-card p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none transition-colors">
        <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-4">Expense Categories</h3>
        <div className="h-64 w-full">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={200}
                  animationDuration={1200}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value) => `${currencySymbol}${value}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
              <Icons.Dashboard size={48} className="mb-2 opacity-50" />
              <p>No expenses logged yet</p>
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {pieData.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
              <span className="truncate">{entry.name}: {currencySymbol}{entry.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Level Progress */}
      <div className="bg-white dark:bg-verse-card p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm dark:shadow-none transition-colors">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-tight">Progression</p>
          <h3 className="text-xl font-bold font-display text-verse-accent dark:text-verse-warning">Lvl {user.level} Saver</h3>
        </div>
        <div className="text-right">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1 font-mono">{user.xp} / {user.level * 1000} XP</p>
          <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-verse-accent dark:bg-verse-warning transition-all duration-1000" 
              style={{ width: `${(user.xp / (user.level * 1000)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
