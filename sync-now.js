import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY;
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const userId = '00000000-0000-0000-0000-000000000000';
const linkId = 'link_8Y0GD4i3bPyZG2be';

async function sync() {
  console.log('Fetching accounts with link_token:', linkId);
  const accountsRes = await axios.get('https://api.fintoc.com/v1/accounts', {
    headers: { Authorization: FINTOC_SECRET_KEY },
    params: { link_token: linkId }
  });
  console.log('Accounts:', accountsRes.data.map(a => ({ id: a.id, name: a.name })));

  for (const account of accountsRes.data) {
    const movRes = await axios.get('https://api.fintoc.com/v1/accounts/' + account.id + '/movements', {
      headers: { Authorization: FINTOC_SECRET_KEY },
      params: { link_token: linkId, per_page: 300 }
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
    else console.log('Synced', rows.length, 'transactions');
  }
}
sync();
