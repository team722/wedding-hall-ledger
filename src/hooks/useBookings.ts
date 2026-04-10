import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, FirestoreError } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking } from '../types';

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    
    setLoading(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Booking));
        setBookings(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching bookings:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { bookings, loading, error };
}
