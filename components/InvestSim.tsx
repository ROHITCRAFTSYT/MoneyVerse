
import React, { useState, useEffect } from 'react';
import { Asset, PortfolioItem, UserProfile, CURRENCY_SYMBOLS, Order, OrderType } from '../types';
import { Icons } from './Icons';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { db } from '../services/database';

interface InvestSimProps {
  user: UserProfile;
  portfolio: PortfolioItem[];
  onBuy: (asset: Asset, qty: number) => void;
  onSell: (asset: Asset, qty: number) => void;
}

const InvestSim: React.FC<InvestSimProps> = ({ user, portfolio, onBuy, onSell }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
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

  // Load orders on mount
  useEffect(() => {
    const loadOrders = async () => {
      const savedOrders = await db.orders.getAll();
      setOrders(savedOrders);
    };
    loadOrders();
  }, []);

  const fetchMarketData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetching top coins: Bitcoin, Ethereum, Solana, Dogecoin, Ripple, Cardano, Polkadot
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currencyCode}&ids=bitcoin,ethereum,solana,dogecoin,ripple,cardano,polkadot&order=market_cap_desc&sparkline=false`
      );

      if (!response.ok) {
        throw new Error('Rate limit exceeded or API error');
      }

      const data = await response.json();
      
      const mappedAssets: Asset[] = data.map((coin: any) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        type: 'CRYPTO',
        change24h: coin.price_change_percentage_24h,
        image: coin.image
      }));

      setAssets(mappedAssets);
    } catch (err) {
      console.error(err);
      setError('Failed to load live data. Retrying...');
      // If API fails, keep old assets if available, or show error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, [user.currency]); // Refetch if currency changes

  // Check Orders Logic
  useEffect(() => {
    if (assets.length === 0 || orders.length === 0) return;

    const checkOrders = async () => {
      let updatedOrders = [...orders];
      let ordersChanged = false;

      for (const order of orders) {
        const asset = assets.find(a => a.symbol === order.assetSymbol);
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
          // Execute Sell
          // We need to check if user actually has the holdings. 
          // Since onSell in App.tsx checks for sufficiency, we assume here we just try to call it.
          // However, onSell expects user interaction logic usually.
          // We will invoke the prop directly.
          const portfolioItem = portfolio.find(p => p.symbol === order.assetSymbol);
          if (portfolioItem && portfolioItem.quantity >= order.quantity) {
             onSell(asset, order.quantity);
             // Remove order
             updatedOrders = updatedOrders.filter(o => o.id !== order.id);
             ordersChanged = true;
          } else {
             // Order failed due to insufficient funds, maybe delete it or notify
             console.log("Order triggered but insufficient funds", order);
             updatedOrders = updatedOrders.filter(o => o.id !== order.id); // Remove invalid order
             ordersChanged = true;
          }
        }
      }

      if (ordersChanged) {
        setOrders(updatedOrders);
        // Save new order list to DB (we can't easily bulk save with current db service, so we delete triggered ones)
        // Actually, db.orders.delete takes ID. 
        // For simplicity, we just reload from state in next render or trust state is source of truth until page reload?
        // Better: Sync deletions.
        const activeIds = new Set(updatedOrders.map(o => o.id));
        const removedOrders = orders.filter(o => !activeIds.has(o.id));
        for (const rem of removedOrders) {
           await db.orders.delete(rem.id);
        }
      }
    };

    checkOrders();
  }, [assets, orders, portfolio, onSell, currencySymbol]);

  const handleTrade = async () => {
    if (!selectedAsset) return;
    const qty = parseFloat(tradeAmount);
    if (isNaN(qty) || qty <= 0) return;

    if (tradeMode === 'BUY') {
      onBuy(selectedAsset, qty);
      
      // Create Orders if advanced options set
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

  const getHoldings = (symbol: string) => {
    return portfolio.find(p => p.symbol === symbol)?.quantity || 0;
  };

  const portfolioValue = portfolio.reduce((acc, item) => {
    const currentAsset = assets.find(a => a.symbol === item.symbol);
    const currentPrice = currentAsset ? currentAsset.price : item.avgBuyPrice; // Fallback to buy price if live data missing
    return acc + (item.quantity * currentPrice);
  }, 0);

  // Fake chart data for the selected asset
  const generateChartData = (basePrice: number) => {
    return Array.from({ length: 20 }, (_, i) => ({
      time: i,
      price: basePrice * (1 + Math.sin(i) * 0.05)
    }));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Portfolio Summary */}
      <div className="bg-gradient-to-br from-blue-800 to-slate-900 dark:from-blue-900 dark:to-slate-900 p-6 rounded-2xl border border-blue-500/30 text-white">
        <p className="text-blue-200 text-xs font-bold uppercase tracking-wide">Total Portfolio Value</p>
        <h2 className="text-3xl font-display font-bold mt-1">
          {currencySymbol}{portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </h2>
        <div className="flex justify-between mt-4 text-sm">
          <span className="text-slate-300">Cash Available: <span className="text-white font-mono">{currencySymbol}{user.simulatedCash.toLocaleString()}</span></span>
          <span className="text-emerald-400 font-bold">Live Market</span>
        </div>
      </div>

      {/* Asset List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">Live Market</h3>
          <button onClick={fetchMarketData} className="text-xs flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-verse-accent dark:hover:text-white transition-colors">
            <Icons.Refresh size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>

        {error && <p className="text-rose-500 text-xs px-2">{error}</p>}

        {assets.map(asset => {
          const holdings = getHoldings(asset.symbol);
          return (
            <div 
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="bg-white dark:bg-verse-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors cursor-pointer flex justify-between items-center shadow-sm dark:shadow-none"
            >
              <div className="flex items-center gap-3">
                {asset.image ? (
                  <img src={asset.image} alt={asset.name} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400`}>
                    {asset.symbol.substring(0, 1)}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{asset.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{asset.symbol} {holdings > 0 && `• ${holdings.toFixed(4)} Owned`}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-slate-900 dark:text-white">{currencySymbol}{asset.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                <p className={`text-xs font-bold ${asset.change24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                </p>
              </div>
            </div>
          );
        })}
        
        {!loading && assets.length === 0 && (
            <div className="text-center py-10 text-slate-500">
                <p>Market data currently unavailable.</p>
            </div>
        )}
      </div>

      {/* Active Orders List */}
      {orders.length > 0 && (
        <div className="space-y-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white px-2 flex items-center gap-2">
            <Icons.Target size={18} /> Active Orders
          </h3>
          {orders.map(order => (
             <div key={order.id} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <div className={`p-1.5 rounded-lg ${order.type === OrderType.STOP_LOSS ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                   {order.type === OrderType.STOP_LOSS ? <Icons.Alert size={14} /> : <Icons.TrendingUp size={14} />}
                 </div>
                 <div>
                   <p className="font-bold text-xs text-slate-900 dark:text-white">{order.assetSymbol}</p>
                   <p className="text-[10px] text-slate-500">{order.type === OrderType.STOP_LOSS ? 'Stop Loss' : 'Take Profit'} @ {currencySymbol}{order.targetPrice.toLocaleString()}</p>
                 </div>
               </div>
               <button onClick={() => handleDeleteOrder(order.id)} className="text-slate-400 hover:text-rose-500">
                 <Icons.X size={16} />
               </button>
             </div>
          ))}
        </div>
      )}
      
      {/* Disclaimer */}
      <div className="text-center pb-8 pt-4">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 max-w-xs mx-auto leading-tight">
          Disclaimer: MoneyVerse is a simulation. All assets, prices, and profits are virtual. This is not financial advice.
        </p>
      </div>

      {/* Trade Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 p-6 animate-slide-up shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                 {selectedAsset.image && <img src={selectedAsset.image} alt={selectedAsset.name} className="w-8 h-8 rounded-full" />}
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedAsset.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{selectedAsset.symbol}</p>
                 </div>
              </div>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">Close</button>
            </div>

            <div className="h-32 mb-6 w-full -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generateChartData(selectedAsset.price)}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="price" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPrice)" />
                  <YAxis domain={['auto', 'auto']} hide />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-6">
              <button 
                onClick={() => setTradeMode('BUY')}
                className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${tradeMode === 'BUY' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Buy
              </button>
              <button 
                onClick={() => setTradeMode('SELL')}
                className={`flex-1 py-2 rounded-md font-bold text-sm transition-all ${tradeMode === 'SELL' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Sell
              </button>
            </div>

            <div className="mb-6">
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-2">Quantity</label>
              <input 
                type="number" 
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-lg font-mono focus:border-verse-accent focus:outline-none"
              />
              <p className="text-right text-xs text-slate-500 dark:text-slate-400 mt-2">
                Total: <span className="text-slate-900 dark:text-white font-mono">{currencySymbol}{(parseFloat(tradeAmount || '0') * selectedAsset.price).toLocaleString()}</span>
              </p>
            </div>
            
            {/* Advanced Order Options (Only for Buy) */}
            {tradeMode === 'BUY' && (
              <div className="mb-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                 <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-bold text-verse-accent hover:text-violet-400 mb-3"
                 >
                   {showAdvanced ? <Icons.MinusCircle size={14} /> : <Icons.PlusCircle size={14} />}
                   {showAdvanced ? 'Hide Order Settings' : 'Advanced Order Settings'}
                 </button>
                 
                 {showAdvanced && (
                   <div className="space-y-3 animate-fade-in">
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Stop Loss (Sell if price drops below)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-500">{currencySymbol}</span>
                          <input 
                            type="number" 
                            value={stopLossPrice}
                            onChange={(e) => setStopLossPrice(e.target.value)}
                            placeholder={(selectedAsset.price * 0.9).toFixed(2)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-6 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Take Profit (Sell if price rises above)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-500">{currencySymbol}</span>
                          <input 
                            type="number" 
                            value={takeProfitPrice}
                            onChange={(e) => setTakeProfitPrice(e.target.value)}
                            placeholder={(selectedAsset.price * 1.1).toFixed(2)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-6 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                   </div>
                 )}
              </div>
            )}

            <button 
              onClick={handleTrade}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${tradeMode === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}`}
            >
              Confirm {tradeMode}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestSim;
