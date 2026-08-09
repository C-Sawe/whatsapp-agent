import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DollarSign, AlertCircle } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import DebtorsLeaderboard from '../components/DebtorsLeaderboard';

export default function DebtDashboard() {
  const [debtData, setDebtData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    const fetchDebt = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('mosop_auth');
        const res = await axios.get('/api/analytics/debt', {
          headers: { Authorization: token },
          params: { page, page_size: pageSize }
        });
        if (res.data.status === 'success') {
          setDebtData(res.data);
        } else {
          setError('Failed to fetch debt data');
        }
      } catch (err) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDebt();
  }, [page, pageSize]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest text-stone-900">Accounts Receivable</h1>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start gap-3 rounded-r-md">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}

      {!debtData && loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-stone-200 rounded-xl w-full max-w-sm"></div>
          <div className="h-96 bg-stone-200 rounded-xl w-full"></div>
        </div>
      ) : debtData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              title="Total Outstanding Debt"
              icon={DollarSign}
              iconColorClass="text-red-500"
              value={formatCurrency(debtData.total_outstanding_debt)}
            />
          </div>

          <DebtorsLeaderboard 
            debtors={debtData.debtors} 
            page={debtData.page} 
            totalPages={debtData.total_pages} 
            totalDebtors={debtData.total_debtors}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
