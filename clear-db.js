import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function clearDB() {
    const userId = '00000000-0000-0000-0000-000000000000';

    // Borrar transacciones
    const { error: txError } = await supabase
        .from('transacciones')
        .delete()
        .eq('user_id', userId);

    if (txError) {
        console.error('Error deleting transactions:', txError);
    } else {
        console.log('Todas las transacciones históricas eliminadas.');
    }
}
clearDB();
