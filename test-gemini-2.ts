
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function testGemini() {
    const geminiKey = process.env.VITE_GEMINI_API_KEY;
    if (!geminiKey) {
        console.log('❌ VITE_GEMINI_API_KEY not found in .env');
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        console.log('Testing gemini-2.0-flash...');
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ text: "Hola, ¿estás operativo?" }]
        });
        console.log('✅ Gemini 2.0 Flash Connection: Success');
        console.log('Response:', response.text?.trim());
    } catch (e: any) {
        console.log('❌ Gemini 2.0 Flash Failed:', e.message);
    }
}

testGemini();
