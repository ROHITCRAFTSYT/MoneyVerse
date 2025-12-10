

import React, { useState, useRef } from 'react';
import { UserProfile, Badge, CURRENCY_SYMBOLS } from '../types';
import { Icons } from './Icons';
import { db } from '../services/database';

interface ProfileProps {
  user: UserProfile;
  badges: Badge[];
  onClose: () => void;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onResetData: () => void;
}

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Willow',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Moo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Zack'
];

const Profile: React.FC<ProfileProps> = ({ user, badges, onClose, onUpdateUser, onResetData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit State
  const [editName, setEditName] = useState(user.name);
  const [editAvatar, setEditAvatar] = useState(user.avatar);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currencySymbol = CURRENCY_SYMBOLS[user.currency] || '$';
  
  // XP Logic
  const currentLevelBaseXP = (user.level - 1) * 1000;
  const xpInCurrentLevel = user.xp - currentLevelBaseXP;
  const xpNeededForNextLevel = 1000; 
  const progress = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
        alert("File too large! Please choose an image under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    
    setIsSaving(true);
    try {
      // Use the DB service to persist changes
      await db.user.update({
        name: editName.trim(),
        avatar: editAvatar
      });
      
      // Update local state in App
      onUpdateUser({ 
        name: editName.trim(),
        avatar: editAvatar
      });
      
      setIsEditing(false);
    } catch (error) {
      alert("Failed to save profile. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value;
    onUpdateUser({ currency: newCurrency });
    await db.user.update({ currency: newCurrency });
  };
  
  const toggleTheme = async () => {
    const newTheme = user.theme === 'dark' ? 'light' : 'dark';
    onUpdateUser({ theme: newTheme });
    await db.user.update({ theme: newTheme });
  };

  const confirmReset = () => {
    if (window.confirm("⚠️ DANGER ZONE ⚠️\n\nAre you sure? This will delete all your transactions, goals, and game progress.\n\nThis cannot be undone.")) {
      onResetData();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-verse-bg w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Icons.User className="text-verse-accent" /> 
            {isEditing ? 'Edit Profile' : 'Player Profile'}
          </h2>
          {!isEditing && (
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <Icons.X size={24} />
            </button>
          )}
        </div>

        <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Identity & Editing Section */}
          <div className="flex flex-col items-center text-center">
            
            {/* Avatar Section */}
            <div className="relative group mb-4">
              <div className="w-28 h-28 rounded-full border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                {(isEditing ? editAvatar : user.avatar) ? (
                  <img 
                    src={isEditing ? editAvatar : user.avatar} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-slate-400 dark:text-slate-500">{user.name[0]}</span>
                )}
              </div>
              
              {!isEditing && (
                 <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-verse-warning text-black text-xs font-bold px-3 py-1 rounded-full border border-slate-100 dark:border-slate-900 shadow-sm z-10">
                  Lvl {user.level}
                </div>
              )}

              {isEditing && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                >
                  <Icons.Camera size={24} />
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Editing Controls */}
            {isEditing ? (
              <div className="w-full space-y-4 animate-fade-in bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                
                {/* Name Input */}
                <div className="text-left">
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-bold ml-1 mb-1 block">DISPLAY NAME</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-slate-900 dark:text-white font-display font-bold text-lg focus:outline-none focus:border-verse-accent focus:ring-1 focus:ring-verse-accent transition-all"
                    placeholder="Enter name"
                  />
                </div>

                {/* Avatar Presets */}
                <div className="text-left">
                   <label className="text-xs text-slate-500 dark:text-slate-400 font-bold ml-1 mb-2 block">OR CHOOSE AVATAR</label>
                   <div className="flex gap-2 overflow-x-auto pb-2">
                      {AVATAR_PRESETS.map((src, i) => (
                        <button 
                          key={i}
                          onClick={() => setEditAvatar(src)}
                          className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${editAvatar === src ? 'border-verse-accent scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                        >
                          <img src={src} alt="Preset" />
                        </button>
                      ))}
                   </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => { setIsEditing(false); setEditName(user.name); setEditAvatar(user.avatar); }}
                    className="flex-1 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile} 
                    disabled={isSaving}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Icons.Refresh className="animate-spin" size={16} /> : <Icons.Check size={16} />}
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                  {user.name} 
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-verse-accent transition-colors"
                    title="Edit Profile"
                  >
                    <Icons.Edit size={14} />
                  </button>
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Financial Explorer</p>

                {/* XP Bar */}
                <div className="w-full max-w-xs space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <span>Level {user.level}</span>
                    <span>Level {user.level + 1}</span>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-verse-warning to-orange-500 transition-all duration-1000" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                    {xpInCurrentLevel} / {xpNeededForNextLevel} XP to next level
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Stats Grid */}
          {!isEditing && (
            <div>
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Icons.Dashboard size={14} /> Career Stats
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-verse-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none hover:border-verse-accent/50 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2 mb-1 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                    <Icons.Zap size={14} className="text-yellow-500" /> Streak
                  </div>
                  <p className="text-xl font-display font-bold text-slate-900 dark:text-white">{user.streak} Days</p>
                </div>
                <div className="bg-white dark:bg-verse-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none hover:border-verse-accent/50 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2 mb-1 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                    <Icons.Wallet size={14} className="text-emerald-500" /> Net Worth
                  </div>
                  <p className="text-xl font-display font-bold text-slate-900 dark:text-white">{currencySymbol}{user.walletBalance.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-verse-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none hover:border-verse-accent/50 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2 mb-1 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                    <Icons.Invest size={14} className="text-blue-500" /> Portfolio
                  </div>
                  <p className="text-xl font-display font-bold text-slate-900 dark:text-white">{currencySymbol}{user.simulatedCash.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-verse-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none hover:border-verse-accent/50 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2 mb-1 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
                    <Icons.Trophy size={14} className="text-purple-500" /> Badges
                  </div>
                  <p className="text-xl font-display font-bold text-slate-900 dark:text-white">{user.unlockedBadges.length} / {badges.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Badges Section */}
          {!isEditing && (
            <div>
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                 <Icons.Medal size={14} /> Trophy Room
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {badges.map(badge => {
                  const isUnlocked = user.unlockedBadges.includes(badge.id);
                  return (
                    <div 
                      key={badge.id} 
                      className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all group relative ${isUnlocked ? 'bg-white dark:bg-verse-card border-verse-accent/50 shadow-lg shadow-verse-accent/10' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-50 grayscale'}`}
                    >
                      <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform">{badge.icon}</div>
                      <p className={`text-[10px] font-bold leading-tight ${isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{badge.name}</p>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-slate-900 dark:bg-black/90 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-slate-700 shadow-xl">
                        {badge.description}
                        {!isUnlocked && <div className="text-rose-400 mt-1 font-bold">LOCKED</div>}
                        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-black/90 border-r border-b border-slate-700 transform rotate-45"></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Settings Section */}
          <div className={isEditing ? 'opacity-50 pointer-events-none' : ''}>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Icons.Settings size={14} /> Settings
            </h4>
            <div className="space-y-3">
              
              {/* Theme Toggle */}
              <div className="bg-white dark:bg-verse-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3">
                   <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-verse-accent">
                    {user.theme === 'dark' ? <Icons.Moon size={20} /> : <Icons.Sun size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Dark Mode</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Toggle app theme</p>
                  </div>
                </div>
                <button 
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${user.theme === 'dark' ? 'bg-verse-accent' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-300 ${user.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>

              {/* Currency Selector */}
              <div className="bg-white dark:bg-verse-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-500 dark:text-slate-400">
                    <Icons.Dollar size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Currency</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Display currency across app</p>
                  </div>
                </div>
                <select 
                  value={user.currency}
                  onChange={handleCurrencyChange}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-verse-accent cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  {Object.keys(CURRENCY_SYMBOLS).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={confirmReset}
                className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/50 p-4 rounded-xl flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-lg text-rose-500 dark:text-rose-400 group-hover:text-rose-600 dark:group-hover:text-rose-200 transition-colors">
                    <Icons.Trash size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-rose-500 dark:text-rose-400 group-hover:text-rose-600 dark:group-hover:text-rose-200 transition-colors">Reset Data</p>
                    <p className="text-xs text-rose-400/80 dark:text-rose-500/70">Clear all transactions and progress</p>
                  </div>
                </div>
                <Icons.X className="text-rose-400 dark:text-rose-800 group-hover:text-rose-500 transition-colors" size={20} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;