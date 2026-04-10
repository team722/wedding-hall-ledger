import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth';
import { Booking, DiscountType, BookingStatus } from '../types';
import { ArrowLeft, Save, Calculator, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function BookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    mobileNumber: '',
    hallName: '',
    fromDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    toDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    totalAmount: 0,
    discountType: 'amount' as DiscountType,
    discountValue: 0,
    returnableAmount: 0,
    status: 'pending' as BookingStatus,
  });

  useEffect(() => {
    if (id) {
      const fetchBooking = async () => {
        const docRef = doc(db, 'bookings', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Booking;
          setFormData({
            customerName: data.customerName,
            mobileNumber: data.mobileNumber,
            hallName: data.hallName,
            fromDate: data.fromDate,
            toDate: data.toDate,
            totalAmount: data.totalAmount,
            discountType: data.discountType,
            discountValue: data.discountValue,
            returnableAmount: data.returnableAmount,
            status: data.status,
          });
        }
      };
      fetchBooking();
    }
  }, [id]);

  const calculateNet = () => {
    const { totalAmount, discountType, discountValue } = formData;
    let net = totalAmount;
    if (discountType === 'percentage') {
      net = totalAmount - (totalAmount * (discountValue / 100));
    } else {
      net = totalAmount - discountValue;
    }
    return Math.max(0, net);
  };

  const netAmount = calculateNet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.uid) {
      alert("Error: User session not fully loaded. Please wait a moment or refresh.");
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        ...formData,
        netAmount,
        updatedAt: new Date().toISOString(),
      };

      const batch = writeBatch(db);
      let entityId = id;

      if (id) {
        // Update
        const docRef = doc(db, 'bookings', id);
        const oldDoc = await getDoc(docRef);
        const oldData = oldDoc.data();

        batch.update(docRef, bookingData);

        // Audit Log
        const auditLogRef = doc(collection(db, 'auditLogs'));
        batch.set(auditLogRef, {
          action: 'update',
          entityType: 'booking',
          entityId: id,
          category: 'finance',
          changes: { old: oldData, new: bookingData },
          performedBy: profile?.uid,
          timestamp: serverTimestamp(),
        });
      } else {
        // Create
        const newBookingRef = doc(collection(db, 'bookings'));
        entityId = newBookingRef.id;
        batch.set(newBookingRef, {
          ...bookingData,
          paidAmount: 0,
          createdAt: serverTimestamp(),
        });

        // Audit Log
        const auditLogRef = doc(collection(db, 'auditLogs'));
        batch.set(auditLogRef, {
          action: 'create',
          entityType: 'booking',
          entityId: entityId,
          category: 'finance',
          changes: { new: bookingData },
          performedBy: profile?.uid,
          timestamp: serverTimestamp(),
        });
      }

      await batch.commit();
      navigate('/admin');
    } catch (error: any) {
      console.error('Error saving booking:', error);
      alert(`Failed to save booking. Please check your data.\nError: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-3xl font-serif italic tracking-tight text-stone-900">
              {id ? 'Edit Booking' : 'New Hall Booking'}
            </h2>
            <p className="text-sm text-stone-500 mt-1 uppercase tracking-widest">
              {id ? `Bill #${id.slice(0, 8)}` : 'Create Entry'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
        <div className="p-4 sm:p-8 space-y-8">
          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">Customer Name</label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">Mobile Number</label>
              <input
                required
                type="tel"
                minLength={10}
                maxLength={10}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Hall & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">Hall Name</label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                value={formData.hallName}
                onChange={(e) => setFormData({ ...formData, hallName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">From Date</label>
              <input
                required
                type="datetime-local"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">To Date</label>
              <input
                required
                type="datetime-local"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                value={formData.toDate}
                onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
              />
            </div>
          </div>

          {/* Financials */}
          <div className="bg-stone-50 p-4 sm:p-8 rounded-2xl border border-stone-100 space-y-6">
            <h3 className="text-sm font-serif italic text-stone-900 uppercase tracking-widest border-b border-stone-200 pb-2">Financial Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">Total Amount (₹)</label>
                <input
                  required
                  type="number"
                  className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">Discount Type</label>
                <select
                  className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
                >
                  <option value="amount">Fixed Amount (₹)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">Discount Value</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">Returnable (₹)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  value={formData.returnableAmount}
                  onChange={(e) => setFormData({ ...formData, returnableAmount: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-stone-200">
              <div className="flex items-center text-stone-500">
                <Calculator className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium uppercase tracking-widest">Net Payable Amount</span>
              </div>
              <div className="text-3xl font-serif italic text-stone-900">
                ₹{netAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-stone-50 p-4 sm:p-8 border-t border-stone-100 flex flex-col sm:flex-row justify-end sm:space-x-4 space-y-4 sm:space-y-0">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="w-full sm:w-auto px-6 py-3 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors text-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center px-8 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-lg disabled:opacity-50"
          >
            <Save className="w-5 h-5 mr-2" />
            {loading ? 'Saving...' : 'Save Booking'}
          </button>
        </div>
      </form>
    </div>
  );
}
