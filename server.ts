import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const FINTOC_SECRET_KEY = process.env.FINTOC_API_KEY || '';
const APP_URL = process.env.APP_URL || 'https://finance.nexusnetwork.cl';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ─────────────────────────────────────────────
  // NUEVO FLUJO: Crear Link Intent en el backend
  // El frontend llama a esto para obtener el widget_token
  // ─────────────────────────────────────────────
  app.post("/api/fintoc/create-link-intent", async (req, res) => {
    try {
      const webhookUrl = `${APP_URL}/api/fintoc/webhook`;
      const response = await axios.post(
        'https://api.fintoc.com/v1/link_intents',
        {
          product: 'movements',
          country: 'cl',
          holder_type: 'individual',
          webhook_url: webhookUrl
        },
        { headers: { Authorization: FINTOC_SECRET_KEY } }
      );
      const { widget_token, id } = response.data;
      console.log(`[Fintoc] Link Intent created: ${id} | Widget token: ${widget_token.substring(0, 20)}...`);
      res.json({ widget_token });
    } catch (e: any) {
      console.error('[Fintoc] Error creating link intent:', e.response?.data || e.message);
      res.status(500).json({ error: 'Failed to create link intent' });
    }
  });

  // ─────────────────────────────────────────────
  // WEBHOOK: Fintoc envía el link_token aquí
  // tras conexión bancaria exitosa del usuario
  // ─────────────────────────────────────────────
  app.post("/api/fintoc/webhook", async (req, res) => {
    try {
      const { link_token, holder_id } = req.body;
      console.log('[Fintoc Webhook] Received link_token for holder:', holder_id);

      if (!link_token) {
        return res.status(400).json({ error: 'Missing link_token in webhook payload' });
      }

      // Guardar conexión bancaria en Supabase
      // Usuario demo por ahora hasta implementar Auth
      const userId = '00000000-0000-0000-0000-000000000000';
      const { error: dbError } = await supabase.from('conexiones_bancarias').upsert([{
        user_id: userId,
        link_token,
        institution: holder_id || 'unknown'
      }], { onConflict: 'link_token' });

      if (dbError) {
        console.error('[Fintoc Webhook] DB Error:', dbError.message);
      }

      // Sincronizar transacciones
      await syncTransactions(userId, link_token);

      res.json({ received: true });
    } catch (e: any) {
      console.error('[Fintoc Webhook] Error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ─────────────────────────────────────────────
  // SYNC: Descargar transacciones de Fintoc
  // ─────────────────────────────────────────────
  async function syncTransactions(userId: string, linkToken: string) {
    try {
      // Obtener cuentas
      const accountsRes = await axios.get(
        `https://api.fintoc.com/v1/links/${linkToken}/accounts`,
        { headers: { Authorization: FINTOC_SECRET_KEY } }
      );

      const accounts = accountsRes.data;
      if (!accounts || accounts.length === 0) {
        console.log('[Fintoc Sync] No accounts found');
        return;
      }

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

        const { error } = await supabase
          .from('transacciones')
          .upsert(dbTransactions, { onConflict: 'fintoc_id' });

        if (error) {
          console.error('[Fintoc Sync] Upsert error:', error.message);
        } else {
          totalSynced += dbTransactions.length;
        }
      }

      console.log(`[Fintoc Sync] ✅ ${totalSynced} transactions synced for user ${userId}`);
    } catch (e: any) {
      console.error('[Fintoc Sync] Error:', e.response?.data || e.message);
    }
  }

  // ─────────────────────────────────────────────
  // MANUAL SYNC: Trigger manual desde el frontend
  // ─────────────────────────────────────────────
  app.get("/api/fintoc/sync", async (req, res) => {
    const userId = req.query.userId as string || '00000000-0000-0000-0000-000000000000';

    try {
      const { data: connections, error } = await supabase
        .from('conexiones_bancarias')
        .select('link_token')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !connections || connections.length === 0) {
        return res.status(404).json({ error: "No bank connection found for user" });
      }

      const linkToken = connections[0].link_token;
      await syncTransactions(userId, linkToken);
      res.json({ success: true });
    } catch (e: any) {
      console.error('[Manual Sync] Error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ─────────────────────────────────────────────
  // Vite dev server (SPA)
  // ─────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    // SPA fallback
    app.get("*", (_req, res) => {
      res.sendFile("dist/index.html", { root: process.cwd() });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📡 Fintoc webhook URL: ${APP_URL}/api/fintoc/webhook`);
  });
}

startServer();
