import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

// Normalize URL: ensure it starts with https://
const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : rawUrl ? `https://${rawUrl}` : 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-key';

console.log('[Supabase] URL configured:', supabaseUrl.includes('placeholder') ? '❌ MISSING - set VITE_SUPABASE_URL in Vercel' : '✅ ' + supabaseUrl);
console.log('[Supabase] Key configured:', supabaseAnonKey.length > 20 ? '✅' : '❌ MISSING - set VITE_SUPABASE_ANON_KEY in Vercel');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DatabaseTransaction = {
    id: string;
    user_id: string;
    fintoc_id: string;
    descripcion: string;
    monto: number;
    tipo: 'abono' | 'cargo';
    fecha: string;
    categoria_asignada: string | null;
    estado_revision: string | null;
    razonamiento_breve: string | null;
    created_at?: string;
};
