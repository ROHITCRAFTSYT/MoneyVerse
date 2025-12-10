import React, { useEffect, useState } from 'react';
import { Quest, NewsItem } from '../types';
import { Icons } from './Icons';
import { getExplainedNews, getLearningContent } from '../services/geminiService';
import { QUEST_TEMPLATES } from '../data/quests';

interface LearningHubProps {
  quests: Quest[];
  onCompleteQuest: (id: string) => void;
  onNavigate: (tab: 'budget' | 'invest' | 'goals') => void;
}

const LearningHub: React.FC<LearningHubProps> = ({ quests, onCompleteQuest, onNavigate }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [lessonContent, setLessonContent] = useState<string>('');
  const [loadingLesson, setLoadingLesson] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      const items = await getExplainedNews();
      setNews(items);
    };
    fetchNews();
  }, []);

  const handleStartLesson = async (quest: Quest) => {
    setActiveLesson(quest.title);
    setLoadingLesson(true);
    const content = await getLearningContent(quest.title);
    setLessonContent(content);
    setLoadingLesson(false);
  };

  const closeLesson = () => {
    if (activeLesson) {
        // Find quest ID
        const quest = quests.find(q => q.title === activeLesson);
        if(quest && !quest.completed) onCompleteQuest(quest.id);
    }
    setActiveLesson(null);
    setLessonContent('');
  }

  const handleQuestAction = (quest: Quest) => {
    const template = QUEST_TEMPLATES.find(t => t.id === quest.id);
    if (template?.actionPath) {
      onNavigate(template.actionPath);
    }
  };

  // Sort quests: Active first, then completed
  const sortedQuests = [...quests].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      
      {/* Active Quests */}
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icons.Target className="text-verse-warning" />
          Quest Board
        </h2>
        <div className="space-y-3">
          {sortedQuests.map(quest => {
            const template = QUEST_TEMPLATES.find(t => t.id === quest.id);
            const isLearning = quest.category === 'LEARNING';
            
            return (
              <div 
                key={quest.id} 
                className={`bg-white dark:bg-verse-card p-4 rounded-xl border transition-all shadow-sm dark:shadow-none ${quest.completed ? 'border-emerald-500/50 opacity-60' : 'border-slate-200 dark:border-slate-700 hover:border-verse-accent dark:hover:border-verse-accent'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{quest.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{quest.description}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${quest.completed ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-verse-warning/20 text-verse-warning'}`}>
                    {quest.completed ? 'DONE' : `+${quest.xpReward} XP`}
                  </span>
                </div>

                {!quest.completed && (
                  <div className="mt-3">
                    {isLearning ? (
                      <button 
                        onClick={() => handleStartLesson(quest)}
                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium py-2 rounded-lg text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <Icons.Learn size={16} /> Start Lesson
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleQuestAction(quest)}
                        className="w-full bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-sm font-medium py-2 rounded-lg text-indigo-700 dark:text-indigo-300 transition-colors flex items-center justify-center gap-2"
                      >
                         {quest.category === 'INVESTING' ? <Icons.Invest size={16} /> : <Icons.Wallet size={16} />}
                         Go to {template?.actionPath === 'invest' ? 'Market' : template?.actionPath === 'budget' ? 'Budget' : 'Goals'}
                      </button>
                    )}
                  </div>
                )}
                {quest.completed && (
                  <div className="mt-2 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    <Icons.Trophy size={14} /> Completed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Trending News */}
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icons.Zap className="text-yellow-500 dark:text-yellow-400" />
          Trending Now
        </h2>
        <div className="grid gap-4">
          {news.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
              <Icons.Refresh className="animate-spin opacity-50" />
              <p className="text-sm">Scanning financial networks...</p>
            </div>
          ) : (
            news.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase tracking-wider">{item.tag}</span>
                  <span className="text-[10px] text-slate-400">Live</span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">{item.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.summary}</p>
              </div>
            ))
          )}
        </div>
      </div>

       {/* Lesson Modal */}
       {activeLesson && (
        <div className="fixed inset-0 bg-white dark:bg-black/95 z-50 flex flex-col p-6 animate-fade-in">
          <button onClick={() => setActiveLesson(null)} className="self-end text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-4">
            <Icons.X size={24} />
          </button>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-6">{activeLesson}</h2>
            {loadingLesson ? (
              <div className="flex flex-col items-center justify-center h-64 text-verse-accent">
                <Icons.AI className="animate-bounce mb-4" size={48} />
                <p>Generating lesson...</p>
              </div>
            ) : (
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{lessonContent}</p>
              </div>
            )}
          </div>
          <button 
            onClick={closeLesson}
            disabled={loadingLesson}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl mt-4 shadow-lg shadow-emerald-900/40 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Icons.Check /> Complete & Collect XP
          </button>
        </div>
      )}
    </div>
  );
};

export default LearningHub;