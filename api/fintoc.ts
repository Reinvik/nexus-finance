import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY || '';
const APP_URL = process.env.APP_URL || 'https://finance.nexusnetwork.cl';

// Diagnose missing env vars early
console.log('[api/fintoc] FINTOC_API_KEY present:', !!FINTOC_SECRET_KEY);
console.log('[api/fintoc] SUPABASE_URL present:', !!SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncTransactions(userId: string, linkToken: string) {
    try {
        // Correct Fintoc API format: secret_key as Authorization, link_token as query param
        const accountsRes = await axios.get(
            'https://api.fintoc.com/v1/accounts',
            { headers: { Authorization: FINTOC_SECRET_KEY }, params: { link_token: linkToken } }
        );

        const accounts = accountsRes.data;
        if (!accounts || accounts.length === 0) return;

        let totalSynced = 0;
        for (const account of accounts) {
            const movementsRes = await axios.get(
                `https://api.fintoc.com/v1/accounts/${account.id}/movements`,
                { headers: { Authorization: FINTOC_SECRET_KEY }, params: { link_token: linkToken, per_page: 300 } }
            );

            const movements = movementsRes.data;
            if (!movements || movements.length === 0) continue;

            const dbRows = movements.map((m: any) => ({
                user_id: userId,
                fintoc_id: m.id,
                descripcion: m.description || 'Sin descripción',
                monto: Math.abs(m.amount),
                tipo: m.amount > 0 ? 'abono' : 'cargo',
                fecha: m.post_date ? m.post_date.split('T')[0] : new Date().toISOString().split('T')[0],
                estado_revision: 'pendiente'
            }));

            await supabase
                .from('transacciones')
                .upsert(dbRows, { onConflict: 'fintoc_id' });

            totalSynced += dbRows.length;
        }

        console.log(`[Sync] ${totalSynced} transactions synced`);
    } catch (e: any) {
        console.error('[Sync Error]', e.response?.data || e.message);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set JSON header always
    res.setHeader('Content-Type', 'application/json');

    const url = req.url || '';
    const method = req.method || '';

    // POST /api/fintoc/create-link-intent  (routed to /api/fintoc)
    if (method === 'POST' && !url.includes('webhook') && !url.includes('sync')) {
        if (!FINTOC_SECRET_KEY) {
            return res.status(500).json({ error: 'FINTOC_API_KEY not configured in Vercel env vars' });
        }
        try {
            const webhookUrl = `${APP_URL}/api/fintoc/webhook`;
            const response = await axios.post(
                'https://api.fintoc.com/v1/link_intents',
                { product: 'movements', country: 'cl', holder_type: 'individual', webhook_url: webhookUrl },
                { headers: { Authorization: FINTOC_SECRET_KEY } }
            );
            return res.json({ widget_token: response.data.widget_token });
        } catch (e: any) {
            console.error('[link_intent error]', e.response?.data || e.message);
            return res.status(500).json({ error: e.response?.data || e.message });
        }
    }

    // POST /api/fintoc/webhook
    if (method === 'POST' && url.includes('webhook')) {
        try {
            const { link_token, holder_id } = req.body || {};
            if (!link_token) return res.status(400).json({ error: 'Missing link_token' });

            const userId = '00000000-0000-0000-0000-000000000000';
            await supabase.from('conexiones_bancarias').upsert([{
                user_id: userId,
                link_token,
                institution: holder_id || 'unknown'
            }], { onConflict: 'link_token' });

            await syncTransactions(userId, link_token);
            return res.json({ received: true });
        } catch (e: any) {
            return res.status(500).json({ error: e.message });
        }
    }

    // GET /api/fintoc/sync
    if (method === 'GET' && url.includes('sync')) {
        try {
            const userId = (req.query?.userId as string) || '00000000-0000-0000-0000-000000000000';
            const { data: connections } = await supabase
                .from('conexiones_bancarias')
                .select('link_token')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (!connections || connections.length === 0) {
                return res.status(404).json({ error: 'No bank connection found' });
            }

            await syncTransactions(userId, connections[0].link_token);
            return res.json({ success: true });
        } catch (e: any) {
            return res.status(500).json({ error: e.message });
        }
    }

    // Health check GET /api/fintoc
    if (method === 'GET') {
        return res.json({
            status: 'ok',
            fintoc_key: FINTOC_SECRET_KEY ? 'present' : 'MISSING',
            supabase_url: SUPABASE_URL ? 'present' : 'MISSING'
        });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
