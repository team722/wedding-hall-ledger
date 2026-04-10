import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, FirestoreError } from 'firebase/firestore';
import { db } from '../firebase';
import { AuditLog } from '../types';

export function useAuditLogs(maxLogs: number = 100) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'auditLogs'),
      orderBy('timestamp', 'desc'),
      limit(maxLogs)
    );

    setLoading(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
        setLogs(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching audit logs:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [maxLogs]);

  return { logs, loading, error };
}
