import React, { useEffect, useState } from 'react';
import { Calendar, TrendingUp, Trophy, User, BarChart2, X, Store, ShoppingBag, Loader2, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RevenueChart from '../components/RevenueChart';
import api from '../api';
import { downloadCsv } from '../utils/exportCsv';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function QuarterlyReports() {
  const [storeId, setStoreId] = useState('all');
  const [quarters, setQuarters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState(null);

  useEffect(() => {
    const fetchQuarters = async () => {
      setLoading(true);
      try {
        const params = {};
        if (storeId !== 'all') params.store_id = storeId;
        
        const res = await api.get(`${API_BASE}/api/analytics/quarters`, { params });
        setQuarters(res.data.quarters || []);
      } catch (err) {
        console.error("Failed to fetch quarterly analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuarters();
  }, [storeId]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);
  
  // Reverse the array for chronological plotting on the chart
  const chartData = [...quarters].reverse();

  const handleExport = () => {
    downloadCsv(quarters, `quarterly_reports_${storeId}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans pb-20 relative">
      {/* Top Loading Bar */}
      {loading && (
        <div className="fixed top-0 left-0 w-full h-1 bg-stone-200 z-50">
          <div className="h-full bg-green-500 animate-pulse" style={{ width: '100%', transition: 'width 0.5s ease' }}></div>
        </div>
      )}
      <header className="sticky top-0 z-10 material-light border-b px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-green-700">Quarterly Reports</h1>
          <p className="text-xs text-stone-500">Historical Quarter-by-Quarter Performance</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            value={storeId} 
            onChange={(e) => setStoreId(e.target.value)}
            className="border border-stone-300 rounded-md py-1.5 px-3 text-sm focus:ring-green-500 focus:border-green-500 flex-1 sm:w-auto"
          >
            <option value="all">All Stores</option>
            <option value="1">Main (1)</option>
            <option value="2">Shop (2)</option>
            <option value="3">Nandi Hills (3)</option>
          </select>
          <button 
            onClick={handleExport}
            disabled={loading || quarters.length === 0}
            className="px-3 py-1.5 bg-white border border-stone-300 rounded-md text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center active:scale-95"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {quarters.length === 0 && !loading ? (
          <div className="text-center p-12 bg-white rounded-xl border border-stone-200">
            <p className="text-stone-500">No quarterly data found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-5 h-5 text-green-700" />
                <h2 className="text-sm font-bold text-stone-700 uppercase tracking-widest">Revenue by Quarter</h2>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="quarter" tick={{fontSize: 12}} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(value) => `Ksh${(value/1000000).toFixed(1)}M`} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      cursor={{fill: '#f5f5f4'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quarters.map((q, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedQuarter(q.quarter)}
                className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-lg hover:border-green-300 transition-all cursor-pointer group transform hover:-translate-y-1"
              >
                <div className="bg-stone-800 group-hover:bg-green-700 transition-colors p-4 text-white flex justify-between items-center">
                  <h2 className="text-lg font-bold">{q.quarter}</h2>
                  <Calendar className="w-5 h-5 text-stone-400" />
                </div>
                
                <div className="p-5 flex flex-col gap-5">
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Total Revenue</p>
                    <p className="text-2xl font-black text-green-700">{formatCurrency(q.revenue)}</p>
                  </div>
                  
                  <div className="h-px bg-stone-100 w-full"></div>
                  
                  <div className="flex items-start gap-3">
                    <Trophy className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-0.5">Top Product</p>
                      <p className="text-sm font-medium text-stone-700 line-clamp-2">{q.best_product}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-0.5">Top Cashier</p>
                      <p className="text-sm font-medium text-stone-700">{q.best_cashier}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-0.5">Best Month</p>
                      <p className="text-sm font-medium text-stone-700">{q.best_month}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </main>

      {selectedQuarter && (
        <QuarterDetailsModal 
          quarterStr={selectedQuarter} 
          storeId={storeId} 
          onClose={() => setSelectedQuarter(null)} 
        />
      )}
    </div>
  );
}

// Modal Component for Quarter Details
const QuarterDetailsModal = ({ quarterStr, storeId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [cashierData, setCashierData] = useState([]);
  const [supplierData, setSupplierData] = useState([]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const match = quarterStr.match(/Q(\d)\s+(\d{4})/);
        if (!match) return;
        const q = parseInt(match[1]);
        const year = parseInt(match[2]);
        
        let startMonth, endMonth, endDay;
        if (q === 1) { startMonth = '01'; endMonth = '03'; endDay = '31'; }
        else if (q === 2) { startMonth = '04'; endMonth = '06'; endDay = '30'; }
        else if (q === 3) { startMonth = '07'; endMonth = '09'; endDay = '30'; }
        else if (q === 4) { startMonth = '10'; endMonth = '12'; endDay = '31'; }
        
        const start_date = `${year}-${startMonth}-01`;
        const end_date = `${year}-${endMonth}-${endDay}`;

        const queryParams = new URLSearchParams();
        if (storeId !== 'all') queryParams.append('store_id', storeId);
        queryParams.append('start_date', start_date);
        queryParams.append('end_date', end_date);

        const [salesRes, cashiersRes, suppliersRes] = await Promise.all([
          api.get(`/api/analytics/sales?${queryParams}`),
          api.get(`/api/analytics/cashiers?${queryParams}`),
          api.get(`/api/analytics/suppliers?${queryParams}`)
        ]);

        setSalesData(salesRes.data);
        setCashierData(cashiersRes.data.leaderboard || []);
        setSupplierData(suppliersRes.data.suppliers || []);

      } catch (err) {
        console.error("Failed to fetch quarter details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [quarterStr, storeId]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/50 backdrop-blur-sm transition-all duration-300">
      <div className="w-full max-w-4xl h-full bg-stone-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="bg-white border-b border-stone-200 p-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-stone-800">Details for {quarterStr}</h2>
            <p className="text-xs text-stone-500">Sales, Cashiers, and Suppliers breakdown</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-stone-500" />
          </button>
        </div>

        {/* Modal Loader */}
        {loading && (
          <div className="w-full h-1 bg-stone-200 shrink-0">
            <div className="h-full bg-green-500 animate-pulse w-full"></div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                  <p className="text-xs font-bold text-stone-400 uppercase">Total Revenue</p>
                  <p className="text-2xl font-black text-green-700">{formatCurrency(salesData?.total_revenue || 0)}</p>
                </div>
              </div>

              {/* Chart */}
              <RevenueChart data={salesData?.timeseries} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cashier Leaderboard */}
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                  <div className="p-4 border-b border-stone-100 flex items-center gap-2">
                    <User className="w-5 h-5 text-stone-500" />
                    <h2 className="text-sm font-bold text-stone-700">Top Cashiers</h2>
                  </div>
                  <ul className="divide-y divide-stone-100">
                    {cashierData.slice(0, 5).map((c, i) => (
                      <li key={i} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 text-stone-400 font-bold text-xs flex items-center justify-center">{i + 1}</div>
                          <p className="text-sm font-medium text-stone-800">{c.cashier_name || 'Unknown'}</p>
                        </div>
                        <p className="text-sm font-bold text-green-700">{formatCurrency(c.total_revenue)}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Top Suppliers */}
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                  <div className="p-4 border-b border-stone-100 flex items-center gap-2">
                    <Store className="w-5 h-5 text-stone-500" />
                    <h2 className="text-sm font-bold text-stone-700">Top Suppliers</h2>
                  </div>
                <ul className="divide-y divide-stone-100">
                    {supplierData.slice(0, 5).map((s, i) => (
                      <li key={i} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 text-stone-400 font-bold text-xs flex items-center justify-center">{i + 1}</div>
                          <div>
                            <p className="text-sm font-medium text-stone-800 line-clamp-1">{s.supplier || 'Unknown'}</p>
                            <p className="text-xs text-stone-500">{s.quantity} Units Sold</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-green-700">{formatCurrency(s.revenue)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
