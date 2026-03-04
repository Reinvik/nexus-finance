import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY;
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const userId = '00000000-0000-0000-0000-000000000000';
const linkToken = 'link_8Y0GD4i3bPyZG2be_token_oeSa-WFy5Jn7HZs5zZhLY81W';
const accountId = 'acc_5pqWKkbTBLXmoaOV';

async function syncAll() {
  let totalSynced = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await axios.get('https://api.fintoc.com/v1/accounts/' + accountId + '/movements', {
      headers: { Authorization: FINTOC_SECRET_KEY },
      params: { link_token: linkToken, per_page: 300, page }
    });
    const movements = res.data;
    if (!movements || movements.length === 0) break;

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
    if (error) console.error('Page', page, 'error:', error.message);
    else {
      totalSynced += rows.length;
      console.log('Page', page, ': synced', rows.length, 'movements. Total so far:', totalSynced);
    }

    if (movements.length < 300) hasMore = false;
    else page++;
  }
  console.log('Done. Total synced:', totalSynced);
}
syncAll();
