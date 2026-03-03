import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { data, error } = await supabase.from('transacciones').select('id, fecha').gte('fecha', '2026-01-01').lte('fecha', '2026-01-31');
console.log('Total transactions in January right now:', data ? data.length : 0);
