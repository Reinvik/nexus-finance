import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncAllConnections() {
    // Get all bank connections stored in DB
    const { data: connections, error } = await supabase
        .from('conexiones_bancarias')
        .select('user_id, link_token')
        .not('link_token', 'eq', '[object Object]')
        .not('link_token', 'is', null);

    if (error || !connections || connections.length === 0) {
        console.log('[Cron] No connections to sync:', error?.message);
        return { synced: 0 };
    }

    let totalSynced = 0;
    for (const conn of connections) {
        const { user_id, link_token } = conn;
        try {
            console.log(`[Cron] Syncing user ${user_id}...`);

            // Get the latest transaction date for this user
            const { data: latestTx } = await supabase
                .from('transacciones')
                .select('fecha')
                .eq('user_id', user_id)
                .order('fecha', { ascending: false })
                .limit(1);

            let sinceParam = undefined;
            if (latestTx && latestTx.length > 0) {
                const lastDate = new Date(latestTx[0].fecha + 'T00:00:00Z');
                lastDate.setDate(lastDate.getDate() - 2); // 2-day overlap to avoid missing transactions
                sinceParam = lastDate.toISOString().split('T')[0];
            }

            const accountsRes = await axios.get('https://api.fintoc.com/v1/accounts', {
                headers: { Authorization: FINTOC_SECRET_KEY },
                params: { link_token }
            });

            const accounts = accountsRes.data;
            if (!accounts || accounts.length === 0) continue;

            for (const account of accounts) {
                const params: any = { link_token, per_page: 300 };
                if (sinceParam) params.since = sinceParam;

                const movementsRes = await axios.get(
                    `https://api.fintoc.com/v1/accounts/${account.id}/movements`,
                    { headers: { Authorization: FINTOC_SECRET_KEY }, params }
                );

                const movements = movementsRes.data;
                if (!movements || movements.length === 0) continue;

                const dbRows = movements.map((m: any) => ({
                    user_id,
                    fintoc_id: m.id,
                    descripcion: m.description || 'Sin descripción',
                    monto: Math.abs(m.amount),
                    tipo: m.amount > 0 ? 'abono' : 'cargo',
                    fecha: m.post_date ? m.post_date.split('T')[0] : new Date().toISOString().split('T')[0],
                    estado_revision: 'pendiente'
                }));

                const { error: upsertError } = await supabase
                    .from('transacciones')
                    .upsert(dbRows, { onConflict: 'fintoc_id' });

                if (upsertError) {
                    console.error(`[Cron] Upsert error for account ${account.id}:`, upsertError.message);
                } else {
                    totalSynced += dbRows.length;
                    console.log(`[Cron] Synced ${dbRows.length} movements for account ${account.id}`);
                }
            }
        } catch (e: any) {
            console.error(`[Cron] Error syncing user ${user_id}:`, e.response?.data || e.message);
        }
    }

    return { synced: totalSynced, connections: connections.length };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Verify this is called by Vercel Cron (or allow manual trigger)
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('[Cron] Starting daily bank sync...');
        const result = await syncAllConnections();
        console.log('[Cron] Daily sync complete:', result);
        return res.json({ ok: true, ...result, timestamp: new Date().toISOString() });
    } catch (e: any) {
        console.error('[Cron] Fatal error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
