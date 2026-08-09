import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, DollarSign, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import KpiCard from '../components/KpiCard';
import RevenueChart from '../components/RevenueChart';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const DashboardOverview = () => {
  const [storeId, setStoreId] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [salesData, setSalesData] = useState(null);
  const [cashierData, setCashierData] = useState([]);
  const [trendingData, setTrendingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      const token = localStorage.getItem('mosop_auth');
      const headers = { 'Authorization': token };
      
      const queryParams = new URLSearchParams();
      if (storeId && storeId !== 'all') queryParams.append('store_id', storeId);
      
      if (dateRange) {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - parseInt(dateRange));
        queryParams.append('start_date', start.toISOString().split('T')[0]);
        queryParams.append('end_date', end.toISOString().split('T')[0]);
      }

      try {
        const [salesRes, cashiersRes, trendingRes] = await Promise.all([
          fetch(`${API_BASE}/api/analytics/sales?${queryParams}`, { headers }),
          fetch(`${API_BASE}/api/analytics/cashiers?${queryParams}`, { headers }),
          fetch(`${API_BASE}/api/analytics/trending?${queryParams}`, { headers })
        ]);

        if (salesRes.status === 401 || cashiersRes.status === 401 || trendingRes.status === 401) {
          localStorage.removeItem('mosop_auth');
          window.location.href = '/login';
          return;
        }

        if (salesRes.ok) setSalesData(await salesRes.json());
        if (cashiersRes.ok) setCashierData((await cashiersRes.json()).leaderboard || []);
        if (trendingRes.ok) setTrendingData((await trendingRes.json()).trending || []);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      }
      setLoading(false);
    };

    fetchAnalytics();
  }, [storeId, dateRange]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);

  if (loading && !salesData) {
    return <div className="flex h-screen items-center justify-center bg-gray-50"><p className="text-gray-500 font-medium">Loading Analytics...</p></div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans pb-20">
      
      {/* Local Dashboard Filters */}
      <header className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-green-700">Mosop Analytics</h1>
          <p className="text-xs text-stone-500">Live Sales & Performance</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={storeId} 
            onChange={(e) => setStoreId(e.target.value)}
            className="flex-1 sm:flex-none border border-stone-300 rounded-md py-1.5 px-3 text-sm focus:ring-green-500 focus:border-green-500"
          >
            <option value="all">All Stores</option>
            <option value="1">Main (1)</option>
            <option value="2">Shop (2)</option>
            <option value="3">Nandi Hills (3)</option>
          </select>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="flex-1 sm:flex-none border border-stone-300 rounded-md py-1.5 px-3 text-sm focus:ring-green-500 focus:border-green-500"
          >
            <option value="0">Today</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </header>

      <main className="p-4 max-w-7xl mx-auto space-y-6">
        
        {/* KPI Cards (Grid) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard 
            title="Revenue" 
            icon={DollarSign} 
            value={formatCurrency(salesData?.total_revenue || 0)} 
          />
          <KpiCard 
            title="Profit" 
            icon={TrendingUp} 
            iconColorClass="text-blue-500"
            value={formatCurrency(salesData?.total_profit || 0)} 
          />
          <KpiCard 
            title="Margin" 
            icon={TrendingUp} 
            iconColorClass="text-purple-500"
            value={`${salesData?.overall_margin ? salesData.overall_margin.toFixed(1) : '0'}%`} 
          />
          <div 
            onClick={() => navigate('/inventory')}
            className="bg-green-600 p-4 rounded-xl shadow-sm border border-green-700 flex flex-col justify-center items-center text-white active:scale-95 transition-transform cursor-pointer"
          >
            <Store className="w-6 h-6 mb-1" />
            <span className="text-sm font-medium">Check Prices</span>
          </div>
        </div>

        {/* Sales Chart */}
        <RevenueChart data={salesData?.timeseries} />

        {/* Two-Column Layout on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cashier Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <h2 className="text-sm font-bold text-gray-700">Cashier Performance</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {cashierData.map((c, i) => (
                <li key={i} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {c.cashier_name ? c.cashier_name.substring(0, 2).toUpperCase() : '??'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.cashier_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{c.transactions_count} Sales</p>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-green-700">
                    {formatCurrency(c.total_revenue)}
                  </div>
                </li>
              ))}
              {cashierData.length === 0 && <li className="p-4 text-center text-sm text-gray-500">No sales data.</li>}
            </ul>
          </div>

          {/* Trending Products */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              <h2 className="text-sm font-bold text-gray-700">Top Selling Products</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {trendingData.map((p, i) => (
                <li key={i} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 text-gray-400 font-bold text-xs flex items-center justify-center">{i + 1}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{p.description}</p>
                      <p className="text-xs text-gray-500">{p.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">{p.quantity} Units</p>
                    <p className="text-xs text-green-600">{formatCurrency(p.revenue)}</p>
                  </div>
                </li>
              ))}
              {trendingData.length === 0 && <li className="p-4 text-center text-sm text-gray-500">No trending data.</li>}
            </ul>
          </div>
        </div>

      </main>
    </div>
  );
};

export default DashboardOverview;
