
import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { Icons } from './Icons';

interface BudgetTrackerProps {
  transactions: Transaction[];
  categories: string[];
  onAddTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCategory: (category: string) => void;
  currencySymbol: string;
}

const BudgetTracker: React.FC<BudgetTrackerProps> = ({ 
  transactions, 
  categories, 
  onAddTransaction, 
  onEditTransaction,
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

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filtering State
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Animation State for Deletion
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Delete Confirmation State
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    if (editingId) {
        const original = transactions.find(t => t.id === editingId);
        onEditTransaction({
            id: editingId,
            amount: parseFloat(amount),
            description,
            category,
            type,
            date: original?.date || new Date().toISOString()
        });
        cancelEdit();
    } else {
        onAddTransaction({
            amount: parseFloat(amount),
            description,
            category,
            type
        });
        resetForm();
    }
  };

  const resetForm = () => {
      setAmount('');
      setDescription('');
      setCategory(categories[0] || 'Food');
      setType(TransactionType.EXPENSE);
  };

  const handleEditClick = (t: Transaction) => {
      setEditingId(t.id);
      setAmount(t.amount.toString());
      setDescription(t.description);
      setCategory(t.category);
      setType(t.type);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
      setEditingId(null);
      resetForm();
  };

  const handleSaveCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setCategory(newCategoryName.trim());
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  const requestDelete = (id: string) => {
    setDeleteConfirmationId(id);
  };

  const confirmDelete = () => {
    if (!deleteConfirmationId) return;
    const id = deleteConfirmationId;
    setDeleteConfirmationId(null);

    if (editingId === id) cancelEdit();
    
    // 1. Mark as deleting to trigger CSS transition
    setDeletingIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
    });

    // 2. Wait for animation to finish before removing from data
    setTimeout(() => {
        onDeleteTransaction(id);
        // Cleanup local state (though component unmounts mostly)
        setDeletingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, 300);
  };

  // Filter Logic
  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;
    return matchesType && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-20">
      <div className={`bg-white dark:bg-verse-card p-6 rounded-2xl border ${editingId ? 'border-verse-accent shadow-md shadow-verse-accent/20' : 'border-slate-200 dark:border-slate-700'} shadow-sm dark:shadow-none transition-all`}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {editingId ? (
                <>
                <Icons.Edit className="text-verse-accent" />
                Edit Transaction
                </>
            ) : (
                <>
                <Icons.Income className="text-emerald-500 dark:text-emerald-400" />
                Log Transaction
                </>
            )}
            </h2>
            {editingId && (
                <button 
                    onClick={cancelEdit}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline"
                >
                    Cancel Edit
                </button>
            )}
        </div>
        
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
            className={`w-full font-bold py-3 rounded-xl transition-colors shadow-lg active:scale-[0.98] transform duration-100 ${editingId ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20' : 'bg-verse-accent hover:bg-violet-600 text-white shadow-violet-900/20'}`}
          >
            {editingId ? 'Update Transaction' : 'Add Transaction'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">Recent History</h3>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
             {/* Type Filters */}
             <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex text-xs font-bold">
                <button 
                    onClick={() => setFilterType('ALL')}
                    className={`px-3 py-1.5 rounded-md transition-all ${filterType === 'ALL' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilterType(TransactionType.INCOME)}
                    className={`px-3 py-1.5 rounded-md transition-all ${filterType === TransactionType.INCOME ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    Income
                </button>
                <button 
                    onClick={() => setFilterType(TransactionType.EXPENSE)}
                    className={`px-3 py-1.5 rounded-md transition-all ${filterType === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-700 shadow text-rose-500 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    Expense
                </button>
             </div>

             {/* Category Filter */}
             <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-verse-accent cursor-pointer min-w-[120px]"
             >
                <option value="ALL">All Categories</option>
                {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
             </select>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
           transactions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl animate-fade-in">
               <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full inline-block mb-3">
                  <Icons.Wallet className="text-slate-400" size={32} />
               </div>
               <p className="text-slate-500 dark:text-slate-400 font-medium">No transactions yet.</p>
               <p className="text-xs text-slate-400 mt-1">Start logging your expenses to earn XP!</p>
            </div>
           ) : (
             <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl opacity-75 animate-fade-in">
                <p className="text-slate-500 dark:text-slate-400 font-medium">No transactions match your filters.</p>
                <button 
                  onClick={() => { setFilterType('ALL'); setFilterCategory('ALL'); }}
                  className="text-verse-accent text-sm font-bold mt-2 hover:underline"
                >
                  Clear Filters
                </button>
             </div>
           )
        ) : (
          <div className="grid gap-3">
          {[...filteredTransactions].reverse().map((t, index) => (
            <div 
              key={t.id} 
              style={{ animationDelay: `${index * 50}ms` }}
              className={`
                relative p-4 rounded-2xl border flex justify-between items-center group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
                animate-slide-up
                ${deletingIds.has(t.id) ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100'}
                ${editingId === t.id ? 'ring-2 ring-verse-accent border-transparent scale-[1.02]' : ''}
                ${t.type === TransactionType.INCOME 
                  ? 'bg-gradient-to-br from-white to-emerald-50/50 dark:from-verse-card dark:to-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-400 dark:hover:border-emerald-500' 
                  : 'bg-gradient-to-br from-white to-rose-50/50 dark:from-verse-card dark:to-rose-900/10 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500'}
              `}
            >
              {/* Left accent indicator with glow */}
              <div className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full shadow-sm transition-all group-hover:w-2 ${t.type === TransactionType.INCOME ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}></div>

              <div className="flex items-center gap-4 pl-4">
                <div className={`
                  p-3.5 rounded-2xl shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-3
                  ${t.type === TransactionType.INCOME 
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 ring-4 ring-emerald-50 dark:ring-emerald-900/20' 
                    : 'bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-900/20'}
                `}>
                  {t.type === TransactionType.INCOME ? <Icons.Income size={22} /> : <Icons.Expense size={22} />}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-base group-hover:text-verse-accent transition-colors">{t.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
                      {t.category}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      {new Date(t.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <span className={`font-display font-bold text-xl tracking-tight ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400 drop-shadow-sm' : 'text-slate-700 dark:text-slate-200'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'}{currencySymbol}{t.amount.toFixed(2)}
                </span>
                
                {/* Actions Container */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                    <button 
                        onClick={() => handleEditClick(t)}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-verse-accent rounded-xl shadow-md transition-colors"
                        title="Edit Transaction"
                    >
                        <Icons.Edit size={16} />
                    </button>
                    <button 
                        onClick={() => requestDelete(t.id)}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-500 rounded-xl shadow-md transition-colors"
                        title="Delete Transaction"
                    >
                        <Icons.Trash size={16} />
                    </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-verse-card w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-2xl animate-scale-in">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mb-4">
                        <Icons.Alert size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Transaction?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Are you sure you want to delete this transaction? This action cannot be undone.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteConfirmationId(null)}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-900/20 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default BudgetTracker;
