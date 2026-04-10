import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, Transaction, AuditLog } from '../types';
import { useAuth } from '../auth';
import { Plus, Search, Filter, CreditCard, Edit2, Database, Loader2, Receipt, Calendar } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { safeParseDate } from '../lib/dateUtils';
import { useNavigate, Link } from 'react-router-dom';
import TransactionModal from '../components/TransactionModal';

export default function AdminDashboard() {
  const { profile, isAdmin } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const navigate = useNavigate();

  const handleSeedAllData = async () => {
    if (!profile || !isAdmin) return;
    if (!window.confirm('This will add sample bookings, news, posts, and documents to your database. Continue?')) return;
    
    setIsSeeding(true);
    try {
      // 1. Sample Bookings
      const sampleBookings = [
        {
          customerName: 'Rahul Sharma',
          mobileNumber: '9876543210',
          hallName: 'Grand Crystal Ballroom',
          fromDate: new Date().toISOString(),
          toDate: addDays(new Date(), 1).toISOString(),
          totalAmount: 150000,
          discountType: 'fixed',
          discountValue: 10000,
          netAmount: 140000,
          paidAmount: 50000,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          customerName: 'Priya Patel',
          mobileNumber: '9988776655',
          hallName: 'Royal Garden Suite',
          fromDate: addDays(new Date(), 3).toISOString(),
          toDate: addDays(new Date(), 4).toISOString(),
          totalAmount: 85000,
          discountType: 'percentage',
          discountValue: 5,
          netAmount: 80750,
          paidAmount: 80750,
          status: 'complete',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          customerName: 'Amit Verma',
          mobileNumber: '9123456789',
          hallName: 'Emerald Lounge',
          fromDate: addDays(new Date(), 7).toISOString(),
          toDate: addDays(new Date(), 7).toISOString(),
          totalAmount: 45000,
          discountType: 'fixed',
          discountValue: 0,
          netAmount: 45000,
          paidAmount: 20000,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          customerName: 'Suresh Raina',
          mobileNumber: '9000000001',
          hallName: 'Grand Crystal Ballroom',
          fromDate: addDays(new Date(), 10).toISOString(),
          toDate: addDays(new Date(), 12).toISOString(),
          totalAmount: 200000,
          discountType: 'fixed',
          discountValue: 20000,
          netAmount: 180000,
          paidAmount: 180000,
          status: 'complete',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          customerName: 'Anjali Gupta',
          mobileNumber: '9876501234',
          hallName: 'Sapphire Room',
          fromDate: addDays(new Date(), 15).toISOString(),
          toDate: addDays(new Date(), 15).toISOString(),
          totalAmount: 60000,
          discountType: 'fixed',
          discountValue: 5000,
          netAmount: 55000,
          paidAmount: 55000,
          status: 'complete',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          customerName: 'Vikram Singh',
          mobileNumber: '9812345678',
          hallName: 'Ruby Hall',
          fromDate: addDays(new Date(), 18).toISOString(),
          toDate: addDays(new Date(), 19).toISOString(),
          totalAmount: 120000,
          discountType: 'percentage',
          discountValue: 10,
          netAmount: 108000,
          paidAmount: 30000,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          customerName: 'Meera Reddy',
          mobileNumber: '9900112233',
          hallName: 'Emerald Lounge',
          fromDate: addDays(new Date(), 22).toISOString(),
          toDate: addDays(new Date(), 22).toISOString(),
          totalAmount: 40000,
          discountType: 'fixed',
          discountValue: 2000,
          netAmount: 38000,
          paidAmount: 38000,
          status: 'complete',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          customerName: 'Karan Malhotra',
          mobileNumber: '9888776655',
          hallName: 'Royal Garden Suite',
          fromDate: addDays(new Date(), 25).toISOString(),
          toDate: addDays(new Date(), 27).toISOString(),
          totalAmount: 180000,
          discountType: 'fixed',
          discountValue: 15000,
          netAmount: 165000,
          paidAmount: 100000,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          customerName: 'Sneha Kapoor',
          mobileNumber: '9777665544',
          hallName: 'Grand Crystal Ballroom',
          fromDate: addDays(new Date(), -5).toISOString(),
          toDate: addDays(new Date(), -4).toISOString(),
          totalAmount: 250000,
          discountType: 'fixed',
          discountValue: 25000,
          netAmount: 225000,
          paidAmount: 225000,
          status: 'complete',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          customerName: 'Rohan Deshmukh',
          mobileNumber: '9666554433',
          hallName: 'Sapphire Room',
          fromDate: addDays(new Date(), -10).toISOString(),
          toDate: addDays(new Date(), -10).toISOString(),
          totalAmount: 55000,
          discountType: 'percentage',
          discountValue: 0,
          netAmount: 55000,
          paidAmount: 55000,
          status: 'complete',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];

      // 2. Sample Posts
      const samplePosts = [
        {
          content: '<p>Welcome to our community hub! We are thrilled to host your special moments.</p>',
          authorId: profile.uid,
          authorName: profile.displayName || profile.email,
          createdAt: new Date().toISOString(),
          imageUrl: 'https://picsum.photos/seed/wedding1/800/600'
        },
        {
          content: '<p>Check out our new catering menu for the 2024 season!</p>',
          authorId: profile.uid,
          authorName: profile.displayName || profile.email,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          imageUrl: 'https://picsum.photos/seed/food/800/600'
        }
      ];

      // 3. Sample News
      const sampleNews = [
        {
          title: 'New Year Booking Discounts',
          content: '<p>Book your summer wedding before January 31st to receive a 15% discount on all hall rentals!</p>',
          authorId: profile.uid,
          createdAt: new Date().toISOString(),
          imageUrl: 'https://picsum.photos/seed/discount/800/600'
        }
      ];

      // 4. Sample Docs
      const sampleDocs = [
        {
          title: 'Wedding Planning Checklist',
          url: 'https://www.google.com',
          category: 'Resources',
          createdAt: new Date().toISOString(),
        },
        {
          title: 'Hall Terms & Conditions',
          url: 'https://www.google.com',
          category: 'Legal',
          createdAt: new Date().toISOString(),
        }
      ];

      // Execute all additions
      for (const b of sampleBookings) await addDoc(collection(db, 'bookings'), b);
      for (const p of samplePosts) await addDoc(collection(db, 'posts'), p);
      for (const n of sampleNews) await addDoc(collection(db, 'news'), n);
      for (const d of sampleDocs) await addDoc(collection(db, 'documents'), d);

      alert('Sample data seeded successfully! You can now view it in the Viewer App.');
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Failed to seed data. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredBookings = bookings.filter(b => 
    b.customerName.toLowerCase().includes(search.toLowerCase()) ||
    b.mobileNumber.includes(search) ||
    b.id.includes(search)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif italic tracking-tight text-stone-900">Management App</h2>
          <p className="text-sm text-stone-500 mt-1 uppercase tracking-widest">Financial Records & Operations</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleSeedAllData}
            disabled={isSeeding}
            className="flex items-center justify-center w-full sm:w-auto px-4 py-3 bg-stone-100 text-stone-600 rounded-xl font-medium hover:bg-stone-200 transition-all disabled:opacity-50"
          >
            {isSeeding ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Database className="w-5 h-5 mr-2" />}
            Seed Sample Data
          </button>
          <Link
            to="/admin/add"
            className="flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Booking
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-xs text-stone-500 uppercase tracking-widest mb-1">Total Bookings</p>
          <p className="text-3xl font-serif italic text-stone-900">{bookings.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-xs text-stone-500 uppercase tracking-widest mb-1">Total Revenue</p>
          <p className="text-3xl font-serif italic text-stone-900">
            ₹{bookings.reduce((acc, b) => acc + b.netAmount, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-xs text-stone-500 uppercase tracking-widest mb-1">Pending Payments</p>
          <p className="text-3xl font-serif italic text-stone-900 text-amber-600">
            ₹{bookings.reduce((acc, b) => acc + (b.netAmount - b.paidAmount), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 bg-white p-4 rounded-xl shadow-sm border border-stone-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name, mobile, or bill number..."
            className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center justify-center px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-lg transition-colors border border-stone-200 sm:border-none">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-stone-50 border-bottom border-stone-200">
              <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Bill #</th>
              <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Customer</th>
              <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Hall / Dates</th>
              <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Paid</th>
              <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-serif italic text-stone-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredBookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-stone-500">{booking.id.slice(0, 8)}</td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-stone-900">{booking.customerName}</p>
                  <p className="text-xs text-stone-500">{booking.mobileNumber}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-stone-900">{booking.hallName}</p>
                  <p className="text-xs text-stone-500">
                    {(() => {
                      const from = safeParseDate(booking.fromDate);
                      const to = safeParseDate(booking.toDate);
                      return `${from ? format(from, 'MMM d') : 'N/A'} - ${to ? format(to, 'MMM d, yyyy') : 'N/A'}`;
                    })()}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-stone-900">₹{booking.netAmount.toLocaleString()}</p>
                  {booking.discountValue > 0 && (
                    <p className="text-xs text-emerald-600">-{booking.discountType === 'percentage' ? `${booking.discountValue}%` : `₹${booking.discountValue}`}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-stone-900">₹{booking.paidAmount.toLocaleString()}</p>
                  <p className="text-xs text-amber-600">Pending: ₹{(booking.netAmount - booking.paidAmount).toLocaleString()}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-tighter ${
                    booking.status === 'complete' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowTransactionModal(true);
                      }}
                      className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                      title="Add Payment"
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/admin/edit/${booking.id}`)}
                      className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                      title="Edit Booking"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {showTransactionModal && selectedBooking && (
        <TransactionModal
          booking={bookings.find((b) => b.id === selectedBooking.id) || selectedBooking}
          onClose={() => {
            setShowTransactionModal(false);
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
}
