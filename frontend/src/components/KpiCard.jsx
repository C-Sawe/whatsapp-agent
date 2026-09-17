import React from 'react';

const KpiCard = ({ title, icon: Icon, value, iconColorClass = "text-green-500", onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-xl shadow-sm border border-stone-100 flex flex-col justify-between transition-[transform,background-color,box-shadow] duration-200 ease-[var(--ease-spring-soft)] ${onClick ? 'cursor-pointer hover:bg-stone-50 hover:shadow-md active:scale-[0.97]' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-stone-500 font-semibold uppercase tracking-widest">{title}</span>
        {Icon && <Icon className={`w-4 h-4 ${iconColorClass}`} />}
      </div>
      <div className="text-lg md:text-2xl font-black text-stone-900 tracking-tight">{value}</div>
    </div>
  );
};

export default KpiCard;
