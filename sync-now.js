import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY;
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const userId = '00000000-0000-0000-0000-000000000000';
// Full format token: link_id + _token_ + access_token
const linkToken = 'link_8Y0GD4i3bPyZG2be_token_oeSa-WFy5Jn7HZs5zZhLY81W';

async function sync() {
  // Save the correct token to DB first
  await supabase.from('conexiones_bancarias').upsert([{
    user_id: userId, link_token: linkToken, institution: 'cl_banco_estado'
  }], { onConflict: 'link_token' });
  console.log('Saved link_token to DB');

  const accountsRes = await axios.get('https://api.fintoc.com/v1/accounts', {
    headers: { Authorization: FINTOC_SECRET_KEY },
    params: { link_token: linkToken }
  });
  console.log('Accounts:', accountsRes.data.map(a => a.id));

  for (const account of accountsRes.data) {
    const movRes = await axios.get('https://api.fintoc.com/v1/accounts/' + account.id + '/movements', {
      headers: { Authorization: FINTOC_SECRET_KEY },
      params: { link_token: linkToken, per_page: 300 }
    });
    const movements = movRes.data;
    console.log('Movements for', account.id, ':', movements.length);
    if (!movements.length) continue;
    const rows = movements.map(m => ({
      user_id: userId,
      fintoc_id: m.id,
      descripcion: m.description || 'Sin descripción',
      monto: Math.abs(m.amount),
      tipo: m.amount > 0 ? 'abono' : 'cargo',
      fecha: m.post_date ? m.post_date.split('T')[0] : new Date().toISOString().split('T')[0],
      estado_revision: 'pendiente'
    }));
    const { error } = await supabase.from('transacciones').upsert(rows, { onConflict: 'fintoc_id' });
    if (error) console.error('Upsert error:', error);
    else console.log('Synced', rows.length, 'transactions for account', account.id);
  }
}
sync();
