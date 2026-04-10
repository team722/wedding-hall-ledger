import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, DiscountType, BookingStatus } from '../types';
import { useAuth } from '../auth';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, X, MapPin, User, Clock, Plus, Phone, Calculator, Save, Loader2 } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isWithinInterval,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  endOfDay
} from 'date-fns';
import { safeParseDate } from '../lib/dateUtils';

export default function ViewerCalendar() {
  const { isAdmin, profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    mobileNumber: '',
    hallName: 'Grand Crystal Ballroom',
    totalAmount: 0,
    discountType: 'amount' as DiscountType,
    discountValue: 0,
    returnableAmount: 0,
    status: 'pending' as BookingStatus,
  });

  useEffect(() => {
    const q = query(collection(db, 'bookings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
      setLoading(false);
    }, (error) => {
      console.error('Firestore Error in bookings listener:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(b => {
      const start = safeParseDate(b.fromDate);
      const end = safeParseDate(b.toDate);
      if (!start || !end) return false;
      
      // Check if the booking overlaps with the given day
      // A booking overlaps if it starts on or before the end of the day
      // AND ends on or after the start of the day
      return start <= endOfDay(day) && end >= startOfDay(day);
    });
  };

  const getHallColor = (hallName: string) => {
    const colors: Record<string, { bg: string, text: string, border: string, dot: string }> = {
      'Grand Crystal Ballroom': { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-200', dot: 'bg-emerald-500' },
      'Royal Garden Suite': { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-200', dot: 'bg-amber-500' },
      'Emerald Lounge': { bg: 'bg-sky-100', text: 'text-sky-900', border: 'border-sky-200', dot: 'bg-sky-500' },
      'Sapphire Room': { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-200', dot: 'bg-indigo-500' },
      'Ruby Hall': { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-200', dot: 'bg-rose-500' },
      'Diamond Hall': { bg: 'bg-violet-100', text: 'text-violet-900', border: 'border-violet-200', dot: 'bg-violet-500' },
    };
    return colors[hallName] || { bg: 'bg-stone-100', text: 'text-stone-900', border: 'border-stone-200', dot: 'bg-stone-500' };
  };

  const calculateNet = () => {
    const { totalAmount, discountType, discountValue } = formData;
    if (discountType === 'percentage') {
      return totalAmount - (totalAmount * (discountValue / 100));
    }
    return totalAmount - discountValue;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    setIsSubmitting(true);

    try {
      const netAmount = calculateNet();
      const fromDate = setMinutes(setHours(selectedDate, 9), 0).toISOString();
      const toDate = setMinutes(setHours(selectedDate, 22), 0).toISOString();

      const bookingData = {
        ...formData,
        fromDate,
        toDate,
        netAmount,
        paidAmount: 0,
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString(),
      };

      const newBookingRef = await addDoc(collection(db, 'bookings'), bookingData);

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'create',
        entityType: 'booking',
        entityId: newBookingRef.id,
        category: 'finance',
        changes: { new: bookingData },
        performedBy: profile?.uid,
        timestamp: serverTimestamp(),
      });

      setShowBookingForm(false);
      setSelectedDate(null);
      setFormData({
        customerName: '',
        mobileNumber: '',
        hallName: 'Grand Crystal Ballroom',
        totalAmount: 0,
        discountType: 'amount',
        discountValue: 0,
        returnableAmount: 0,
        status: 'pending',
      });
    } catch (error) {
      console.error('Error creating booking:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif italic tracking-tight text-stone-900">Hall Availability</h2>
          <p className="text-sm text-stone-500 mt-1 uppercase tracking-widest">Live Calendar View</p>
        </div>
        <div className="flex items-center bg-white rounded-xl shadow-sm border border-stone-200 p-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-stone-50 rounded-lg transition-colors text-stone-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-6 py-2 font-serif italic text-lg text-stone-900 min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-stone-50 rounded-lg transition-colors text-stone-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-stone-400 py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const cloneDay = day;
        const dayBookings = getBookingsForDay(cloneDay).sort((a, b) => a.hallName.localeCompare(b.hallName));

        days.push(
          <div
            key={day.toString()}
            onClick={() => setSelectedDate(cloneDay)}
            className={`min-h-[120px] p-2 border border-stone-100 bg-white transition-all cursor-pointer hover:bg-stone-50/80 ${
              !isSameMonth(day, monthStart) ? 'bg-stone-50/50 text-stone-300' : 'text-stone-900'
            } ${dayBookings.length > 0 && isSameMonth(day, monthStart) ? 'bg-stone-50/40' : ''} ${isSameDay(day, new Date()) ? 'ring-2 ring-inset ring-stone-900/10' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'bg-stone-900 text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>
                {formattedDate}
              </span>
              {dayBookings.length > 0 && (
                <div className="flex gap-0.5">
                  {dayBookings.map(b => (
                    <div key={b.id} className={`w-1.5 h-1.5 rounded-full ${getHallColor(b.hallName).dot}`} />
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {dayBookings.map((b) => {
                const color = getHallColor(b.hallName);
                return (
                  <div
                    key={b.id}
                    className={`group relative px-2 py-1 text-[10px] font-bold rounded-full ${color.bg} ${color.text} border ${color.border} flex items-center gap-1.5 transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] truncate`}
                    title={`${b.customerName} - ${b.hallName}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      b.status === 'complete' ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]' : 'bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.4)]'
                    }`}></div>
                    <span className="truncate">{b.hallName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm">{rows}</div>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border border-stone-200">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin mb-4" />
        <p className="text-stone-500 font-serif italic">Loading calendar data...</p>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {renderHeader()}
      
      {bookings.length === 0 && isAdmin && (
        <div className="mb-8 bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-center justify-between">
          <div className="flex items-center text-amber-800">
            <Info className="w-6 h-6 mr-4" />
            <div>
              <p className="font-bold uppercase tracking-widest text-xs mb-1">Admin Notice</p>
              <p className="text-sm">The calendar is currently empty. You can seed sample data from the Management App to see how it looks.</p>
            </div>
          </div>
          <Link 
            to="/admin" 
            className="px-6 py-2 bg-amber-200 text-amber-900 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-300 transition-all"
          >
            Go to Admin
          </Link>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
        <div className="flex flex-wrap items-center gap-6 mb-6 text-xs text-stone-500 uppercase tracking-widest font-medium">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 mr-2 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
            </div>
            Crystal Ballroom
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-amber-100 border border-amber-200 mr-2 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
            </div>
            Garden Suite
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-sky-100 border border-sky-200 mr-2 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-sky-500 rounded-full"></div>
            </div>
            Emerald Lounge
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-indigo-100 border border-indigo-200 mr-2 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
            </div>
            Sapphire Room
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-rose-100 border border-rose-200 mr-2 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-rose-500 rounded-full"></div>
            </div>
            Ruby Hall
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-white border border-stone-100 mr-2 rounded-sm"></div>
            Available
          </div>
          <div className="flex items-center ml-auto">
            <Info className="w-4 h-4 mr-1 text-stone-400" />
            Click on a date to see details {isAdmin && "or add booking"}
          </div>
        </div>
        {renderDays()}
        {renderCells()}
      </div>

      {/* Booking Details Modal */}
      {selectedDate && !showBookingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-stone-200">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div>
                <h3 className="text-2xl font-serif italic text-stone-900">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </h3>
                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mt-1">Daily Schedule</p>
              </div>
              <button 
                onClick={() => setSelectedDate(null)}
                className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {getBookingsForDay(selectedDate).length > 0 ? (
                <div className="space-y-6">
                  {getBookingsForDay(selectedDate).map((booking) => {
                    const color = getHallColor(booking.hallName);
                    return (
                      <div key={booking.id} className={`${color.bg} p-5 rounded-2xl border border-stone-200 relative overflow-hidden group`}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${color.border.replace('border-', 'bg-')}`}></div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className={`text-lg font-serif italic ${color.text} mb-1`}>{booking.hallName}</h4>
                            <div className="flex items-center text-xs text-stone-500 uppercase tracking-widest">
                              <MapPin className="w-3 h-3 mr-1" />
                              Main Venue
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                            booking.status === 'complete' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {booking.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center text-sm text-stone-600">
                            <User className="w-4 h-4 mr-2 text-stone-400" />
                            <span className="font-medium">{booking.customerName}</span>
                          </div>
                          <div className="flex items-center text-sm text-stone-600">
                            <Clock className="w-4 h-4 mr-2 text-stone-400" />
                            <span>
                              {(() => {
                                const from = safeParseDate(booking.fromDate);
                                const to = safeParseDate(booking.toDate);
                                return `${from ? format(from, 'MMM d') : ''} - ${to ? format(to, 'MMM d') : ''}`;
                              })()}
                            </span>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center text-sm text-stone-600">
                              <Phone className="w-4 h-4 mr-2 text-stone-400" />
                              <span>{booking.mobileNumber}</span>
                            </div>
                          )}
                        </div>

                        {isAdmin && (
                          <div className="mt-4 pt-4 border-t border-stone-200/50 grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Total</p>
                              <p className="text-sm font-serif italic text-stone-900">₹{booking.netAmount.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Paid</p>
                              <p className="text-sm font-serif italic text-emerald-600">₹{booking.paidAmount.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Balance</p>
                              <p className="text-sm font-serif italic text-rose-600">₹{(booking.netAmount - booking.paidAmount).toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarIcon className="w-8 h-8 text-stone-200" />
                  </div>
                  <p className="text-stone-500 font-serif italic text-lg">No bookings for this date</p>
                  <p className="text-xs text-stone-400 uppercase tracking-widest mt-2">The hall is available for reservation</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-between gap-4">
              <button
                onClick={() => setSelectedDate(null)}
                className="px-6 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
              >
                Close
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="flex-1 flex items-center justify-center px-6 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Booking Form Modal */}
      {selectedDate && showBookingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-stone-200">
            <form onSubmit={handleBookingSubmit}>
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div>
                  <h3 className="text-2xl font-serif italic text-stone-900">New Booking</h3>
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mt-1">
                    For {format(selectedDate, 'MMMM d, yyyy')}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">Customer Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        required
                        type="text"
                        className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        placeholder="Full Name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        required
                        type="tel"
                        className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                        value={formData.mobileNumber}
                        onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                        placeholder="Contact Number"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-serif italic text-stone-500 uppercase tracking-widest">Select Hall</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {['Grand Crystal Ballroom', 'Royal Garden Suite', 'Emerald Lounge'].map((hall) => (
                      <button
                        key={hall}
                        type="button"
                        onClick={() => setFormData({ ...formData, hallName: hall })}
                        className={`px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
                          formData.hallName === hall 
                            ? 'bg-stone-900 text-white border-stone-900 shadow-md' 
                            : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        {hall}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <h4 className="text-xs font-serif italic text-stone-900 uppercase tracking-widest">Financials</h4>
                    <Calculator className="w-4 h-4 text-stone-400" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Total Amount</label>
                      <input
                        required
                        type="number"
                        className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none"
                        value={formData.totalAmount}
                        onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Discount</label>
                      <div className="flex">
                        <input
                          type="number"
                          className="w-full px-4 py-2 bg-white border border-stone-200 rounded-l-lg focus:outline-none"
                          value={formData.discountValue}
                          onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                        />
                        <select
                          className="bg-stone-100 border border-l-0 border-stone-200 rounded-r-lg px-2 text-[10px]"
                          value={formData.discountType}
                          onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
                        >
                          <option value="amount">₹</option>
                          <option value="percentage">%</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Returnable</label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none"
                        value={formData.returnableAmount}
                        onChange={(e) => setFormData({ ...formData, returnableAmount: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-widest">Net Payable</span>
                    <span className="text-2xl font-serif italic text-stone-900">₹{calculateNet().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="px-6 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center px-8 py-2 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-lg disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
