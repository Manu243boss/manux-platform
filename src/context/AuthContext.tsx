import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { CacheService, CACHE_KEYS } from '../services/cacheService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isEmailVerified: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pre-load from local storage cache for zero-lag instant rendering
  const initialSession = CacheService.get<Session>(CACHE_KEYS.USER_SESSION);
  const initialUser = initialSession?.user ?? null;
  const initialProfile = initialUser ? CacheService.get<Profile>(CACHE_KEYS.USER_PROFILE(initialUser.id)) : null;

  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [loading, setLoading] = useState<boolean>(!initialProfile && !initialUser);

  // Compute email verification state with local persistence
  const checkEmailVerified = (currentUser: User | null): boolean => {
    if (!currentUser) return false;
    
    // OAuth Google accounts are verified by default
    const provider = currentUser.app_metadata?.provider;
    if (provider === 'google') return true;

    // Check localStorage cache first
    const isCachedVerified = localStorage.getItem(`manux_email_verified_${currentUser.id}`) === 'true';
    if (isCachedVerified) return true;

    // Check supabase user metadata
    const hasConfirmedAt = !!currentUser.email_confirmed_at;
    if (hasConfirmedAt) {
      try {
        localStorage.setItem(`manux_email_verified_${currentUser.id}`, 'true');
      } catch (e) {
        // Safe fallback
      }
      return true;
    }

    return false;
  };

  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(() => checkEmailVerified(initialUser));

  const syncAndFetchProfile = async (currentUser: User, force: boolean = false): Promise<Profile | null> => {
    const userId = currentUser.id;
    try {
      // 1. Fetch current profile from DB
      const { data: existingProfile, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const meta = currentUser.user_metadata || {};
      const googleAvatar = meta.avatar_url || meta.picture || null;
      const googleName = meta.full_name || meta.name || meta.preferred_username || null;
      const email = currentUser.email || null;

      let finalProfile: Profile | null = (existingProfile as Profile) || null;

      if (!existingProfile) {
        // Create initial profile with Google OAuth data
        const rawUsername = (googleName || email?.split('@')[0] || 'createur')
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '')
          .slice(0, 18);
        const uniqueSuffix = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) || 'pro';
        const uniqueUsername = `${rawUsername || 'createur'}_${uniqueSuffix}`;

        const newProfileData = {
          id: userId,
          email: email,
          username: uniqueUsername,
          display_name: googleName || email?.split('@')[0] || 'Créateur ManuX',
          avatar_url: googleAvatar,
          subscription_plan: 'free',
          status: 'draft',
          onboarding_completed: false,
          metadata: {
            provider: currentUser.app_metadata?.provider || 'email',
            google_picture: googleAvatar,
            google_name: googleName,
            email: email,
            created_via: 'manux_auth_sync',
          },
        };

        const { data: inserted, error: insertErr } = await supabase
          .from('profiles')
          .insert(newProfileData)
          .select()
          .single();

        if (!insertErr && inserted) {
          finalProfile = inserted as Profile;
        }
      } else {
        // Enrich existing profile if avatar or display_name was empty but Google provides them
        const updates: Record<string, any> = {};
        if (!existingProfile.avatar_url && googleAvatar) {
          updates.avatar_url = googleAvatar;
        }
        if ((!existingProfile.display_name || existingProfile.display_name === 'Nouveau Créateur') && googleName) {
          updates.display_name = googleName;
        }
        if (!existingProfile.metadata?.google_picture && googleAvatar) {
          updates.metadata = {
            ...(existingProfile.metadata || {}),
            google_picture: googleAvatar,
            google_name: googleName,
            email: email,
          };
        }

        if (Object.keys(updates).length > 0) {
          const { data: updated } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

          if (updated) finalProfile = updated as Profile;
        }
      }

      if (finalProfile) {
        CacheService.set(CACHE_KEYS.USER_PROFILE(userId), finalProfile, 15 * 60 * 1000);
        setProfile(finalProfile);
        if (finalProfile.onboarding_completed || finalProfile.status === 'published') {
          localStorage.setItem(`manux_onboarding_completed_${userId}`, 'true');
        }
      }

      return finalProfile;
    } catch (err) {
      console.error('[ManuX Auth] Error syncing user profile:', err);
      return null;
    }
  };

  const fetchProfile = async (userId: string, force: boolean = false) => {
    if (user) {
      await syncAndFetchProfile(user, force);
    } else {
      try {
        const data = await CacheService.getOrFetch<Profile | null>(
          CACHE_KEYS.USER_PROFILE(userId),
          async () => {
            const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
            return data as Profile;
          },
          15 * 60 * 1000,
          force
        );
        setProfile(data);
      } catch (err) {
        console.error('[ManuX Auth] Error fetching user profile:', err);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await syncAndFetchProfile(user, true);
    }
  };

  const resendVerificationEmail = async (): Promise<{ success: boolean; message: string }> => {
    if (!user?.email) {
      return { success: false, message: 'Aucune adresse e-mail associée à ce compte.' };
    }
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        return {
          success: false,
          message: 'Impossible de renvoyer le lien pour l\'instant. Veuillez patienter 60 secondes avant de réessayer.',
        };
      }

      return {
        success: true,
        message: `Un lien direct de confirmation a été renvoyé à ${user.email}. Vérifiez votre boîte de réception et vos spams.`,
      };
    } catch {
      return {
        success: false,
        message: 'Une erreur inattendue est survenue. Veuillez réessayer ultérieurement.',
      };
    }
  };

  useEffect(() => {
    // 1. Check current session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsEmailVerified(checkEmailVerified(currentUser));

      if (session) {
        CacheService.set(CACHE_KEYS.USER_SESSION, session, 60 * 60 * 1000);
      } else {
        CacheService.invalidate(CACHE_KEYS.USER_SESSION);
      }

      if (currentUser) {
        syncAndFetchProfile(currentUser).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);
      setIsEmailVerified(checkEmailVerified(currentUser));

      if (newSession) {
        CacheService.set(CACHE_KEYS.USER_SESSION, newSession, 60 * 60 * 1000);
      } else {
        CacheService.invalidate(CACHE_KEYS.USER_SESSION);
      }

      if (currentUser) {
        await syncAndFetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      if (user?.id) {
        CacheService.invalidate(CACHE_KEYS.USER_PROFILE(user.id));
      }
      CacheService.invalidate(CACHE_KEYS.USER_SESSION);
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsEmailVerified(false);
    } catch (err) {
      console.error('[ManuX Auth] Error signing out:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isEmailVerified,
        signOut,
        refreshProfile,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
