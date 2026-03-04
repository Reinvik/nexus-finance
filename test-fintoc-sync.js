import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.FINTOC_API_KEY;
if(!apiKey) { console.log('No key'); process.exit(1); }
const getMovements = async () => {
  try {
    // We need a link token, let's fetch it from DB first
    import { createClient } from '@supabase/supabase-js';
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const {data} = await supabase.from('conexiones_bancarias').select('link_token').limit(1);
    const linkToken = data[0].link_token;
    console.log('Got link token:', linkToken);
    
    const accountsRes = await axios.get('https://api.fintoc.com/v1/accounts', { headers: { Authorization: apiKey }, params: { link_token: linkToken } });
    const accountId = accountsRes.data[0].id;
    console.log('Got account:', accountId);
    
    const movsRes = await axios.get(\https://api.fintoc.com/v1/accounts/\/movements\, { headers: { Authorization: apiKey }, params: { link_token: linkToken, per_page: 5 } });
    console.log('Recent 5 movements:', movsRes.data.map(m => ({ date: m.post_date, desc: m.description, amt: m.amount })));
  } catch(e) { console.error(e.message, e.response?.data); }
}
getMovements();
