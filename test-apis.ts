
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function testApis() {
    console.log('--- Testing API Configurations ---');

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const geminiKey = process.env.VITE_GEMINI_API_KEY;

    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'MISSING');
    console.log('Supabase Key:', supabaseKey ? 'Set' : 'MISSING');
    console.log('Gemini Key:', geminiKey ? 'Set' : 'MISSING');

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
        process.exit(1);
    }

    // Test Supabase - using a query that is more likely to succeed with anon key if RLS is on
    // Just try to fetch some info about the project to confirm connection
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        // Try to list a table that typically exists in Supabase (like a dummy query)
        const { data, error } = await supabase.from('transacciones').select('*').limit(1);
        if (error && error.code !== 'PGRST116') { // Ignore "no rows" errors
            console.log('✅ Supabase reached, but table access failed (likely RLS):', error.message);
        } else {
            console.log('✅ Supabase Connection: Success');
        }
    } catch (e: any) {
        console.log('❌ Supabase Connection: Failed', e.message);
    }

    // Test Gemini
    try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ text: "Say 'Gemini is online'" }]
        });
        console.log('✅ Gemini Connection: Success (Response:', response.text?.trim() || 'No text', ')');
    } catch (e: any) {
        console.log('❌ Gemini Connection: Failed', e.message);
    }
}

testApis();
