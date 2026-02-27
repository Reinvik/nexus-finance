import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
);

const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY || '';
const APP_URL = process.env.APP_URL || 'https://finance.nexusnetwork.cl';

async function syncTransactions(userId: string, linkToken: string) {
    const accountsRes = await axios.get(
        `https://api.fintoc.com/v1/links/${linkToken}/accounts`,
        { headers: { Authorization: FINTOC_SECRET_KEY } }
    );

    const accounts = accountsRes.data;
    if (!accounts || accounts.length === 0) return;

    let totalSynced = 0;
    for (const account of accounts) {
        const movementsRes = await axios.get(
            `https://api.fintoc.com/v1/links/${linkToken}/accounts/${account.id}/movements`,
            { headers: { Authorization: FINTOC_SECRET_KEY } }
        );

        const movements = movementsRes.data;
        if (!movements || movements.length === 0) continue;

        const dbTransactions = movements.map((m: any) => ({
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
            .upsert(dbTransactions, { onConflict: 'fintoc_id' });

        totalSynced += dbTransactions.length;
    }

    console.log(`[Sync] ${totalSynced} transactions synced`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // POST /api/fintoc/create-link-intent
    if (req.method === 'POST' && !req.url?.includes('webhook') && !req.url?.includes('sync')) {
        try {
            const webhookUrl = `${APP_URL}/api/fintoc/webhook`;
            const response = await axios.post(
                'https://api.fintoc.com/v1/link_intents',
                { product: 'movements', country: 'cl', holder_type: 'individual', webhook_url: webhookUrl },
                { headers: { Authorization: FINTOC_SECRET_KEY } }
            );
            return res.json({ widget_token: response.data.widget_token });
        } catch (e: any) {
            return res.status(500).json({ error: e.response?.data || e.message });
        }
    }

    // POST /api/fintoc/webhook
    if (req.method === 'POST' && req.url?.includes('webhook')) {
        try {
            const { link_token, holder_id } = req.body;
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
    if (req.method === 'GET' && req.url?.includes('sync')) {
        try {
            const userId = (req.query.userId as string) || '00000000-0000-0000-0000-000000000000';
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

    return res.status(405).json({ error: 'Method not allowed' });
}
