import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

try {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ text: 'Hola' }]
  });
  console.log('SUCCESS:', response.text);
} catch (e) {
  console.log('ERROR 1:', e.message);
}
