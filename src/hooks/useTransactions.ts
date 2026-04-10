import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, FirestoreError } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction } from '../types';

export function useTransactions(bookingId: string | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `bookings/${bookingId}/transactions`),
      orderBy('date', 'desc')
    );

    setLoading(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching transactions:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [bookingId]);

  return { transactions, loading, error };
}
