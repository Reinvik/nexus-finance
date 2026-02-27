import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://su-proyecto.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'su-clave-anon';

console.log('--- Supabase Config ---');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseAnonKey.length);
console.log('Key starts with:', supabaseAnonKey.substring(0, 10));

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
