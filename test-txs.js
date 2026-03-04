import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data: cols } = await supabase.from('conexiones_bancarias').select('*').limit(5);
  console.log('Connections:', cols);
  
  const { data: txs } = await supabase.from('transacciones').select('id').limit(5);
  console.log('Transactions count:', txs?.length || 0);
}
test();
