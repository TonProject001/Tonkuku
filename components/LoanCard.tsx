
import React from 'react';
import { Loan } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Users, User, Clock, Wallet, PlusCircle } from 'lucide-react';

interface LoanCardProps {
  loan: Loan;
  onClick: (loan: Loan) => void;
}

const LoanCard: React.FC<LoanCardProps> = ({ loan, onClick }) => {
  const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0);
  // ยอดรวมที่ต้องได้รับทั้งหมด = เงินต้น + ดอกเบี้ยที่ตกลงกัน
  const totalObligation = loan.principal + (loan.interestAmount || 0);
  const remaining = totalObligation - totalPaid;
  // คำนวณความคืบหน้าจากยอดรวมทั้งหมด
  const progress = Math.min((totalPaid / totalObligation) * 100, 100);
  const isActive = loan.status === 'active';

  return (
    <div 
      onClick={() => onClick(loan)}
      className={`relative overflow-hidden border rounded-[2rem] p-5 mb-4 active:scale-[0.97] transition-all duration-300 ${
        isActive 
          ? 'bg-zinc-900/50 border-zinc-800 shadow-lg' 
          : 'bg-zinc-950 border-zinc-900 opacity-60'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${
            isActive 
              ? (loan.type === 'group' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400') 
              : 'bg-zinc-800 text-zinc-600'
          }`}>
            {loan.type === 'group' ? <Users size={22} /> : <User size={22} />}
          </div>
          <div>
            <h3 className={`font-black text-lg truncate max-w-[140px] ${isActive ? 'text-white' : 'text-zinc-500'}`}>
              {loan.borrowerName}
            </h3>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              {loan.type === 'group' ? 'กู้แบบกลุ่ม' : 'กู้แบบบุคคล'} • {loan.duration}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-black ${isActive ? 'text-white' : 'text-zinc-600'}`}>
            {formatCurrency(totalObligation)}
          </div>
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">ยอดรวม (ต้น+ดอก)</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 bg-black/30 px-3 py-1.5 rounded-full border border-zinc-800/50">
          <Clock size={12} className={isActive ? 'text-emerald-500' : 'text-zinc-700'} />
          {formatDate(loan.startDate)}
          {loan.dueDayOfMonth ? ` • ทุกวันที่ ${loan.dueDayOfMonth}` : ''}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-amber-500/80">
          <PlusCircle size={10} />
          ดอกเบี้ย {formatCurrency(loan.interestAmount || 0)}
        </div>
      </div>

      <div className="space-y-2">
        <div className="w-full bg-zinc-800/50 h-2 rounded-full overflow-hidden border border-zinc-800">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${
              isActive ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-zinc-700'
            }`} 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center text-[11px] font-bold">
          <div className="flex items-center gap-1 text-zinc-500">
             <span className={isActive ? 'text-emerald-500' : ''}>คืนแล้ว</span>
             <span>{formatCurrency(totalPaid)}</span>
          </div>
          <div className={`flex items-center gap-1 ${isActive ? 'text-white' : 'text-zinc-600'}`}>
             <span>คงเหลือที่ต้องได้</span>
             <span className="font-black text-sm text-emerald-400">
               {formatCurrency(remaining > 0 ? remaining : 0)}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanCard;
