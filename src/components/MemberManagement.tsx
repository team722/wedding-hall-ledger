import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from '../firebase';
import { UserProfile, UserStatus } from '../types';
import { useAuth } from '../auth';
import { User, Shield, ShieldAlert, ShieldCheck, Trash2, Search, Mail, Calendar, UserPlus, X, Loader2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { safeParseDate } from '../lib/dateUtils';
import { UserRole } from '../types'

export default function MemberManagement() {
  const { profile: adminProfile, isSuperAdmin, isAdmin } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'viewer' as UserRole
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; userId: string; userName: string } | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ isOpen: boolean; userId: string; userName: string; newStatus: UserStatus } | null>(null);

  useEffect(() => {
    const q = collection(db, 'users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
      setMembers(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const initiateUpdateStatus = (userId: string, userName: string, newStatus: UserStatus) => {
    setStatusConfirm({ isOpen: true, userId, userName, newStatus });
  };

  const confirmUpdateStatus = async () => {
    if (!statusConfirm) return;
    if (!isAdmin) {
      alert("Unauthorized: Only admins can perform this action.");
      return;
    }
    const { userId, newStatus } = statusConfirm;
    
    const targetUser = members.find(m => m.uid === userId);
    if (!targetUser) return;
    const canManage = targetUser.uid !== adminProfile?.uid && 
                      (isSuperAdmin || targetUser.role === 'viewer' || (targetUser.role === 'admin' && targetUser.createdBy === adminProfile?.uid)) && 
                      targetUser.role !== 'superadmin' && 
                      !targetUser.email.toLowerCase().includes('teamzevenstone');
    if (!canManage) {
      alert("Unauthorized: You do not have permission to manage this user.");
      setStatusConfirm(null);
      return;
    }

    setStatusConfirm(null);

    try {
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'update_status',
        entityType: 'user',
        entityId: userId,
        category: 'activity',
        changes: { newStatus },
        performedBy: adminProfile?.uid || requestAnimationFrame.toString(), // fallback to ensure field isn't undefined
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const initiateDeleteUser = (userId: string, userName: string) => {
    setDeleteConfirm({ isOpen: true, userId, userName });
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirm) return;
    if (!isAdmin) {
      alert("Unauthorized: Only admins can perform this action.");
      return;
    }
    const { userId } = deleteConfirm;

    const targetUser = members.find(m => m.uid === userId);
    if (!targetUser) return;
    const canManage = targetUser.uid !== adminProfile?.uid && 
                      (isSuperAdmin || targetUser.role === 'viewer' || (targetUser.role === 'admin' && targetUser.createdBy === adminProfile?.uid)) && 
                      targetUser.role !== 'superadmin' && 
                      !targetUser.email.toLowerCase().includes('teamzevenstone');
    if (!canManage) {
      alert("Unauthorized: You do not have permission to delete this user.");
      setDeleteConfirm(null);
      return;
    }

    setDeleteConfirm(null);

    try {
      await deleteDoc(doc(db, 'users', userId));

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'delete',
        entityType: 'user',
        entityId: userId,
        category: 'activity',
        changes: { deleted: true },
        performedBy: adminProfile?.uid || requestAnimationFrame.toString(),
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.displayName || !newUser.email || !newUser.password) return;
    if (!isAdmin) {
      alert("Unauthorized: Only admins can create users.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create user in secondary Firebase App to prevent logging out admin
      const secondaryApp = initializeApp(firebaseConfig, `SecondaryApp_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email.toLowerCase(), newUser.password);
      const newUid = userCredential.user.uid;

      await deleteApp(secondaryApp);

      const roleToSet = newUser.role === 'superadmin' ? 'viewer' : newUser.role;

      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        email: newUser.email.toLowerCase(),
        displayName: newUser.displayName,
        role: roleToSet,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: adminProfile?.uid || 'system',
      });

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'create',
        entityType: 'user',
        entityId: newUid,
        category: 'activity',
        changes: { email: newUser.email, role: newUser.role, displayName: newUser.displayName },
        performedBy: adminProfile?.uid || 'system',
        timestamp: serverTimestamp(),
      });

      setShowAddModal(false);
      setNewUser({ displayName: '', email: '', password: '', role: 'viewer' });
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(`Failed to create user: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    if (!isAdmin) {
      alert("Unauthorized: Only admins can update users.");
      return;
    }

    const canManage = editUser.uid !== adminProfile?.uid && 
                      (isSuperAdmin || editUser.role === 'viewer' || (editUser.role === 'admin' && editUser.createdBy === adminProfile?.uid)) && 
                      editUser.role !== 'superadmin' && 
                      !editUser.email.toLowerCase().includes('teamzevenstone');
    if (!canManage) {
      alert("Unauthorized: You do not have permission to edit this user.");
      setShowEditModal(false);
      setEditUser(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: any = {
        displayName: editUser.displayName,
        updatedAt: new Date().toISOString()
      };

      if (isAdmin) {
        updates.role = editUser.role === 'superadmin' ? 'viewer' : editUser.role;
      }

      await updateDoc(doc(db, 'users', editUser.uid), updates);

      // Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'update_role',
        entityType: 'user',
        entityId: editUser.uid,
        category: 'activity',
        changes: { role: editUser.role, displayName: editUser.displayName },
        performedBy: adminProfile?.uid || 'system',
        timestamp: serverTimestamp(),
      });

      setShowEditModal(false);
      setEditUser(null);
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(`Failed to update user: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateEditUser = (user: UserProfile) => {
    setEditUser(user);
    setShowEditModal(true);
  };

  const filteredMembers = members.filter(m => {
    // Hide superadmin accounts from non-superadmins
    if (!isSuperAdmin && (m.role === 'superadmin' || m.email.toLowerCase().includes('zevenstone'))) {
      return false;
    }
    return (
      m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) return <div className="p-8 text-center text-stone-500">Loading members...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif italic tracking-tight text-stone-900">Member Management</h2>
          <p className="text-sm text-stone-500 mt-1 uppercase tracking-widest">Control user access and permissions</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search members..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900/10 focus:outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center whitespace-nowrap justify-center px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all shadow-sm w-full sm:w-auto"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-stone-200">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-serif italic text-stone-900">Add New Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Display Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900/10 focus:outline-none"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900/10 focus:outline-none"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Password</label>
                <input
                  required
                  type="password"
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900/10 focus:outline-none"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Role</label>
                <select
                  className="w-full px-4 py-2 border border-stone-200 bg-stone-50 rounded-lg focus:ring-2 focus:ring-stone-900/10 focus:outline-none text-stone-900"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                >
                  <option value="viewer">Viewer (Read-only access)</option>
                  <option value="admin">Admin (Full management access)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <div key={member.uid} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${member.role === 'superadmin' ? 'bg-purple-900 text-white ring-2 ring-purple-100' :
                  member.role === 'admin' ? 'bg-stone-900 text-white' :
                    'bg-stone-100 text-stone-600'
                  }`}>
                  {member.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-stone-900">{member.displayName}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest ${member.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                    member.role === 'admin' ? 'bg-amber-100 text-amber-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                    {member.role}
                  </span>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${member.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                member.status === 'suspended' ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-600'
                }`}>
                {member.status === 'active' ? <ShieldCheck className="w-3 h-3" /> :
                  member.status === 'suspended' ? <ShieldAlert className="w-3 h-3" /> :
                    <Shield className="w-3 h-3" />}
                {member.status}
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center text-xs text-stone-500">
                <Mail className="w-3 h-3 mr-2" />
                {member.email}
              </div>
              <div className="flex items-center text-xs text-stone-500">
                <Calendar className="w-3 h-3 mr-2" />
                Joined {(() => {
                  const date = safeParseDate(member.createdAt);
                  return date ? format(date, 'MMM d, yyyy') : 'N/A';
                })()}
              </div>
            </div>

            {member.uid !== adminProfile?.uid && (isSuperAdmin || member.role === 'viewer' || (member.role === 'admin' && member.createdBy === adminProfile?.uid)) && member.role !== 'superadmin' && !member.email.toLowerCase().includes('teamzevenstone') && (
              <div className="flex items-center gap-2 pt-4 border-t border-stone-100">
                <button
                  onClick={() => initiateEditUser(member)}
                  className="p-2 text-stone-400 hover:text-blue-600 transition-colors mr-auto"
                  title="Edit User"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {member.status === 'active' ? (
                  <>
                    <button
                      onClick={() => initiateUpdateStatus(member.uid, member.displayName, 'suspended')}
                      className="flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => initiateUpdateStatus(member.uid, member.displayName, 'blocked')}
                      className="flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Block
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => initiateUpdateStatus(member.uid, member.displayName, 'active')}
                    className="flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Enable Account
                  </button>
                )}
                <button
                  onClick={() => initiateDeleteUser(member.uid, member.displayName)}
                  className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                  title="Remove User"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300">
          <User className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500">No members found matching your search.</p>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-stone-200">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-serif italic text-stone-900">Edit Member</h3>
              <button onClick={() => setShowEditModal(false)} className="text-stone-400 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Display Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900/10 focus:outline-none"
                  value={editUser.displayName}
                  onChange={(e) => setEditUser({ ...editUser, displayName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Email Address</label>
                <input
                  disabled
                  type="email"
                  className="w-full px-4 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-500 cursor-not-allowed"
                  value={editUser.email}
                  title="Email cannot be changed directly"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Role</label>
                <select
                  className="w-full px-4 py-2 border border-stone-200 bg-stone-50 rounded-lg focus:ring-2 focus:ring-stone-900/10 focus:outline-none text-stone-900"
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value as UserRole })}
                >
                  <option value="viewer">Viewer (Read-only access)</option>
                  <option value="admin">Admin (Full management access)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 flex flex-col pt-8 relative">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif italic text-stone-900 text-center mb-2">Confirm Delete</h3>
            <p className="text-stone-500 text-sm text-center mb-6">
              Are you sure you want to permanently remove <strong>{deleteConfirm.userName}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 px-4 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {statusConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 flex flex-col pt-8 relative">
            <button
              onClick={() => setStatusConfirm(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${statusConfirm.newStatus === 'active' ? 'bg-emerald-50 text-emerald-500' :
              statusConfirm.newStatus === 'suspended' ? 'bg-amber-50 text-amber-500' :
                'bg-red-50 text-red-500'
              }`}>
              {statusConfirm.newStatus === 'active' ? <ShieldCheck className="w-6 h-6" /> :
                statusConfirm.newStatus === 'suspended' ? <ShieldAlert className="w-6 h-6" /> :
                  <Shield className="w-6 h-6" />}
            </div>
            <h3 className="text-xl font-serif italic text-stone-900 text-center mb-2">
              Confirm {statusConfirm.newStatus === 'active' ? 'Enable' : statusConfirm.newStatus === 'suspended' ? 'Suspend' : 'Block'}
            </h3>
            <p className="text-stone-500 text-sm text-center mb-6">
              Are you sure you want to {statusConfirm.newStatus === 'active' ? 'enable' : statusConfirm.newStatus === 'suspended' ? 'suspend' : 'block'} <strong>{statusConfirm.userName}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStatusConfirm(null)}
                className="flex-1 py-2.5 px-4 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdateStatus}
                className={`flex-1 py-2.5 px-4 text-white font-medium rounded-xl transition-colors shadow-lg ${statusConfirm.newStatus === 'active' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' :
                  statusConfirm.newStatus === 'suspended' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' :
                    'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
