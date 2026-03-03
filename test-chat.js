import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

try {
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ parts: [{ text: 'Hola' }] }]
  });
  console.log('SUCCESS:', response.text);
} catch (e) {
  console.log('ERROR 1:', e.message);
}

try {
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: 'Hola'
  });
  console.log('SUCCESS 2:', response.text);
} catch (e) {
  console.log('ERROR 2:', e.message);
}
