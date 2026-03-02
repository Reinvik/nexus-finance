// Minimal diagnostic function - no external imports
export default function handler(req: any, res: any) {
    res.setHeader('Content-Type', 'application/json');
    res.json({
        status: 'ok',
        method: req.method,
        url: req.url,
        env: {
            FINTOC_API_KEY: process.env.FINTOC_API_KEY ? 'present (' + process.env.FINTOC_API_KEY.substring(0, 8) + '...)' : 'MISSING',
            VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'MISSING',
            APP_URL: process.env.APP_URL || 'MISSING',
            NODE_VERSION: process.version
        }
    });
}
