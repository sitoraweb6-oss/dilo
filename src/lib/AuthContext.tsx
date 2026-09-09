import React from "react";
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

export const hasPermission = (user: UserProfile | null, permission: string): boolean => {
  if (!user) return false;
  if (user.permissions && Array.isArray(user.permissions)) {
    if (permission === 'admin' && user.permissions.includes('super_admin')) return true;
    if (permission === 'member') return true; // Always a member
    return user.permissions.includes(permission);
  }
  const role = String(user.role).toLowerCase();
  if (permission === 'admin' && (role === 'admin' || role === 'super_admin')) return true;
  if (permission === 'super_admin' && role === 'super_admin') return true;
  if (permission === 'member') return true;
  return false;
};

interface AuthContextType {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  pinVerified: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setPinVerified: (verified: boolean) => void;
  refreshProfile: () => Promise<void>;
  updateUserProfileLocal: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const isAdmin = hasPermission(userProfile, 'admin');
  const isSuperAdmin = hasPermission(userProfile, 'super_admin');
  const [loading, setLoading] = useState(true);
  const [pinVerified, setPinVerified] = useState(false);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      } else {
        setUserProfile(null);
      }
    } catch (error: any) {
      if (error.message?.includes('Quota') || error.message?.includes('resource-exhausted') || error.code === 'resource-exhausted') {
        window.dispatchEvent(new CustomEvent('quota_exceeded'));
      }
      console.warn("Warning fetching user profile:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchProfile(user.uid);
      } else {
        setUserProfile(null);
        setPinVerified(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google sign in error", error);
      throw error;
    }
  };

  const logout = async () => {
    setPinVerified(false);
    await signOut(auth);
  };

  const updateUserProfileLocal = (updates: Partial<UserProfile>) => {
    setUserProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      await fetchProfile(firebaseUser.uid);
    }
  };

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      userProfile,
      isAdmin,
      isSuperAdmin,
      loading,
      pinVerified,
      signInWithGoogle,
      logout,
      setPinVerified,
      refreshProfile,
      updateUserProfileLocal
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
