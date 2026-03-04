import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
  const { count } = await supabase.from('transacciones').select('*', { count: 'exact', head: true });
  console.log('Total transactions:', count);
  const { data } = await supabase.from('transacciones').select('fecha, descripcion, monto, user_id').order('fecha', { ascending: false }).limit(5);
  console.log('Last 5:', JSON.stringify(data, null, 2));
  const { data: conns } = await supabase.from('conexiones_bancarias').select('*');
  console.log('Connections:', JSON.stringify(conns, null, 2));
}
check();
