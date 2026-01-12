
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loan, LoanType, LoanDuration, Payment } from './types';
import { dataService } from './services/dataService';
import { formatCurrency, formatDate, compressImage, getPreviewUrl } from './utils';
import Dashboard from './components/Dashboard';
import LoanCard from './components/LoanCard';
import { Plus, Search, X, Calendar, Trash2, Edit2, CheckCircle2, ArrowLeft, Image as ImageIcon, Wallet, Cloud, AlertCircle, Info, RefreshCw, Loader2, Wifi, WifiOff, Settings, FileText, Eye, Camera } from 'lucide-react';

const App: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  
  const paymentFileInputRef = useRef<HTMLInputElement>(null);
  const loanProofInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const local = dataService.getLoansLocal();
    setLoans(local);
    syncWithCloud();
  }, []);

  const syncWithCloud = async () => {
    setIsSyncing(true);
    setSyncError(false);
    try {
      const cloudData = await dataService.fetchLoansCloud();
      if (cloudData !== null) {
        setLoans(cloudData);
        setLastSync(new Date().toLocaleTimeString('th-TH'));
      } else {
        setSyncError(true);
      }
    } catch (e) {
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const { activeLoans, closedLoans } = useMemo(() => {
    const searched = loans.filter(l => 
      l.borrowerName.toLowerCase().includes(search.toLowerCase())
    );
    const active = searched.filter(l => l.status === 'active')
      .sort((a, b) => (b.principal + (b.interestAmount || 0)) - (a.principal + (a.interestAmount || 0))); 
    const closed = searched.filter(l => l.status === 'closed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { activeLoans: active, closedLoans: closed };
  }, [loans, search]);

  const handleSaveLoan = async () => {
    if (!formData.borrowerName || !formData.principal) return;
    
    setIsUploading(true);
    let finalProofUrl = formData.proofUrl;
    
    // ถ้ามีการเลือกรูปหลักฐานใหม่ (เป็น base64) ให้ส่งไป Cloud
    if (finalProofUrl && finalProofUrl.startsWith('data:image')) {
      const driveUrl = await dataService.uploadSlipToCloud(finalProofUrl, `proof_${formData.borrowerName}_${Date.now()}.jpg`);
      if (driveUrl) finalProofUrl = driveUrl;
    }

    let updatedLoansList: Loan[] = [];
    if (isEditing && selectedLoan) {
      const updated = { ...selectedLoan, ...formData, proofUrl: finalProofUrl } as Loan;
      const totalPaid = updated.payments.reduce((sum, p) => sum + p.amount, 0);
      const totalObligation = updated.principal + (updated.interestAmount || 0);
      updated.status = totalPaid >= totalObligation ? 'closed' : 'active';
      updatedLoansList = loans.map(l => l.id === selectedLoan.id ? updated : l);
      dataService.updateLoan(updated);
    } else {
      const newLoan: Loan = {
        ...formData as Loan,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        payments: [],
        status: 'active',
        proofUrl: finalProofUrl
      };
      updatedLoansList = [...loans, newLoan];
      dataService.addLoan(newLoan);
    }
    
    setLoans(updatedLoansList);
    setIsUploading(false);
    setIsAdding(false);
    setIsEditing(false);
    setSelectedLoan(null);
    resetForm();
  };

  const handleDeleteLoan = (id: string) => {
    if (window.confirm('⚠️ ยืนยันการลบ?')) {
      const updated = loans.filter(l => l.id !== id);
      setLoans(updated);
      dataService.saveLoans(updated);
      setSelectedLoan(null);
    }
  };

  const handlePaymentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImage(file);
        setPaymentData({ ...paymentData, slipUrl: base64 });
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการโหลดรูปภาพ');
      }
    }
  };

  const handleLoanProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImage(file);
        setFormData({ ...formData, proofUrl: base64 });
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการโหลดรูปภาพ');
      }
    }
  };

  const handlePayment = async () => {
    if (!selectedLoan || !paymentData.amount) return;
    setIsUploading(true);
    let finalSlipUrl = paymentData.slipUrl;
    
    if (finalSlipUrl && finalSlipUrl.startsWith('data:image')) {
      const driveUrl = await dataService.uploadSlipToCloud(finalSlipUrl, `slip_${selectedLoan.borrowerName}_${Date.now()}.jpg`);
      if (driveUrl) finalSlipUrl = driveUrl;
    }

    let updatedPayments = [...selectedLoan.payments];
    if (editingPaymentId) {
      updatedPayments = updatedPayments.map(p => p.id === editingPaymentId ? { ...p, ...paymentData, slipUrl: finalSlipUrl } as Payment : p);
    } else {
      updatedPayments.push({ 
        id: crypto.randomUUID(), 
        amount: Number(paymentData.amount), 
        date: paymentData.date || new Date().toISOString(), 
        note: paymentData.note, 
        slipUrl: finalSlipUrl 
      });
    }

    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalObligation = selectedLoan.principal + (selectedLoan.interestAmount || 0);
    const updatedLoan: Loan = { ...selectedLoan, payments: updatedPayments, status: totalPaid >= totalObligation ? 'closed' : 'active' };
    const newLoans = loans.map(l => l.id === selectedLoan.id ? updatedLoan : l);
    
    setLoans(newLoans);
    dataService.updateLoan(updatedLoan);
    setSelectedLoan(updatedLoan);
    setIsUploading(false);
    setIsPaying(false);
    setEditingPaymentId(null);
    setPaymentData({ amount: 0, date: new Date().toISOString().split('T')[0], note: '', slipUrl: undefined });
  };

  const [formData, setFormData] = useState<Partial<Loan>>({ borrowerName: '', type: 'individual', principal: 0, interestAmount: 0, duration: '1month', startDate: new Date().toISOString().split('T')[0], dueDayOfMonth: undefined, status: 'active', payments: [], proofUrl: undefined });
  const [paymentData, setPaymentData] = useState<Partial<Payment>>({ amount: 0, date: new Date().toISOString().split('T')[0], note: '', slipUrl: undefined });
  const resetForm = () => setFormData({ borrowerName: '', type: 'individual', principal: 0, interestAmount: 0, duration: '1month', startDate: new Date().toISOString().split('T')[0], dueDayOfMonth: undefined, status: 'active', payments: [], proofUrl: undefined });
  const stats = useMemo(() => dataService.getStatsByLoans(loans), [loans]);

  return (
    <div className="max-w-md mx-auto min-h-screen pb-32 relative bg-black text-white font-['Kanit']">
      <header className="px-5 pt-10 pb-6 sticky top-0 bg-black/90 backdrop-blur-xl z-30 border-b border-zinc-900">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <h1 className="text-4xl font-black tracking-tighter text-white">TON</h1>
             <div className="flex flex-col">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors ${
                  isSyncing ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 
                  syncError ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                    {isSyncing ? <Loader2 size={10} className="animate-spin" /> : 
                     syncError ? <WifiOff size={10} onClick={() => setShowConfigHelp(true)} /> : <Wifi size={10} />}
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      {isSyncing ? 'กำลังซิงค์...' : syncError ? 'ตั้งค่า URL?' : 'ออนไลน์'}
                    </span>
                </div>
                {lastSync && <span className="text-[7px] text-zinc-500 mt-1 ml-1 font-bold">{lastSync}</span>}
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={syncWithCloud} disabled={isSyncing} className={`p-3 rounded-2xl bg-zinc-900 text-zinc-400 active:scale-95 transition-all ${isSyncing ? 'opacity-50' : ''}`}>
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-emerald-500 text-black px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                <Plus size={18} strokeWidth={4} />
            </button>
          </div>
        </div>
        
        {syncError && (
          <div onClick={() => setShowConfigHelp(true)} className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between text-red-400 cursor-pointer">
             <div className="flex items-center gap-3">
               <AlertCircle size={16} />
               <p className="text-[10px] font-bold">ยังไม่ได้เชื่อมต่อกับ Cloud (คลิกเพื่อดูวิธี)</p>
             </div>
             <Settings size={14} />
          </div>
        )}

        <div className="relative mt-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input type="text" placeholder="ค้นหาชื่อ..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-4 bg-zinc-900/50 border border-zinc-800 h-14 rounded-[1.5rem] text-sm focus:border-emerald-500 outline-none transition-all" />
        </div>
      </header>

      {showConfigHelp && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md p-8 flex flex-col justify-center">
           <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 space-y-6">
              <h3 className="text-2xl font-black text-emerald-400">วิธีซิงค์ข้อมูลข้ามเครื่อง</h3>
              <ol className="text-sm text-zinc-400 space-y-4 list-decimal ml-4">
                 <li>ไปที่ <b>Google Script</b> ของคุณ</li>
                 <li>กดปุ่ม <b>Deploy</b> (ทำให้ใช้งานได้) -> <b>New Deployment</b></li>
                 <li>เลือก Access เป็น <b>Anyone</b> (ทุกคน)</li>
                 <li>ก๊อปปี้ URL ที่ได้ มาวางในไฟล์ <b>dataService.ts</b></li>
              </ol>
              <button onClick={() => setShowConfigHelp(false)} className="w-full py-4 bg-emerald-500 text-black font-black rounded-2xl">รับทราบ</button>
           </div>
        </div>
      )}

      {!selectedLoan && !isAdding && !isEditing && (
        <>
          <Dashboard stats={stats} />
          <div className="px-5 mt-8 space-y-10">
            <section>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Wallet size={14} /> กำลังดำเนินการ</h2>
                <span className="text-[10px] bg-emerald-500/10 px-2 py-1 rounded-lg text-emerald-400 font-black">{activeLoans.length}</span>
              </div>
              <div className="space-y-4">
                {activeLoans.map(loan => <LoanCard key={loan.id} loan={loan} onClick={setSelectedLoan} />)}
                {activeLoans.length === 0 && !isSyncing && (
                  <div className="text-center py-20 text-zinc-800 bg-zinc-900/10 rounded-[2rem] border-2 border-dashed border-zinc-900 font-bold">
                    <Cloud size={40} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm">ไม่มีข้อมูลในเครื่องนี้</p>
                    <p className="text-[10px] text-zinc-600 mt-2">ถ้าคุณบันทึกไว้ในเครื่องอื่น กรุณากดปุ่ม 🔄</p>
                  </div>
                )}
              </div>
            </section>
            {closedLoans.length > 0 && (
              <section className="pb-10">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="text-[11px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 size={14} /> ปิดยอดแล้ว</h2>
                </div>
                <div className="opacity-50 grayscale scale-[0.98] origin-top">{closedLoans.map(loan => <LoanCard key={loan.id} loan={loan} onClick={setSelectedLoan} />)}</div>
              </section>
            )}
          </div>
        </>
      )}

      {(isAdding || isEditing) && (
        <div className="fixed inset-0 z-50 bg-black p-6 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between mb-10">
            <button onClick={() => { setIsAdding(false); setIsEditing(false); }} className="p-3 bg-zinc-900 rounded-2xl text-zinc-400"><X size={24} /></button>
            <h2 className="text-2xl font-black">{isEditing ? 'แก้ไข' : 'เพิ่มคนกู้'}</h2>
            <button onClick={handleSaveLoan} disabled={isUploading} className="px-8 py-3 bg-emerald-500 text-black font-black rounded-2xl shadow-xl active:scale-95 disabled:opacity-50">
               {isUploading ? <Loader2 className="animate-spin" size={20} /> : 'บันทึก'}
            </button>
          </div>
          <div className="space-y-6 pb-20">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setFormData({ ...formData, type: 'individual' })} className={`py-4 rounded-3xl border-2 font-bold transition-all ${formData.type === 'individual' ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>เดี่ยว</button>
              <button onClick={() => setFormData({ ...formData, type: 'group' })} className={`py-4 rounded-3xl border-2 font-bold transition-all ${formData.type === 'group' ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>กลุ่ม</button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">ชื่อผู้กู้</label>
              <input type="text" className="w-full h-16 text-xl font-bold bg-zinc-900/50 rounded-3xl px-6 outline-none border border-zinc-800 focus:border-emerald-500" placeholder="..." value={formData.borrowerName} onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">เงินต้น (บาท)</label>
                <input type="number" className="w-full h-16 text-2xl font-black bg-zinc-900/50 rounded-3xl px-6 text-emerald-400 border border-zinc-800" placeholder="0" value={formData.principal || ''} onChange={(e) => setFormData({ ...formData, principal: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">ดอกเบี้ย (บาท)</label>
                <input type="number" className="w-full h-16 text-2xl font-black bg-zinc-900/50 rounded-3xl px-6 text-amber-500 border border-zinc-800" placeholder="0" value={formData.interestAmount || ''} onChange={(e) => setFormData({ ...formData, interestAmount: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select className="w-full h-16 text-lg font-bold bg-zinc-900/50 rounded-3xl px-6 border border-zinc-800" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value as LoanDuration })}>
                <option value="1month">รายเดือน</option><option value="3month">3 เดือน</option><option value="custom">ระบุเอง</option>
              </select>
              <input type="number" className="w-full h-16 text-xl font-bold bg-zinc-900/50 rounded-3xl px-6 border border-zinc-800" placeholder="วันที่จ่าย" value={formData.dueDayOfMonth || ''} onChange={(e) => setFormData({ ...formData, dueDayOfMonth: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">วันที่เริ่มกู้</label>
              <input type="date" className="w-full h-16 text-lg font-bold bg-zinc-900/50 rounded-3xl px-6 border border-zinc-800" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            </div>
            
            <div className="space-y-4 pt-4">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">หลักฐานการปล่อยกู้ (รูปภาพสัญญา/หลักฐานการโอน)</label>
              <input type="file" accept="image/*" className="hidden" ref={loanProofInputRef} onChange={handleLoanProofChange} />
              
              {formData.proofUrl ? (
                <div className="relative group">
                  <img src={getPreviewUrl(formData.proofUrl)} className="w-full h-56 object-cover rounded-[2rem] border-2 border-zinc-800 shadow-lg" />
                  <button onClick={() => setFormData({ ...formData, proofUrl: undefined })} className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-full shadow-xl">
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <button onClick={() => loanProofInputRef.current?.click()} className="w-full h-40 bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-zinc-500 active:bg-zinc-800/50 transition-colors">
                  <div className="p-4 bg-zinc-800 rounded-full"><Camera size={32} /></div>
                  <span className="text-xs font-bold">กดเพื่อถ่ายรูปหรือเลือกหลักฐาน</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedLoan && !isAdding && !isEditing && (
        <div className="fixed inset-0 z-40 bg-black flex flex-col overflow-y-auto pb-24">
          <header className="p-6 flex items-center gap-4 bg-black border-b border-zinc-900 sticky top-0 z-50">
            <button onClick={() => setSelectedLoan(null)} className="p-3 bg-zinc-900 rounded-2xl text-zinc-400"><ArrowLeft size={24} /></button>
            <div className="flex-1 font-black text-2xl truncate">{selectedLoan.borrowerName}</div>
            <div className="flex gap-2">
              <button onClick={() => { setFormData(selectedLoan); setIsEditing(true); }} className="p-3 bg-zinc-900 rounded-2xl text-zinc-400"><Edit2 size={20} /></button>
              <button onClick={() => handleDeleteLoan(selectedLoan.id)} className="p-3 bg-zinc-900 rounded-2xl text-red-500"><Trash2 size={20} /></button>
            </div>
          </header>
          <div className="p-6 space-y-6">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 rounded-[2.5rem] shadow-2xl">
               <span className="text-[10px] font-black text-black/60 uppercase block mb-2">ยอดรวมทั้งหมด</span>
               <p className="text-4xl font-black text-black">{formatCurrency(selectedLoan.principal + (selectedLoan.interestAmount || 0))}</p>
            </div>
            
            {/* ส่วนแสดงหลักฐานปล่อยกู้ */}
            {selectedLoan.proofUrl && (
              <div className="bg-zinc-900/30 p-5 rounded-[2rem] border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} /> หลักฐานการปล่อยกู้
                  </h3>
                  <button onClick={() => window.open(selectedLoan.proofUrl, '_blank')} className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                    <Eye size={12} /> ดูรูปใหญ่
                  </button>
                </div>
                <img 
                  src={getPreviewUrl(selectedLoan.proofUrl)} 
                  className="w-full h-40 object-cover rounded-2xl border border-zinc-800 cursor-pointer"
                  onClick={() => window.open(selectedLoan.proofUrl, '_blank')}
                  onError={(e) => (e.currentTarget.src = 'https://placehold.co/600x400/1a1a1a/555?text=Image+Error')}
                />
              </div>
            )}

            <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800 flex justify-between items-center">
              <div><span className="text-[10px] font-black text-zinc-500 uppercase block mb-1">ยอดค้างชำระ</span>
              <p className="text-3xl font-black text-emerald-400">{formatCurrency((selectedLoan.principal + (selectedLoan.interestAmount || 0)) - selectedLoan.payments.reduce((sum, p) => sum + p.amount, 0))}</p></div>
              <button onClick={() => { setIsPaying(true); setEditingPaymentId(null); setPaymentData({ amount: 0, date: new Date().toISOString().split('T')[0], note: '', slipUrl: undefined }); }} className="bg-emerald-500 text-black px-6 py-4 rounded-2xl font-black shadow-lg">+ รับเงิน</button>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-black text-xl">ประวัติรับชำระ</h3>
              {selectedLoan.payments.length === 0 ? (
                <div className="py-10 text-center text-zinc-700 font-bold border-2 border-dashed border-zinc-900 rounded-[2rem]">
                  ยังไม่มีประวัติการชำระ
                </div>
              ) : (
                selectedLoan.payments.map(payment => (
                  <div key={payment.id} className="bg-zinc-900/50 p-5 rounded-[1.5rem] border border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {payment.slipUrl && (
                        <div onClick={() => window.open(payment.slipUrl, '_blank')} className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-emerald-500 overflow-hidden cursor-pointer active:scale-95 transition-transform">
                          <img 
                            src={getPreviewUrl(payment.slipUrl)} 
                            className="w-full h-full object-cover" 
                            onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100/1a1a1a/555?text=?')}
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-xl font-black text-emerald-400">{formatCurrency(payment.amount)}</p>
                        <p className="text-[10px] text-zinc-500 font-bold">{formatDate(payment.date)} {payment.note ? `• ${payment.note}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingPaymentId(payment.id); setPaymentData(payment); setIsPaying(true); }} className="p-2 bg-zinc-800 rounded-xl text-zinc-400"><Edit2 size={14} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {isPaying && (
            <div className="fixed inset-0 z-[60] bg-black p-6 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between mb-12">
                <button onClick={() => setIsPaying(false)} className="p-3 bg-zinc-900 rounded-2xl text-zinc-400"><X size={24} /></button>
                <h2 className="text-2xl font-black">{editingPaymentId ? 'แก้ไขการรับเงิน' : 'บันทึกรับชำระ'}</h2>
                <button onClick={handlePayment} disabled={isUploading} className="px-10 py-3 bg-emerald-500 text-black font-black rounded-2xl shadow-xl disabled:opacity-50">
                  {isUploading ? <Loader2 className="animate-spin" size={20} /> : 'ยืนยัน'}
                </button>
              </div>
              <div className="space-y-8 flex-1">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 ml-1">จำนวนเงิน (บาท)</label>
                  <input type="number" className="w-full text-5xl font-black bg-transparent border-b-4 border-zinc-900 p-0 py-4 focus:border-emerald-500 text-emerald-400 outline-none" placeholder="0" autoFocus value={paymentData.amount || ''} onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })} />
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">วันที่รับเงิน</label>
                    <input type="date" className="w-full h-16 bg-zinc-900/50 rounded-3xl px-6 font-bold border border-zinc-800" value={paymentData.date} onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">หมายเหตุ</label>
                    <input type="text" className="w-full h-16 bg-zinc-900/50 rounded-3xl px-6 border border-zinc-800" placeholder="ระบุเพิ่มเติม..." value={paymentData.note} onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">สลิปการรับเงิน</label>
                  <input type="file" accept="image/*" className="hidden" ref={paymentFileInputRef} onChange={handlePaymentFileChange} />
                  
                  {paymentData.slipUrl ? (
                    <div className="relative group">
                      <img src={getPreviewUrl(paymentData.slipUrl)} className="w-full h-48 object-cover rounded-[2rem] border-2 border-zinc-800" />
                      <button onClick={() => setPaymentData({ ...paymentData, slipUrl: undefined })} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg">
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => paymentFileInputRef.current?.click()} className="w-full h-32 bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-[2rem] flex flex-col items-center justify-center gap-2 text-zinc-500 active:bg-zinc-800/50 transition-colors">
                      <ImageIcon size={32} />
                      <span className="text-xs font-bold">กดเพื่อเลือกรูปภาพสลิป</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-2xl px-12 py-5 rounded-[2.5rem] border border-white/5 shadow-2xl flex items-center gap-16 z-20">
        <button onClick={() => setSelectedLoan(null)} className="text-emerald-500 flex flex-col items-center gap-1 active:scale-90 transition-all"><Wallet size={24} /><span className="text-[8px] font-black uppercase tracking-widest">Home</span></button>
        <button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-emerald-500 text-black p-4 -mt-16 rounded-full shadow-2xl ring-[8px] ring-black active:scale-90 transition-all"><Plus size={32} /></button>
        <button onClick={syncWithCloud} className="text-zinc-600 flex flex-col items-center gap-1 active:scale-90 transition-all"><RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} /><span className="text-[8px] font-black uppercase tracking-widest">Sync</span></button>
      </nav>
    </div>
  );
};

export default App;
