import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.FINTOC_API_KEY;
if (!apiKey) {
    console.log('No key');
    process.exit(1);
}

const getMovements = async () => {
    try {
        const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
        const { data } = await supabase.from('conexiones_bancarias').select('link_token').order('created_at', { ascending: false }).limit(1);

        if (!data || data.length === 0) {
            console.log("No link token found");
            return;
        }
        const linkToken = data[0].link_token;
        console.log('Got link token');

        const accountsRes = await axios.get('https://api.fintoc.com/v1/accounts', {
            headers: { Authorization: apiKey },
            params: { link_token: linkToken }
        });

        const accountId = accountsRes.data[0].id;
        console.log('Got account:', accountId);

        // Fetch recent movements
        const movsRes = await axios.get(`https://api.fintoc.com/v1/accounts/${accountId}/movements`, {
            headers: { Authorization: apiKey },
            params: { link_token: linkToken, per_page: 5 }
        });
        console.log('Recent 5 movements:');
        movsRes.data.forEach((m) => {
            console.log(`- ${m.post_date} | ${m.description} | ${m.amount}`);
        });
    } catch (e) {
        console.error("Error:", e.message, e.response?.data);
    }
}
getMovements();
