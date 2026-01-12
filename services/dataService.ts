import { Loan, SummaryStats } from '../types';

const STORAGE_KEY = 'ton_loans_data';

// ดึง URL จาก Environment Variable (ถ้าไม่มีให้ใช้ค่า Default ที่เคยตั้งไว้)
// Fixed: Using process.env to resolve 'Property env does not exist on type ImportMeta' error
const APPS_SCRIPT_URL = (process.env as any).VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzjdVvyVs6UeiXzMPr4a_RAkQ1PJxnDUyJ65NIRnSx3FORmzw7gP-W2EF_M9i9iPzoQ/exec';

export const dataService = {
  getLoansLocal: (): Loan[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  fetchLoansCloud: async (): Promise<Loan[] | null> => {
    if (!APPS_SCRIPT_URL) {
      console.error('กรุณาตั้งค่า VITE_APPS_SCRIPT_URL');
      return null;
    }

    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?action=getLoans&t=${Date.now()}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const result = await response.json();
      
      if (result && result.status === 'success') {
        const cloudLoans = result.loans || [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudLoans));
        return cloudLoans;
      }
      return null;
    } catch (err) {
      console.error('Download Error:', err);
      return null;
    }
  },

  saveLoans: (loans: Loan[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
    
    if (APPS_SCRIPT_URL) {
      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'saveLoans', loans: loans })
      }).catch(err => console.error('Upload Error:', err));
    }
  },

  uploadSlipToCloud: async (base64: string, fileName: string): Promise<string | null> => {
    if (!APPS_SCRIPT_URL) return null;
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'uploadSlip', base64: base64, fileName: fileName })
      });
      const result = await response.json();
      return result && result.status === 'success' ? result.url : null;
    } catch (err) {
      return null;
    }
  },

  addLoan: (loan: Loan): void => {
    const loans = dataService.getLoansLocal();
    loans.push(loan);
    dataService.saveLoans(loans);
  },

  updateLoan: (updatedLoan: Loan): void => {
    const loans = dataService.getLoansLocal();
    const index = loans.findIndex(l => l.id === updatedLoan.id);
    if (index !== -1) {
      loans[index] = updatedLoan;
      dataService.saveLoans(loans);
    }
  },

  getStatsByLoans: (loans: Loan[]): SummaryStats => {
    let totalLent = 0;
    let totalPaid = 0;
    let totalActiveInterest = 0;
    let totalClosedInterest = 0;

    loans.forEach(loan => {
      totalLent += loan.principal;
      const loanPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0);
      totalPaid += loanPaid;
      const interest = loan.interestAmount || 0;

      if (loan.status === 'active') {
        totalActiveInterest += interest;
      } else {
        totalClosedInterest += interest;
      }
    });

    return { totalLent, totalPaid, totalActiveInterest, totalClosedInterest };
  }
};