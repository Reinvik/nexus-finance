import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data } = await supabase.from('conexiones_bancarias').select('link_token').order('created_at', { ascending: false }).limit(1);
  if (!data || !data.length) return console.log('No token');
  const linkToken = data[0].link_token;

  const accountsRes = await axios.get('https://api.fintoc.com/v1/accounts', { headers: { Authorization: FINTOC_SECRET_KEY }, params: { link_token: linkToken } });
  const accountId = accountsRes.data[0].id;

  const movementsRes = await axios.get(`https://api.fintoc.com/v1/accounts/${accountId}/movements`, { headers: { Authorization: FINTOC_SECRET_KEY }, params: { link_token: linkToken, per_page: 15 } });

  console.log('Last 15 movements directly from API:');
  movementsRes.data.forEach((m) => {
    console.log(m.post_date, '|', m.description, '|', m.amount);
  });
}
test();
