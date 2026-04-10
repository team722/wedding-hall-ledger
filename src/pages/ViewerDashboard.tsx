import { useState } from 'react';
import { useBookings } from '../hooks/useBookings';
import { Booking } from '../types';
import { Search, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Routes, Route } from 'react-router-dom';
import AuditLogs from '../components/AuditLogs';
import Loader from '../components/Loader';

export default function ViewerDashboard() {
  const { bookings, loading } = useBookings();
  const [search, setSearch] = useState('');

  const filteredBookings = bookings.filter(b =>
    b.customerName.toLowerCase().includes(search.toLowerCase()) ||
    b.mobileNumber.includes(search) ||
    b.id.includes(search)
  );

  return (
    <div className="space-y-8">
      <Routes>
        <Route path="/" element={
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-serif italic tracking-tight text-stone-900">Bookings Ledger</h2>
                <p className="text-sm text-stone-500 mt-1 uppercase tracking-widest">Read-Only Access</p>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm border border-stone-200">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search bookings by name,mobile or bill number..."
                  className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-stone-50 border-bottom border-stone-200">
                      <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Bill #</th>
                      <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Customer</th>
                      <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Hall / Dates</th>
                      <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Paid</th>
                      <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6}>
                          <Loader text="Fetching bookings..." />
                        </td>
                      </tr>
                    ) : filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic text-sm">No bookings found.</td>
                      </tr>
                    ) : (
                      filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-stone-500">{booking.id.slice(0, 8)}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-stone-900">{booking.customerName}</p>
                            <p className="text-xs text-stone-500">{booking.mobileNumber}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-stone-900">{booking.hallName}</p>
                            <p className="text-xs text-stone-500">
                              {format(new Date(booking.fromDate), 'MMM d')} - {format(new Date(booking.toDate), 'MMM d, yyyy')}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-stone-900">₹{booking.netAmount.toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-stone-900">₹{booking.paidAmount.toLocaleString()}</p>
                            <p className="text-xs text-amber-600">Pending: ₹{(booking.netAmount - booking.paidAmount).toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-tighter ${booking.status === 'complete' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        } />
        <Route path="/logs" element={<AuditLogs />} />
      </Routes>
    </div>
  );
}
