import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AuditLog } from '../types';
import { format } from 'date-fns';
import { safeParseDate } from '../lib/dateUtils';
import { History, User, Clock, FileText } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'finance' | 'activity'>('all');

  useEffect(() => {
    let q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
      setLogs(data);
      setLoading(false);
    }, (error) => {
      console.error('Firestore Error in auditLogs listener:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLogs = activeCategory === 'all' 
    ? logs 
    : logs.filter(log => log.category === activeCategory);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif italic tracking-tight text-stone-900">Audit Logs</h2>
          <p className="text-sm text-stone-500 mt-1 uppercase tracking-widest">System Activity Tracking</p>
        </div>

        <div className="flex bg-stone-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeCategory === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setActiveCategory('finance')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeCategory === 'finance' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Finance
          </button>
          <button
            onClick={() => setActiveCategory('activity')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeCategory === 'activity' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Community
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="divide-y divide-stone-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-6 hover:bg-stone-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${
                    log.action === 'create' ? 'bg-emerald-50 text-emerald-600' :
                    log.action === 'update' ? 'bg-amber-50 text-amber-600' :
                    log.action === 'delete' ? 'bg-red-50 text-red-600' :
                    'bg-stone-50 text-stone-600'
                  }`}>
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-900 capitalize">
                        {log.action} {log.entityType}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                        log.category === 'finance' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.category}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Entity ID: <span className="font-mono">{log.entityId}</span>
                    </p>
                    
                    {log.action === 'transaction' && log.changes?.transaction && (
                      <div className="mt-2 p-3 bg-stone-100 rounded-lg text-xs text-stone-600 space-y-1">
                        <p>Type: <span className="font-medium uppercase tracking-tighter">{log.changes.transaction.type}</span></p>
                        <p>Amount: <span className="font-medium">₹{log.changes.transaction.amount.toLocaleString()}</span></p>
                        <p>New Status: <span className="font-medium uppercase tracking-tighter">{log.changes.newStatus}</span></p>
                      </div>
                    )}

                    {log.category === 'activity' && log.changes && (
                      <div className="mt-2 text-xs text-stone-600 italic">
                        {log.changes.title || log.changes.content || (log.changes.deleted ? 'Resource deleted' : '')}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-left sm:text-right space-y-2 sm:space-y-1 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-stone-100 sm:border-0 w-full sm:w-auto">
                  <div className="flex items-center sm:justify-end text-xs text-stone-500">
                    <User className="w-3 h-3 mr-2 sm:mr-1" />
                    {log.performedBy}
                  </div>
                  <div className="flex items-center sm:justify-end text-xs text-stone-400">
                    <Clock className="w-3 h-3 mr-2 sm:mr-1" />
                    {(() => {
                      const date = safeParseDate(log.timestamp);
                      return date ? format(date, 'MMM d, yyyy h:mm a') : 'Just now';
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredLogs.length === 0 && !loading && (
            <div className="p-12 text-center text-stone-400 italic">
              No activity logs found for this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
