import React from 'react';
import { Users, Phone, MessageCircle } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);

const DebtorsLeaderboard = ({ debtors, page, totalPages, totalDebtors, onPageChange }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
      <div className="p-4 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-stone-500" />
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-widest">Debtors Leaderboard</h2>
        </div>
        {totalDebtors > 0 && (
          <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
            {totalDebtors} Debtors Total
          </span>
        )}
      </div>
      <ul className="divide-y divide-stone-100">
        {debtors.map((d, i) => (
          <li key={i} className="p-4 hover:bg-stone-50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">A/C: {d.account_number || 'N/A'}</span>
                <p className="text-sm font-black text-stone-900 tracking-tight">{d.customer_name || 'Unknown Customer'}</p>
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-xs font-medium text-stone-500">Limit: {formatCurrency(d.credit_limit)}</span>
                  {d.last_payment_date && (
                    <span className="text-xs font-medium text-blue-600">Last Payment: {new Date(d.last_payment_date).toLocaleDateString()}</span>
                  )}
                  {d.recent_orders && (
                    <span className="text-xs font-medium text-emerald-600">Recent Orders: #{d.recent_orders}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Outstanding</span>
                  <p className="text-base font-black text-red-600 tracking-tight">{formatCurrency(d.outstanding_debt)}</p>
                </div>
                {d.phone_number && (
                  <div className="flex gap-2 shrink-0">
                    <a href={`tel:${d.phone_number}`} className="p-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-md transition-colors">
                      <Phone className="w-4 h-4" />
                    </a>
                    <a href={`https://wa.me/${d.phone_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-md transition-colors">
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
        {debtors.length === 0 && (
          <li className="p-8 text-center text-sm text-stone-500 font-medium">No outstanding debts found.</li>
        )}
      </ul>
      
      {totalPages > 1 && (
        <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50">
          <button 
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-bold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-stone-500">
            Page <span className="font-bold text-stone-900">{page}</span> of {totalPages}
          </span>
          <button 
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-bold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default DebtorsLeaderboard;
