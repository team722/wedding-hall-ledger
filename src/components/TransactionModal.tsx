import React, { useState } from 'react';
import { collection, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, TransactionType } from '../types';
import { useAuth } from '../auth';
import { useTransactions } from '../hooks/useTransactions';
import { X, CreditCard, Receipt, History, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionModalProps {
  booking: Booking;
  onClose: () => void;
}

export default function TransactionModal({ booking, onClose }: TransactionModalProps) {
  const { profile } = useAuth();
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState<TransactionType>('installment');
  const [loading, setLoading] = useState(false);
  const { transactions } = useTransactions(booking.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    setLoading(true);

    try {
      const transactionData = {
        bookingId: booking.id,
        amount,
        type,
        date: new Date().toISOString(),
        recordedBy: profile?.uid,
      };

      const batch = writeBatch(db);

      // Add Transaction
      const transactionRef = doc(collection(db, `bookings/${booking.id}/transactions`));
      batch.set(transactionRef, transactionData);

      // Update Booking Paid Amount
      const newPaidAmount = booking.paidAmount + (type === 'return' ? -amount : amount);
      const newStatus = newPaidAmount >= booking.netAmount ? 'complete' : 'pending';

      const bookingRef = doc(db, 'bookings', booking.id);
      batch.update(bookingRef, {
        paidAmount: newPaidAmount,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      // Audit Log
      const auditLogRef = doc(collection(db, 'auditLogs'));
      batch.set(auditLogRef, {
        action: 'transaction',
        entityType: 'booking',
        entityId: booking.id,
        category: 'finance',
        changes: { transaction: transactionData, newPaidAmount, newStatus },
        performedBy: profile?.uid,
        timestamp: serverTimestamp(),
      });

      // Commit the batch
      await batch.commit();

      setAmount(0);
    } catch (error) {
      console.error('Error adding transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 sm:p-6 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <h3 className="text-xl font-serif italic text-stone-900 truncate">Manage Payments</h3>
            <p className="text-xs text-stone-500 uppercase tracking-widest truncate">Bill #{booking.id.slice(0, 8)} - {booking.customerName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Net Payable</p>
              <p className="text-lg font-serif italic text-stone-900">₹{booking.netAmount.toLocaleString()}</p>
            </div>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Total Paid</p>
              <p className="text-lg font-serif italic text-emerald-600">₹{booking.paidAmount.toLocaleString()}</p>
            </div>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Balance</p>
              <p className="text-lg font-serif italic text-amber-600">₹{(booking.netAmount - booking.paidAmount).toLocaleString()}</p>
            </div>
          </div>

          {/* Add Transaction Form */}
          <form onSubmit={handleSubmit} className="bg-stone-50 p-4 sm:p-6 rounded-2xl border border-stone-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-stone-500 uppercase tracking-widest">Amount (₹)</label>
                <input
                  type="number"
                  required
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-stone-500 uppercase tracking-widest">Type</label>
                <select
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  value={type}
                  onChange={(e) => setType(e.target.value as TransactionType)}
                >
                  <option value="advance">Advance Payment</option>
                  <option value="installment">Installment</option>
                  <option value="return">Return Amount</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-lg disabled:opacity-50"
            >
              <Receipt className="w-5 h-5 mr-2" />
              {loading ? 'Recording...' : 'Record Transaction'}
            </button>
          </form>

          {/* Transaction History */}
          <div className="space-y-4">
            <h4 className="text-xs font-serif italic text-stone-500 uppercase tracking-widest border-b border-stone-100 pb-2 flex items-center">
              <History className="w-4 h-4 mr-2" />
              Transaction History
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {transactions.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-4 italic">No transactions recorded yet.</p>
              ) : (
                transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-stone-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {t.type === 'return' ? '-' : '+'} ₹{t.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-stone-500 uppercase tracking-tighter">
                        {t.type} • {format(new Date(t.date), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="text-[10px] text-stone-400 uppercase tracking-widest">
                      ID: {t.id.slice(0, 6)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
