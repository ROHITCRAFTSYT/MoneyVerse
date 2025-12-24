import React, { useState } from 'react';
import { Goal, CURRENCY_SYMBOLS } from '../types';
import { Icons } from './Icons';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GoalsProps {
  goals: Goal[];
  currency: string;
  onAddGoal: (goal: Omit<Goal, 'id' | 'currentAmount' | 'completed'>) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddFunds: (goalId: string, amount: number) => void;
}

const Goals: React.FC<GoalsProps> = ({ goals, currency, onAddGoal, onDeleteGoal, onAddFunds }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎯');
  
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const currencySymbol = CURRENCY_SYMBOLS[currency] || '$';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle && newTarget) {
      onAddGoal({
        title: newTitle,
        targetAmount: parseFloat(newTarget),
        emoji: newEmoji
      });
      setIsAdding(false);
      setNewTitle('');
      setNewTarget('');
      setNewEmoji('🎯');
    }
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGoalId && depositAmount) {
      onAddFunds(selectedGoalId, parseFloat(depositAmount));
      setSelectedGoalId(null);
      setDepositAmount('');
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDeleteGoal(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const emojis = ['🎯', '🎮', '📱', '👟', '🎸', '🚗', '✈️', '💻'];

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-800 to-purple-900 p-6 rounded-2xl border border-pink-500/30 shadow-lg relative overflow-hidden text-white">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 text-white">
          <Icons.PiggyBank size={120} />
        </div>
        <h2 className="text-2xl font-display font-bold relative z-10">Savings Goals</h2>
        <p className="text-pink-200 text-sm mt-1 relative z-10">Save up for the things you want. Stash your cash!</p>
        
        <button 
          onClick={() => setIsAdding(true)}
          className="mt-4 bg-white text-purple-900 font-bold py-2 px-4 rounded-xl shadow-lg hover:bg-pink-100 transition-colors flex items-center gap-2 relative z-10"
        >
          <Icons.Plus size={18} /> New Goal
        </button>
      </div>

      {/* New Goal Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-verse-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-slide-up shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create New Goal</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">What are you saving for?</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. PS5, New Phone"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-verse-accent transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Target Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-500">{currencySymbol}</span>
                  <input 
                    type="number" 
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="500"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 pl-8 text-slate-900 dark:text-white focus:outline-none focus:border-verse-accent transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Pick an Icon</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {emojis.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setNewEmoji(e)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${newEmoji === e ? 'bg-verse-accent scale-110 text-white' : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-verse-accent rounded-xl text-white font-bold hover:bg-violet-600 transition-colors">Create Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {selectedGoalId && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-verse-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-slide-up shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Add Savings</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">This will be logged as a "Savings" expense in your budget.</p>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Amount to Save</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-500">{currencySymbol}</span>
                  <input 
                    type="number" 
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 pl-8 text-slate-900 dark:text-white focus:outline-none focus:border-verse-accent transition-colors"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setSelectedGoalId(null)} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 rounded-xl text-white font-bold hover:bg-emerald-500 transition-colors">Deposit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-verse-card w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-2xl animate-scale-in">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <Icons.Alert size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Goal?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Are you sure you want to delete "{goals.find(g => g.id === deleteConfirmId)?.title}"? Your saved progress data will be lost.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-900/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goals List */}
      <div className="grid gap-4">
        {goals.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Icons.Target size={48} className="mx-auto mb-2 opacity-30" />
            <p>No goals yet. Set a target to start saving!</p>
          </div>
        ) : (
          goals.map(goal => {
            const percentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            
            return (
              <div key={goal.id} className="bg-white dark:bg-verse-card p-5 rounded-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden group shadow-sm dark:shadow-none transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl shadow-inner">
                      {goal.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{goal.title}</h3>
                        <button 
                          onClick={() => setDeleteConfirmId(goal.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                          title="Delete Goal"
                        >
                          <Icons.Trash size={14} />
                        </button>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">
                        {currencySymbol}{goal.currentAmount.toLocaleString()} / {currencySymbol}{goal.targetAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {goal.completed ? (
                    <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Icons.Check size={12} /> DONE
                    </span>
                  ) : (
                     <button 
                      onClick={() => setSelectedGoalId(goal.id)}
                      className="bg-slate-50 dark:bg-slate-800 hover:bg-verse-accent text-verse-accent hover:text-white border border-verse-accent px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                      + Add Funds
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="relative h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div 
                    className={`absolute top-0 left-0 h-full transition-all duration-1000 ${goal.completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-verse-accent to-pink-500'}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{percentage.toFixed(0)}%</span>
                  <span>{goal.completed ? 'Completed!' : `${currencySymbol}${(goal.targetAmount - goal.currentAmount).toLocaleString()} to go`}</span>
                </div>

                {goal.completed && (
                  <div className="absolute inset-0 bg-emerald-900/10 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-emerald-500 text-white px-4 py-2 rounded-full font-bold shadow-lg transform -rotate-12">
                      Goal Crushed! 🎉
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Goals;
