import React, { useEffect, useState } from 'react';
import { UserProfile, Transaction, TransactionType, CURRENCY_SYMBOLS } from '../types';
import { Icons } from './Icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  const currencySymbol = CURRENCY_SYMBOLS[user.currency] || '$';

  // Prepare chart data
  const expensesByCategory = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  }));

  const fetchAdvice = async () => {
    setLoadingAi(true);
    setIsNewInsight(false);
    const advice = await getFinancialAdvice(transactions);
    setAiInsight(advice);
    setLoadingAi(false);
    setIsNewInsight(true);
    
    // Clear the "new" indicator after 10 seconds
    setTimeout(() => {
      setIsNewInsight(false);
    }, 10000);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-verse-card p-4 rounded-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden shadow-sm dark:shadow-none transition-colors">
          <div className="absolute top-0 right-0 p-2 opacity-10 text-slate-900 dark:text-white">
            <Icons.Wallet size={64} />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Real Balance</p>
          <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-1">
            {currencySymbol}{user.walletBalance.toLocaleString()}
          </h2>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Icons.Income size={12} />
            <span>+{currencySymbol}{totalIncome.toLocaleString()} this month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-verse-card p-4 rounded-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden shadow-sm dark:shadow-none transition-colors">
           <div className="absolute top-0 right-0 p-2 opacity-10 text-slate-900 dark:text-white">
            <Icons.Invest size={64} />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Sim Portfolio</p>
          <h2 className="text-2xl font-display font-bold text-verse-accent mt-1">
            {currencySymbol}{user.simulatedCash.toLocaleString()}
          </h2>
           <div className="mt-2 text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1">
            <Icons.Zap size={12} />
            <span>Ready to invest</span>
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

      {/* Analytics */}
      <div className="bg-white dark:bg-verse-card p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none transition-colors">
        <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-4">Monthly Spending</h3>
        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--verse-card)', borderColor: '#334155', borderRadius: '8px', color: 'var(--text-color)' }}
                  itemStyle={{ color: 'var(--text-color)' }}
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
          {chartData.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
              <span>{entry.name}: {currencySymbol}{entry.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Level Progress */}
      <div className="bg-white dark:bg-verse-card p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm dark:shadow-none transition-colors">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Current Level</p>
          <h3 className="text-xl font-bold font-display text-verse-accent dark:text-verse-warning">Lvl {user.level} Saver</h3>
        </div>
        <div className="text-right">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{user.xp} / {user.level * 1000} XP</p>
          <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-verse-accent dark:bg-verse-warning transition-all duration-500" 
              style={{ width: `${(user.xp / (user.level * 1000)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;