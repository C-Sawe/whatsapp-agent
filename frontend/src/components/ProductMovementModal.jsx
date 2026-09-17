import React, { useState, useEffect } from 'react';
import { X, TrendingUp, ShoppingCart, DollarSign, Database, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';

export default function ProductMovementModal({ isOpen, onClose, product, storeId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [days, setDays] = useState(90);

  useEffect(() => {
    if (!isOpen || !product) return;

    const fetchMovement = async () => {
      setLoading(true);
      setError('');
      try {
        const params = { sku: product.sku, days };
        if (storeId && storeId !== 'all') {
          params.store_id = storeId;
        }

        const res = await api.get('/api/inventory/movement', {
          params
        });

        if (res.data.status === 'success') {
          setData(res.data);
        } else {
          setError(res.data.message || 'Failed to fetch movement data');
        }
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchMovement();
  }, [isOpen, product, storeId, days]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div 
        className="w-full md:w-1/2 md:max-w-none bg-stone-100 h-full shadow-2xl flex flex-col transform transition-transform animate-slide-in-right overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 md:p-6 border-b border-stone-200 flex items-start justify-between bg-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
                {product.category || 'Uncategorized'}
              </span>
              <span className="text-xs font-black text-stone-400 tracking-widest">{product.sku}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-stone-900 leading-tight tracking-tight">{product.description}</h2>
            <p className="text-sm text-stone-500 mt-1">{product.supplier}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Current Stock</p>
              <p className={`text-xl font-black tracking-tight ${product.stock_quantity <= 0 ? 'text-red-600' : 'text-stone-900'}`}>
                {product.stock_quantity}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Price</p>
              <p className="text-xl font-black text-stone-900 tracking-tight">KSh {product.retail_price?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1">{days}d Sold</p>
              <p className="text-xl font-black text-green-700 tracking-tight">{loading ? '...' : (data?.total_sold || 0)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">{days}d Rev.</p>
              <p className="text-xl font-black text-blue-700 tracking-tight truncate">KSh {loading ? '...' : (data?.total_revenue?.toLocaleString() || '0')}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-stone-900">Sales Movement</h3>
              <select 
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-stone-50 text-stone-700 font-bold focus:outline-none focus:border-stone-400 cursor-pointer"
              >
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
                <option value={180}>Last 6 Months</option>
              </select>
            </div>

            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-stone-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm">Analyzing sales history...</p>
              </div>
            ) : error ? (
              <div className="h-64 flex flex-col items-center justify-center text-red-500">
                <p className="text-sm font-medium">{error}</p>
              </div>
            ) : data?.movement?.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.movement} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#78716c' }}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getDate()}/${d.getMonth()+1}`;
                      }}
                      minTickGap={20}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#78716c' }}
                    />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      labelFormatter={(val) => new Date(val).toLocaleDateString()}
                      formatter={(value, name) => [value, name === 'quantity' ? 'Qty Sold' : 'Revenue']}
                    />
                    <Area type="monotone" dataKey="quantity" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorQty)" activeDot={{ r: 6, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-stone-400 bg-stone-50 rounded-xl border border-stone-100">
                <Database className="w-8 h-8 text-stone-300 mb-2" />
                <p className="text-sm">No sales recorded in the last {days} days.</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <h3 className="font-bold text-stone-900 p-4 border-b border-stone-100 bg-stone-50">Top Cashiers ({days}d)</h3>
            {loading ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-stone-100 rounded animate-pulse"></div>)}
              </div>
            ) : data?.top_cashiers?.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {data.top_cashiers.map((c, i) => (
                  <div key={i} className="flex justify-between items-center p-4 hover:bg-stone-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-black text-xs">
                        #{i+1}
                      </div>
                      <span className="font-bold text-stone-700">{c.name}</span>
                    </div>
                    <span className="text-xs font-bold bg-green-100 px-2.5 py-1 rounded-full text-green-700">
                      {c.quantity} sold
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-stone-500 text-sm bg-stone-50">
                No cashier data available.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
