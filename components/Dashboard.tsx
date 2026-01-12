
import React from 'react';
import { SummaryStats } from '../types';
import { formatCurrency } from '../utils';
import { TrendingUp, Wallet, CheckCircle, PieChart } from 'lucide-react';

interface DashboardProps {
  stats: SummaryStats;
}

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <div className="bg-zinc-900/40 p-5 rounded-[2rem] border border-zinc-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-zinc-500 mb-2">
          <Wallet size={14} strokeWidth={2.5} />
          <span className="text-[10px] font-black uppercase tracking-widest">ปล่อยกู้รวม</span>
        </div>
        <div className="text-xl font-black text-white leading-tight">
          {formatCurrency(stats.totalLent)}
        </div>
      </div>

      <div className="bg-zinc-900/40 p-5 rounded-[2rem] border border-zinc-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-zinc-500 mb-2">
          <CheckCircle size={14} strokeWidth={2.5} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">รับชำระแล้ว</span>
        </div>
        <div className="text-xl font-black text-emerald-400 leading-tight">
          {formatCurrency(stats.totalPaid)}
        </div>
      </div>

      <div className="bg-zinc-900/40 p-5 rounded-[2rem] border border-zinc-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-zinc-500 mb-2">
          <TrendingUp size={14} strokeWidth={2.5} className="text-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">ดอกค้างรับ</span>
        </div>
        <div className="text-xl font-black text-amber-500 leading-tight">
          {formatCurrency(stats.totalActiveInterest)}
        </div>
      </div>

      <div className="bg-zinc-900/40 p-5 rounded-[2rem] border border-zinc-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-zinc-500 mb-2">
          <PieChart size={14} strokeWidth={2.5} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">ดอกที่ปิดแล้ว</span>
        </div>
        <div className="text-xl font-black text-blue-400 leading-tight">
          {formatCurrency(stats.totalClosedInterest)}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
