/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://juubntufqlogakwfvqwh.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyb2xlIjoiYW5vbiJ9').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[ManuX] Supabase URL or Anon Key is missing. Check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Health check helper to test connection status to the Supabase instance
 */
export async function checkSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase.from('categories').select('count', { count: 'exact', head: true });
    if (error) {
      // If table does not exist yet (before SQL migration), the client is still connecting to Supabase
      if (error.code === '42P01') {
        return { ok: true, message: 'Connecté à Supabase. Les tables doivent être créées via la migration SQL.' };
      }
      return { ok: false, message: error.message };
    }
    return { ok: true, message: 'Connexion Supabase active et vérifiée.' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Erreur inconnue de connexion' };
  }
}
