
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function listModels() {
    const geminiKey = process.env.VITE_GEMINI_API_KEY;
    if (!geminiKey) return;

    try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const models = await ai.models.list();
        console.log('Available Models:', JSON.stringify(models.models?.map((m: any) => m.name), null, 2));
    } catch (e: any) {
        console.log('❌ Failed to list models:', e.message);
    }
}

listModels();
