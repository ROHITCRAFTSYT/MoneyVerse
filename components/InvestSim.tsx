
import React, { useState, useEffect } from 'react';
import { Asset, PortfolioItem, UserProfile, CURRENCY_SYMBOLS, Order, OrderType } from '../types';
import { Icons } from './Icons';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip as RechartsTooltip } from 'recharts';
import { db } from '../services/database';
import { getTrendingStocks } from '../services/geminiService';

interface InvestSimProps {
  user: UserProfile;
  portfolio: PortfolioItem[];
  onBuy: (asset: Asset, qty: number) => void;
  onSell: (asset: Asset, qty: number) => void;
}

const InvestSim: React.FC<InvestSimProps> = ({ user, portfolio, onBuy, onSell }) => {
  const [marketType, setMarketType] = useState<'CRYPTO' | 'STOCKS'>('CRYPTO');
  const [cryptoAssets, setCryptoAssets] = useState<Asset[]>([]);
  const [stockAssets, setStockAssets] = useState<Asset[]>([]);
  const [stockSources, setStockSources] = useState<{ title: string, uri: string }[]>([]);
  
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [compareList, setCompareList] = useState<Asset[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  
  const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeAmount, setTradeAmount] = useState<string>('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');

  const currencySymbol = CURRENCY_SYMBOLS[user.currency] || '$';
  const currencyCode = user.currency.toLowerCase();

  const currentAssets = marketType === 'CRYPTO' ? cryptoAssets : stockAssets;

  // Load orders on mount
  useEffect(() => {
    const loadOrders = async () => {
      const savedOrders = await db.orders.getAll();
      setOrders(savedOrders);
    };
    loadOrders();
  }, []);

  const fetchCryptoData = async () => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currencyCode}&ids=bitcoin,ethereum,solana,dogecoin,ripple,cardano,polkadot&order=market_cap_desc&sparkline=false`
      );
      if (!response.ok) throw new Error('Crypto API Error');
      const data = await response.json();
      const mapped: Asset[] = data.map((coin: any) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        type: 'CRYPTO',
        change24h: coin.price_change_percentage_24h,
        image: coin.image
      }));
      setCryptoAssets(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStockData = async () => {
    try {
      const { assets, sources } = await getTrendingStocks();
      setStockAssets(assets);
      setStockSources(sources);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshMarket = async () => {
    setLoading(true);
    setError('');
    if (marketType === 'CRYPTO') {
      await fetchCryptoData();
    } else {
      await fetchStockData();
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshMarket();
  }, [marketType, user.currency]);

  // Check Orders Logic
  useEffect(() => {
    if (currentAssets.length === 0 || orders.length === 0) return;

    const checkOrders = async () => {
      let updatedOrders = [...orders];
      let ordersChanged = false;

      for (const order of orders) {
        const asset = [...cryptoAssets, ...stockAssets].find(a => a.symbol === order.assetSymbol);
        if (!asset) continue;

        let triggered = false;
        
        if (order.type === OrderType.STOP_LOSS && asset.price <= order.targetPrice) {
          triggered = true;
          alert(`⚠️ Stop Loss Triggered! Selling ${order.quantity} ${order.assetSymbol} at ${currencySymbol}${asset.price}`);
        } else if (order.type === OrderType.TAKE_PROFIT && asset.price >= order.targetPrice) {
          triggered = true;
          alert(`✅ Take Profit Triggered! Selling ${order.quantity} ${order.assetSymbol} at ${currencySymbol}${asset.price}`);
        }

        if (triggered) {
          const portfolioItem = portfolio.find(p => p.symbol === order.assetSymbol);
          if (portfolioItem && portfolioItem.quantity >= order.quantity) {
             onSell(asset, order.quantity);
             updatedOrders = updatedOrders.filter(o => o.id !== order.id);
             ordersChanged = true;
          } else {
             updatedOrders = updatedOrders.filter(o => o.id !== order.id);
             ordersChanged = true;
          }
        }
      }

      if (ordersChanged) {
        setOrders(updatedOrders);
        const activeIds = new Set(updatedOrders.map(o => o.id));
        const removedOrders = orders.filter(o => !activeIds.has(o.id));
        for (const rem of removedOrders) {
           await db.orders.delete(rem.id);
        }
      }
    };

    checkOrders();
  }, [currentAssets, orders, portfolio, onSell, currencySymbol, cryptoAssets, stockAssets]);

  const handleTrade = async () => {
    if (!selectedAsset) return;
    const qty = parseFloat(tradeAmount);
    if (isNaN(qty) || qty <= 0) return;

    if (tradeMode === 'BUY') {
      onBuy(selectedAsset, qty);
      
      if (stopLossPrice) {
        const slPrice = parseFloat(stopLossPrice);
        if (!isNaN(slPrice) && slPrice < selectedAsset.price) {
          const newOrder: Order = {
            id: Date.now().toString() + '_sl',
            assetSymbol: selectedAsset.symbol,
            type: OrderType.STOP_LOSS,
            targetPrice: slPrice,
            quantity: qty
          };
          const newOrders = await db.orders.add(newOrder);
          setOrders(newOrders);
        }
      }

      if (takeProfitPrice) {
        const tpPrice = parseFloat(takeProfitPrice);
        if (!isNaN(tpPrice) && tpPrice > selectedAsset.price) {
           const newOrder: Order = {
            id: Date.now().toString() + '_tp',
            assetSymbol: selectedAsset.symbol,
            type: OrderType.TAKE_PROFIT,
            targetPrice: tpPrice,
            quantity: qty
          };
          const newOrders = await db.orders.add(newOrder);
          setOrders(newOrders);
        }
      }

    } else {
      onSell(selectedAsset, qty);
    }
    
    closeModal();
  };

  const closeModal = () => {
    setSelectedAsset(null);
    setTradeAmount('1');
    setStopLossPrice('');
    setTakeProfitPrice('');
    setShowAdvanced(false);
  }

  const handleDeleteOrder = async (id: string) => {
    const updated = await db.orders.delete(id);
    setOrders(updated);
  };

  const toggleCompare = (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareList(prev => {
      const isAlreadyAdded = prev.find(a => a.id === asset.id);
      if (isAlreadyAdded) {
        return prev.filter(a => a.id !== asset.id);
      }
      if (prev.length >= 4) {
        alert("You can compare up to 4 assets at a time.");
        return prev;
      }
      return [...prev, asset];
    });
  };

  const getHoldings = (symbol: string) => {
    return portfolio.find(p => p.symbol === symbol)?.quantity || 0;
  };

  const portfolioValue = portfolio.reduce((acc, item) => {
    const currentAsset = [...cryptoAssets, ...stockAssets].find(a => a.symbol === item.symbol);
    const currentPrice = currentAsset ? currentAsset.price : item.avgBuyPrice; 
    return acc + (item.quantity * currentPrice);
  }, 0);

  const generateChartData = (basePrice: number) => {
    return Array.from({ length: 15 }, (_, i) => ({
      time: i,
      price: basePrice * (1 + (Math.sin(i / 2) * 0.05) + (Math.random() * 0.02 - 0.01))
    }));
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in relative">
      {/* Portfolio Summary */}
      <div className="bg-gradient-to-br from-blue-800 to-slate-900 dark:from-blue-900 dark:to-slate-900 p-6 rounded-2xl border border-blue-500/30 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Icons.TrendingUp size={80} />
        </div>
        <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Total Simulated Wealth</p>
        <h2 className="text-3xl font-display font-bold mt-1 tracking-tight">
          {currencySymbol}{portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </h2>
        <div className="flex justify-between mt-4 text-xs">
          <span className="text-slate-300 font-medium">Buying Power: <span className="text-white font-mono">{currencySymbol}{user.simulatedCash.toLocaleString()}</span></span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            Live Hub
          </div>
        </div>
      </div>

      {/* Market Toggle */}
      <div className="flex p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <button 
          onClick={() => setMarketType('CRYPTO')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${marketType === 'CRYPTO' ? 'bg-verse-accent text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <Icons.Zap size={14} /> Crypto
        </button>
        <button 
          onClick={() => setMarketType('STOCKS')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${marketType === 'STOCKS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <Icons.TrendingUp size={14} /> Stocks
        </button>
      </div>

      {/* Asset List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {marketType === 'CRYPTO' ? 'Crypto Markets' : 'Trending Stocks'}
            {marketType === 'STOCKS' && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">AI SEARCH</span>}
          </h3>
          <button onClick={refreshMarket} className="text-xs flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-verse-accent dark:hover:text-white transition-colors">
            <Icons.Refresh size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Fetching...' : 'Refresh'}
          </button>
        </div>

        {error && <p className="text-rose-500 text-xs px-2">{error}</p>}

        <div className="grid gap-3">
          {currentAssets.map((asset, idx) => {
            const holdings = getHoldings(asset.symbol);
            const isComparing = compareList.some(a => a.id === asset.id);
            return (
              <div 
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                style={{ animationDelay: `${idx * 50}ms` }}
                className={`bg-white dark:bg-verse-card p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center shadow-sm dark:shadow-none animate-slide-up group relative overflow-hidden ${isComparing ? 'border-verse-accent ring-1 ring-verse-accent/30' : 'border-slate-200 dark:border-slate-800 hover:border-verse-accent'}`}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className="relative">
                    {asset.image ? (
                      <img src={asset.image} alt={asset.name} className="w-12 h-12 rounded-2xl shadow-sm object-cover" />
                    ) : (
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${marketType === 'STOCKS' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                        {asset.symbol.substring(0, 1)}
                      </div>
                    )}
                    {holdings > 0 && (
                      <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm">
                        OWNED
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-verse-accent transition-colors">{asset.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{asset.symbol}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 relative z-10">
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-900 dark:text-white">{currencySymbol}{asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    <p className={`text-xs font-black ${asset.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {asset.change24h > 0 ? '↑' : '↓'} {Math.abs(asset.change24h).toFixed(2)}%
                    </p>
                  </div>
                  <button 
                    onClick={(e) => toggleCompare(asset, e)}
                    className={`p-2 rounded-xl transition-all border ${isComparing ? 'bg-verse-accent text-white border-verse-accent' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent hover:text-verse-accent'}`}
                    title="Compare Asset"
                  >
                    <Icons.Refresh size={18} className={isComparing ? 'rotate-180 transition-transform' : ''} />
                  </button>
                </div>
                {isComparing && <div className="absolute inset-0 bg-verse-accent/5 pointer-events-none"></div>}
              </div>
            );
          })}
        </div>
        
        {!loading && currentAssets.length === 0 && (
            <div className="text-center py-10 text-slate-500 animate-pulse">
                <Icons.Target className="mx-auto mb-2 opacity-50" size={32} />
                <p className="text-sm font-medium">Market data is refreshing...</p>
            </div>
        )}
      </div>

      {/* Floating Comparison Hub */}
      {compareList.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up">
           <div className="bg-white dark:bg-verse-card border border-verse-accent/40 shadow-2xl rounded-2xl p-3 flex items-center justify-between backdrop-blur-md bg-white/95 dark:bg-verse-card/95">
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pr-4">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 whitespace-nowrap">Comparing</p>
                 {compareList.map(asset => (
                   <div key={asset.id} className="relative group shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-[10px] text-verse-accent overflow-hidden">
                        {asset.image ? <img src={asset.image} alt="" className="w-full h-full" /> : asset.symbol.substring(0, 2)}
                      </div>
                      <button 
                        onClick={(e) => toggleCompare(asset, e as any)}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-sm hover:bg-rose-600 transition-colors"
                      >
                        <Icons.X size={10} />
                      </button>
                   </div>
                 ))}
              </div>
              <button 
                onClick={() => setShowComparison(true)}
                className="bg-verse-accent hover:bg-violet-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-verse-accent/20 transition-all active:scale-95 whitespace-nowrap"
              >
                Compare Now ({compareList.length})
              </button>
           </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
           <div className="bg-slate-50 dark:bg-verse-bg w-full max-w-5xl min-h-[80vh] rounded-3xl overflow-hidden flex flex-col animate-scale-in border border-slate-200 dark:border-slate-800">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-verse-bg">
                 <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                       <Icons.Refresh className="text-verse-accent" /> Asset Comparison
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Analyzing side-by-side metrics and performance</p>
                 </div>
                 <button 
                   onClick={() => setShowComparison(false)}
                   className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                 >
                   <Icons.X size={20} />
                 </button>
              </div>

              {/* Grid of Comparisons */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {compareList.map(asset => {
                    const holdings = getHoldings(asset.symbol);
                    const chartData = generateChartData(asset.price);
                    return (
                      <div key={asset.id} className="bg-white dark:bg-verse-card rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4 shadow-sm animate-fade-in">
                         <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                  {asset.image ? <img src={asset.image} alt="" className="w-full h-full" /> : <span className="font-bold text-xs text-verse-accent">{asset.symbol}</span>}
                               </div>
                               <div>
                                  <h4 className="font-bold text-slate-900 dark:text-white">{asset.name}</h4>
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-bold">{asset.type}</span>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{currencySymbol}{asset.price.toLocaleString()}</p>
                               <p className={`text-xs font-bold ${asset.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}% (24h)
                               </p>
                            </div>
                         </div>

                         {/* Mini Chart */}
                         <div className="h-32 w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                               <AreaChart data={chartData}>
                                  <defs>
                                     <linearGradient id={`grad-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={asset.change24h >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={asset.change24h >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                                     </linearGradient>
                                  </defs>
                                  <Area 
                                    type="monotone" 
                                    dataKey="price" 
                                    stroke={asset.change24h >= 0 ? '#10b981' : '#f43f5e'} 
                                    strokeWidth={2} 
                                    fill={`url(#grad-${asset.id})`} 
                                  />
                                  <YAxis domain={['auto', 'auto']} hide />
                               </AreaChart>
                            </ResponsiveContainer>
                         </div>

                         {/* Comparative Stats */}
                         <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Your Portfolio</p>
                               <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                  {holdings} {asset.symbol}
                               </p>
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Market Volatility</p>
                               <div className="flex items-center gap-1.5">
                                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                     <div 
                                       className="h-full bg-verse-accent" 
                                       style={{ width: `${Math.min(100, Math.abs(asset.change24h) * 10)}%` }}
                                     ></div>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">{Math.abs(asset.change24h) > 5 ? 'High' : 'Low'}</span>
                               </div>
                            </div>
                         </div>
                      </div>
                    );
                  })}
                </div>

                {/* Metrics Table */}
                <div className="mt-8 bg-white dark:bg-verse-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                   <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                         <Icons.Target size={16} className="text-verse-accent" /> Key Metrics Scoreboard
                      </h4>
                   </div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                         <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest font-bold">
                               <th className="px-6 py-4">Metric</th>
                               {compareList.map(a => <th key={a.id} className="px-6 py-4">{a.symbol}</th>)}
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                               <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">Current Price</td>
                               {compareList.map(a => <td key={a.id} className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{currencySymbol}{a.price.toLocaleString()}</td>)}
                            </tr>
                            <tr>
                               <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">24h Volatility</td>
                               {compareList.map(a => <td key={a.id} className={`px-6 py-4 font-bold ${a.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{a.change24h.toFixed(2)}%</td>)}
                            </tr>
                            <tr>
                               <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">Asset Category</td>
                               {compareList.map(a => <td key={a.id} className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black uppercase text-slate-500">{a.type}</span></td>)}
                            </tr>
                            <tr>
                               <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400">Your Value</td>
                               {compareList.map(a => {
                                 const holdings = getHoldings(a.symbol);
                                 return <td key={a.id} className="px-6 py-4 font-bold text-slate-900 dark:text-white">{currencySymbol}{(holdings * a.price).toLocaleString()}</td>
                               })}
                            </tr>
                         </tbody>
                      </table>
                   </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-verse-bg flex justify-end gap-3">
                 <button 
                   onClick={() => setCompareList([])}
                   className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-rose-500 transition-colors"
                 >
                   Clear All
                 </button>
                 <button 
                   onClick={() => setShowComparison(false)}
                   className="px-8 py-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"
                 >
                   Close Analysis
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Existing Orders List */}
      {orders.length > 0 && (
        <div className="space-y-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white px-2 flex items-center gap-2">
            <Icons.Target size={18} className="text-rose-500" /> Active Trade Orders
          </h3>
          {orders.map(order => (
             <div key={order.id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center animate-slide-up">
               <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-xl ${order.type === OrderType.STOP_LOSS ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                   {order.type === OrderType.STOP_LOSS ? <Icons.Alert size={14} /> : <Icons.TrendingUp size={14} />}
                 </div>
                 <div>
                   <p className="font-bold text-xs text-slate-900 dark:text-white">{order.assetSymbol}</p>
                   <p className="text-[10px] font-medium text-slate-500 uppercase">
                     {order.type === OrderType.STOP_LOSS ? 'Sell if <' : 'Sell if >'} {currencySymbol}{order.targetPrice.toLocaleString()}
                   </p>
                 </div>
               </div>
               <button onClick={() => handleDeleteOrder(order.id)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                 <Icons.X size={16} />
               </button>
             </div>
          ))}
        </div>
      )}
      
      {/* Disclaimer */}
      <div className="text-center pb-8 pt-4">
        <div className="bg-slate-100 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 inline-block">
          <p className="text-[10px] text-slate-500 dark:text-slate-500 max-w-xs mx-auto leading-relaxed">
            <span className="font-bold text-slate-700 dark:text-slate-300">SIMULATION MODE:</span> MoneyVerse is a gamified experience. All financial assets and portfolio values are virtual. This is not financial advice.
          </p>
        </div>
      </div>

      {/* Trade Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 p-6 animate-slide-up shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                 {selectedAsset.image ? (
                   <img src={selectedAsset.image} alt={selectedAsset.name} className="w-10 h-10 rounded-xl" />
                 ) : (
                   <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-500">
                    {selectedAsset.symbol[0]}
                   </div>
                 )}
                 <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white leading-tight">{selectedAsset.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-sm">{selectedAsset.symbol}</p>
                 </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                <Icons.X size={20} />
              </button>
            </div>

            <div className="h-40 mb-6 w-full -ml-2 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/50 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generateChartData(selectedAsset.price)}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="price" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" animationDuration={1000} />
                  <YAxis domain={['auto', 'auto']} hide />
                </AreaChart>
              </ResponsiveContainer>
              <div className="text-center -mt-8 relative z-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Market volatility simulated</p>
              </div>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 mb-6">
              <button 
                onClick={() => setTradeMode('BUY')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${tradeMode === 'BUY' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                Buy Asset
              </button>
              <button 
                onClick={() => setTradeMode('SELL')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${tradeMode === 'SELL' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                Sell Asset
              </button>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Order Quantity</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-2xl font-display font-bold focus:border-verse-accent focus:outline-none transition-all shadow-inner"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{selectedAsset.symbol}</span>
              </div>
              <div className="flex justify-between mt-3 px-1">
                <span className="text-xs text-slate-400 font-medium">Estimated Value</span>
                <span className="text-sm font-display font-bold text-slate-900 dark:text-white">{currencySymbol}{(parseFloat(tradeAmount || '0') * selectedAsset.price).toLocaleString()}</span>
              </div>
            </div>
            
            {/* Advanced Order Options (Only for Buy) */}
            {tradeMode === 'BUY' && (
              <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                 <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-xs font-bold text-slate-600 dark:text-slate-400"
                 >
                   <span className="flex items-center gap-2">
                    <Icons.Settings size={14} className="text-verse-accent" /> Advanced Trading
                   </span>
                   {showAdvanced ? <Icons.MinusCircle size={16} /> : <Icons.PlusCircle size={16} />}
                 </button>
                 
                 {showAdvanced && (
                   <div className="space-y-4 mt-4 animate-fade-in">
                      <div>
                        <label className="text-[10px] text-rose-500 font-bold uppercase tracking-widest block mb-1">Stop Loss Price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-500">{currencySymbol}</span>
                          <input 
                            type="number" 
                            value={stopLossPrice}
                            onChange={(e) => setStopLossPrice(e.target.value)}
                            placeholder={(selectedAsset.price * 0.9).toFixed(2)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-6 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest block mb-1">Take Profit Price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-500">{currencySymbol}</span>
                          <input 
                            type="number" 
                            value={takeProfitPrice}
                            onChange={(e) => setTakeProfitPrice(e.target.value)}
                            placeholder={(selectedAsset.price * 1.1).toFixed(2)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-6 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                   </div>
                 )}
              </div>
            )}

            <button 
              onClick={handleTrade}
              className={`w-full py-4 rounded-2xl font-display font-bold text-lg text-white shadow-xl transition-all active:scale-[0.97] transform ${tradeMode === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'}`}
            >
              Confirm {tradeMode === 'BUY' ? 'Purchase' : 'Sale'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestSim;
