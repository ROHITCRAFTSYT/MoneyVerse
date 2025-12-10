

import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { Icons } from './Icons';

interface BudgetTrackerProps {
  transactions: Transaction[];
  categories: string[];
  onAddTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCategory: (category: string) => void;
  currencySymbol: string;
}

const BudgetTracker: React.FC<BudgetTrackerProps> = ({ 
  transactions, 
  categories, 
  onAddTransaction, 
  onDeleteTransaction,
  onAddCategory,
  currencySymbol
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(categories[0] || 'Food');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    onAddTransaction({
      amount: parseFloat(amount),
      description,
      category,
      type
    });

    setAmount('');
    setDescription('');
  };

  const handleSaveCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setCategory(newCategoryName.trim());
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white dark:bg-verse-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none transition-colors">
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icons.Income className="text-emerald-500 dark:text-emerald-400" />
          Log Transaction
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors">
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                type === TransactionType.EXPENSE ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.INCOME)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                type === TransactionType.INCOME ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Income
            </button>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-500">{currencySymbol}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-8 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-verse-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lunch with friends"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-verse-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Category</label>
            {isAddingCategory ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New Category Name"
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-verse-accent transition-colors"
                />
                <button 
                  type="button"
                  onClick={handleSaveCategory}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-colors"
                >
                  <Icons.Check size={20} />
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 p-3 rounded-xl transition-colors"
                >
                  <Icons.X size={20} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-verse-accent appearance-none transition-colors"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-verse-accent text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-3 rounded-xl transition-colors"
                  title="Add custom category"
                >
                  <Icons.Plus size={20} />
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-verse-accent hover:bg-violet-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-violet-900/20"
          >
            Add Transaction
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white px-2">Recent History</h3>
        {transactions.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No transactions yet. Start logging!</p>
        ) : (
          [...transactions].reverse().map((t) => (
            <div key={t.id} className="bg-white dark:bg-verse-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center group shadow-sm dark:shadow-none transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${t.type === TransactionType.INCOME ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                  {t.type === TransactionType.INCOME ? <Icons.Income size={18} /> : <Icons.Expense size={18} />}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{t.description}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.category} • {new Date(t.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-bold font-mono ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'}{currencySymbol}{t.amount.toFixed(2)}
                </span>
                <button 
                  onClick={() => onDeleteTransaction(t.id)}
                  className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BudgetTracker;