
import React, { useEffect, useState } from 'react';
import { Quest, NewsItem, LessonContent } from '../types';
import { Icons } from './Icons';
import { getExplainedNews, getLearningContent } from '../services/geminiService';
import { QUEST_TEMPLATES } from '../data/quests';

interface LearningHubProps {
  quests: Quest[];
  onCompleteQuest: (id: string) => void;
  onNavigate: (tab: 'budget' | 'invest' | 'goals') => void;
}

const NEWS_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const LearningHub: React.FC<LearningHubProps> = ({ quests, onCompleteQuest, onNavigate }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);
  
  // Lesson & Quiz State
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null); // Quest ID
  const [lessonData, setLessonData] = useState<LessonContent | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [viewMode, setViewMode] = useState<'READ' | 'QUIZ' | 'RESULT'>('READ');
  
  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<number[]>([-1, -1, -1]); // -1 means unanswered
  const [quizScore, setQuizScore] = useState(0);

  useEffect(() => {
    const fetchNews = async (isBackground = false) => {
      if (isBackground) setIsRefreshingNews(true);
      try {
        const items = await getExplainedNews();
        setNews(items);
      } catch (err) {
        console.error("Failed to refresh news:", err);
      } finally {
        setIsRefreshingNews(false);
      }
    };

    // Initial fetch
    fetchNews();

    // Set up periodic refresh
    const intervalId = setInterval(() => {
      fetchNews(true);
    }, NEWS_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  const handleStartLesson = async (quest: Quest) => {
    setActiveLessonId(quest.id);
    setLoadingLesson(true);
    setViewMode('READ');
    setQuizAnswers([-1, -1, -1]);
    setQuizScore(0);
    
    const data = await getLearningContent(quest.title);
    setLessonData(data);
    setLoadingLesson(false);
  };

  const closeLesson = () => {
    setActiveLessonId(null);
    setLessonData(null);
  }

  const handleQuestAction = (quest: Quest) => {
    const template = QUEST_TEMPLATES.find(t => t.id === quest.id);
    if (template?.actionPath) {
      onNavigate(template.actionPath);
    }
  };

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = optionIndex;
    setQuizAnswers(newAnswers);
  };

  const handleSubmitQuiz = () => {
    if (!lessonData) return;
    
    let score = 0;
    lessonData.quiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswerIndex) {
        score++;
      }
    });
    setQuizScore(score);
    setViewMode('RESULT');
  };

  const handleRetryQuiz = () => {
    setQuizAnswers([-1, -1, -1]);
    setViewMode('QUIZ');
  };

  const handleClaimReward = () => {
    if (activeLessonId) {
      onCompleteQuest(activeLessonId);
      closeLesson();
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
                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium py-2 rounded-lg text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-2 group"
                      >
                        <Icons.Learn size={16} className="group-hover:scale-110 transition-transform" /> Start Quest
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
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Icons.Zap className="text-yellow-500 dark:text-yellow-400" />
            Trending Now
          </h2>
          {isRefreshingNews && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-verse-accent animate-pulse uppercase tracking-widest bg-verse-accent/5 px-2 py-1 rounded-full border border-verse-accent/10">
              <Icons.Refresh size={10} className="animate-spin" />
              Syncing
            </div>
          )}
        </div>
        
        <div className="grid gap-4">
          {news.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
              <Icons.Refresh className="animate-spin opacity-50" />
              <p className="text-sm">Scanning financial networks...</p>
            </div>
          ) : (
            news.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase tracking-wider">{item.tag}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] text-slate-400">Live</span>
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-verse-accent transition-colors">{item.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.summary}</p>
                {/* Visual accent for new/updated news */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-verse-accent/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            ))
          )}
        </div>
      </div>

       {/* Lesson/Quiz Modal */}
       {activeLessonId && (
        <div className="fixed inset-0 bg-white dark:bg-black/95 z-50 flex flex-col animate-fade-in">
          
          {/* Modal Header */}
          <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white truncate pr-4">
              {lessonData?.topic || "Loading..."}
            </h2>
            <button onClick={closeLesson} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <Icons.X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            
            {loadingLesson && (
              <div className="flex flex-col items-center justify-center h-full text-verse-accent space-y-4">
                <Icons.AI className="animate-bounce" size={48} />
                <p className="animate-pulse font-medium">Summoning knowledge...</p>
              </div>
            )}

            {!loadingLesson && lessonData && (
              <div className="max-w-xl mx-auto">
                {/* Mode: READING */}
                {viewMode === 'READ' && (
                  <div className="space-y-6 animate-slide-up">
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                       <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                         {lessonData.content}
                       </p>
                    </div>
                    
                    {lessonData.quiz && lessonData.quiz.length > 0 && (
                      <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
                        <div className="bg-gradient-to-r from-verse-accent to-purple-600 p-6 rounded-2xl text-white text-center shadow-lg">
                          <Icons.Brain size={48} className="mx-auto mb-2 text-white/80" />
                          <h3 className="text-xl font-bold mb-1">Knowledge Check!</h3>
                          <p className="text-sm text-white/80 mb-4">Prove your skills to earn XP.</p>
                          <button 
                            onClick={() => setViewMode('QUIZ')}
                            className="bg-white text-verse-accent font-bold py-3 px-8 rounded-xl hover:bg-indigo-50 transition-colors shadow-md active:scale-95"
                          >
                            Start Challenge
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode: QUIZ */}
                {viewMode === 'QUIZ' && (
                  <div className="space-y-8 animate-slide-up">
                    <div className="flex items-center gap-2 mb-6">
                      <button onClick={() => setViewMode('READ')} className="text-sm text-slate-500 hover:text-verse-accent flex items-center gap-1">
                        ← Back to Lesson
                      </button>
                      <div className="flex-1 text-center font-bold text-slate-900 dark:text-white">Quiz Challenge</div>
                      <div className="w-16"></div> {/* Spacer */}
                    </div>

                    {lessonData.quiz.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-3">
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white flex gap-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-verse-accent/10 text-verse-accent rounded-full flex items-center justify-center text-sm">{qIdx + 1}</span>
                          {q.question}
                        </h4>
                        <div className="grid gap-2 pl-11">
                          {q.options.map((option, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={() => handleAnswerSelect(qIdx, oIdx)}
                              className={`text-left p-4 rounded-xl border transition-all ${
                                quizAnswers[qIdx] === oIdx 
                                  ? 'bg-verse-accent text-white border-verse-accent shadow-md' 
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-verse-accent'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      onClick={handleSubmitQuiz}
                      disabled={quizAnswers.some(a => a === -1)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-8"
                    >
                      Submit Answers
                    </button>
                  </div>
                )}

                {/* Mode: RESULT */}
                {viewMode === 'RESULT' && (
                  <div className="text-center space-y-6 py-10 animate-scale-in">
                    {quizScore === lessonData.quiz.length ? (
                      // Success State
                      <>
                        <div className="inline-block p-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                          <Icons.Trophy size={64} className="text-emerald-500" />
                        </div>
                        <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white">Quest Complete!</h2>
                        <p className="text-slate-500 dark:text-slate-400">You got {quizScore}/{lessonData.quiz.length} correct. Masterful!</p>
                        
                        <div className="bg-verse-card p-6 rounded-2xl border border-verse-accent/30 max-w-sm mx-auto mt-6">
                           <div className="text-verse-accent text-sm font-bold uppercase tracking-wider mb-2">REWARD</div>
                           <div className="text-4xl font-display font-bold text-white mb-1">+{quests.find(q => q.id === activeLessonId)?.xpReward} XP</div>
                        </div>

                        <button 
                          onClick={handleClaimReward}
                          className="w-full max-w-xs bg-verse-accent hover:bg-violet-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-verse-accent/30 transition-all mt-8 animate-pulse"
                        >
                          Collect Reward
                        </button>
                      </>
                    ) : (
                      // Failure State
                      <>
                        <div className="inline-block p-6 bg-rose-100 dark:bg-rose-900/30 rounded-full mb-4">
                          <Icons.Alert size={64} className="text-rose-500" />
                        </div>
                        <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white">So Close!</h2>
                        <p className="text-slate-500 dark:text-slate-400">You scored {quizScore}/{lessonData.quiz.length}. You need 100% to pass.</p>
                        
                        <button 
                          onClick={handleRetryQuiz}
                          className="w-full max-w-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-4 rounded-xl transition-all mt-8"
                        >
                          Try Again
                        </button>
                        <button 
                          onClick={() => setViewMode('READ')}
                          className="block w-full text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mt-4"
                        >
                          Review Lesson
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningHub;
