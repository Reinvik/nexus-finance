import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const userId = '00000000-0000-0000-0000-000000000000';
  const { data: connections } = await supabase.from('conexiones_bancarias').select('link_token').order('created_at', { ascending: false }).limit(1);
  if (!connections || !connections.length) return console.log('No token');

  const linkToken = connections[0].link_token;
  console.log('Got link token:', linkToken);

  const accountsRes = await axios.get('https://api.fintoc.com/v1/accounts', { headers: { Authorization: FINTOC_SECRET_KEY }, params: { link_token: linkToken } });
  const accounts = accountsRes.data;

  if (!accounts || accounts.length === 0) return console.log('No accounts');

  for (const account of accounts) {
    console.log('Fetching for account', account.id);
    const params = { link_token: linkToken, per_page: 300, since: '2026-02-27' };
    const movementsRes = await axios.get(`https://api.fintoc.com/v1/accounts/${account.id}/movements`, { headers: { Authorization: FINTOC_SECRET_KEY }, params });

    console.log(`Movements for ${account.id}:`, movementsRes.data.length);
    movementsRes.data.slice(0, 5).forEach((m) => {
      console.log('Movement:', m.post_date, m.description, m.amount);
    });
  }
}
test();
