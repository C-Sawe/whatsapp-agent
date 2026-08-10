import React, { useEffect, useState } from 'react';
import api from '../api';
import { Users, AlertCircle, ShoppingCart, DollarSign, Activity } from 'lucide-react';
import KpiCard from '../components/KpiCard';

export default function StaffDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // default to last 30 days
  const [dateRange, setDateRange] = useState('30days');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        let params = {};
        if (dateRange === '30days') {
          // No params means 30 days on backend by default
        } else if (dateRange === 'today') {
          const today = new Date().toISOString().split('T')[0];
          params = { start_date: today, end_date: today };
        } else if (dateRange === '7days') {
          const today = new Date();
          const lastWeek = new Date(today);
          lastWeek.setDate(lastWeek.getDate() - 7);
          params = { 
            start_date: lastWeek.toISOString().split('T')[0], 
            end_date: today.toISOString().split('T')[0] 
          };
        }

        const res = await api.get('/api/analytics/cashiers', {
          params
        });
        
        if (res.data.status === 'success') {
          setData(res.data.leaderboard);
        } else {
          setError('Failed to fetch staff data');
        }
      } catch (err) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStaff();
  }, [dateRange]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);

  const totalRevenue = data ? data.reduce((acc, curr) => acc + curr.total_revenue, 0) : 0;
  const totalTransactions = data ? data.reduce((acc, curr) => acc + curr.transactions_count, 0) : 0;
  const totalQuantity = data ? data.reduce((acc, curr) => acc + curr.quantity_sold, 0) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-stone-900 rounded-lg shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest text-stone-900">Staff Performance</h1>
        </div>
        
        <select 
          className="px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-stone-900 shadow-sm"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start gap-3 rounded-r-md">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-28 bg-stone-200 rounded-2xl w-full"></div>
            <div className="h-28 bg-stone-200 rounded-2xl w-full"></div>
            <div className="h-28 bg-stone-200 rounded-2xl w-full"></div>
          </div>
          <div className="h-96 bg-stone-200 rounded-2xl w-full"></div>
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard 
              title="Team Revenue"
              icon={DollarSign}
              iconColorClass="text-green-600"
              value={formatCurrency(totalRevenue)}
            />
            <KpiCard 
              title="Total Transactions"
              icon={Activity}
              iconColorClass="text-blue-600"
              value={totalTransactions.toLocaleString()}
            />
            <KpiCard 
              title="Units Sold"
              icon={ShoppingCart}
              iconColorClass="text-orange-600"
              value={totalQuantity.toLocaleString()}
            />
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <h2 className="font-bold text-stone-900 uppercase tracking-widest text-sm">Leaderboard</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold border-b border-stone-200 w-16 text-center">Rank</th>
                    <th className="p-4 font-semibold border-b border-stone-200">Cashier Name</th>
                    <th className="p-4 font-semibold border-b border-stone-200 text-right">Revenue</th>
                    <th className="p-4 font-semibold border-b border-stone-200 text-right">Profit</th>
                    <th className="p-4 font-semibold border-b border-stone-200 text-right">Transactions</th>
                    <th className="p-4 font-semibold border-b border-stone-200 text-right">Avg Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-12 text-center text-stone-500">
                        No staff activity found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    data.map((staff, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-4 text-center">
                          {idx === 0 && <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-black text-sm">1</span>}
                          {idx === 1 && <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-200 text-stone-700 font-black text-sm">2</span>}
                          {idx === 2 && <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-800 font-black text-sm">3</span>}
                          {idx > 2 && <span className="font-bold text-stone-400">{idx + 1}</span>}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-stone-900">{staff.cashier_name}</div>
                          <div className="text-xs text-stone-500">{staff.quantity_sold.toLocaleString()} units sold</div>
                        </td>
                        <td className="p-4 text-right font-black text-stone-900">
                          {formatCurrency(staff.total_revenue)}
                        </td>
                        <td className="p-4 text-right font-bold text-green-600">
                          {formatCurrency(staff.total_profit)}
                        </td>
                        <td className="p-4 text-right font-medium text-stone-600">
                          {staff.transactions_count.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-medium text-stone-500">
                          {formatCurrency(staff.average_transaction_value)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
