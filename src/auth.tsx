// @refresh reset
import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs, limit, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isViewer: boolean;
  isSuperAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch profile first, THEN update all state together to avoid
        // intermediate renders where user is set but profile is still null.
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            // Ensure status exists for existing users
            if (!data.status) {
              data.status = 'active';
            }
            setProfile(data);
          } else {
            // Check if a profile exists with this email (pre-created by admin)
            const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email?.toLowerCase()), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const existingDoc = querySnapshot.docs[0];
              const data = existingDoc.data() as UserProfile;

              // Create new doc with UID and migrate data
              const newProfile: UserProfile = {
                ...data,
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || data.displayName, // Prefer Google name if available
                status: data.status || 'active',
                createdAt: data.createdAt || new Date().toISOString(),
              };

              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
              await deleteDoc(existingDoc.ref);
              setProfile(newProfile);
            } else {
              // New user — create their profile
              const email = firebaseUser.email?.toLowerCase() || '';
              const isSuperAdminEmail = email.includes('teamzevenstone');
              const isDefaultAdmin = email === 'sarath@zevenstone.com' || isSuperAdminEmail;

              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: email,
                displayName: firebaseUser.displayName || '',
                role: isSuperAdminEmail ? 'superadmin' : (isDefaultAdmin ? 'admin' : 'viewer'),
                status: 'active',
                createdAt: new Date().toISOString(),
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                ...newProfile,
                createdAt: serverTimestamp(),
              });
              setProfile(newProfile);
            }
          }
        } catch (err) {
          console.error('Error fetching/creating user profile:', err);
          // Fallback for default admin if Firestore is failing
          if (firebaseUser.email?.toLowerCase() === 'sarath@zevenstone.com') {
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Admin',
              role: 'admin',
              status: 'active',
              createdAt: new Date().toISOString(),
            });
          } else {
            setProfile(null);
          }
        }
        // Set user AFTER profile is ready — prevents role-based redirect flicker
        setUser(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email?: string, password?: string) => {
    if (isLoggingIn) return;
    if (!email || !password) return;
    setIsLoggingIn(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Error during Sign-In:', error);
      alert(`Failed to sign in: ${error.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isSuperAdmin = profile?.role === 'superadmin' || (profile?.email?.toLowerCase().includes('teamzevenstone') ?? false);
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;
  const isViewer = profile?.role === 'viewer' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, isAdmin, isViewer, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
