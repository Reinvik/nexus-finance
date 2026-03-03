import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTIONS = `
Eres un asistente de clasificación financiera automatizada. Recibirás los datos de una transacción bancaria en formato JSON. Tu objetivo es analizar la descripción, el monto y el tipo de movimiento para asignar una "categoría" y un "estado" basándote ESTRICTAMENTE en las reglas de categorización.

También debes considerar las INSTRUCCIONES PERSONALIZADAS del usuario que se te proporcionarán.
`;

export interface AISettings {
  custom_instructions: string;
}

export interface Transaction {
  id: string;
  descripcion: string;
  monto: number;
  tipo: 'abono' | 'cargo';
  fecha: string;
}

export type Bucket503020 = 'Necesidades' | 'Deseos' | 'Ahorro' | 'Ingreso' | 'Ignorar';
export type Jar6 = 'Necesidades' | 'Ahorro LP' | 'Educación' | 'Diversión' | 'Libertad Fin.' | 'Donaciones' | 'Ingreso' | 'Ignorar';

export interface CategoryConfig {
  name: string;
  bucket: Bucket503020;
  jar: Jar6;
}

export interface ClassificationResult {
  categoria_asignada: string;
  estado_revision: 'oficial' | 'pendiente';
  razonamiento_breve: string;
}

export interface ClassificationHistory {
  descripcion: string;
  categoria: string;
}

export async function classifyTransaction(
  transaction: Transaction,
  availableCategories: CategoryConfig[],
  history: ClassificationHistory[],
  customInstructions?: string
): Promise<ClassificationResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });

  const categoryNames = availableCategories.map(c => c.name).join(', ');

  const historyText = history.length > 0
    ? `HISTORIAL DE APRENDIZAJE DEL USUARIO:\nEl usuario ya ha clasificado transacciones similares así en el pasado. PRIVILEGIA ESTAS REGLAS por sobre las reglas estándar si hay coincidencias:\n${history.map(h => `- "${h.descripcion}" -> ${h.categoria}`).join('\n')}\n`
    : '';

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        text: `${SYSTEM_INSTRUCTIONS}
        
CATEGORÍAS DISPONIBLES OBLIGATORIAS:
Debes escoger EXACTAMENTE UNA de estas categorías, no inventes nuevas: 
[${categoryNames}]

${historyText}

INSTRUCCIONES PERSONALIZADAS DEL USUARIO:
${customInstructions || 'Sin instrucciones adicionales.'}

Transacción a analizar:
${JSON.stringify({
          descripcion: transaction.descripcion,
          monto: transaction.monto,
          tipo: transaction.tipo
        })}`
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          categoria_asignada: { type: Type.STRING },
          estado_revision: { type: Type.STRING },
          razonamiento_breve: { type: Type.STRING }
        },
        required: ["categoria_asignada", "estado_revision", "razonamiento_breve"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  return JSON.parse(text) as ClassificationResult;
}

export interface SavingsRecommendation {
  titulo: string;
  descripcion: string;
  ahorro_estimado: string;
}

export async function getAIRecommendations(transactions: Transaction[]): Promise<SavingsRecommendation[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        text: `Analiza las siguientes transacciones financieras. Tu objetivo es sugerir 3 estrategias específicas para PROTEGER y HACER CRECER los ahorros exclusivamente a través de la reducción de gastos y la optimización del presupuesto. NO sugieras inversiones.
        
        Enfócate en:
        1. Identificar fugas de dinero (gastos hormiga).
        2. Sugerir recortes en categorías no esenciales.
        3. Proponer metas de ahorro basadas en el comportamiento actual.
        
        Transacciones:
        ${JSON.stringify(transactions.map(t => ({ desc: t.descripcion, monto: t.monto, tipo: t.tipo })))}
        
        Devuelve la respuesta en formato JSON con un array de objetos que tengan las claves: "titulo", "descripcion", "ahorro_estimado".`
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            descripcion: { type: Type.STRING },
            ahorro_estimado: { type: Type.STRING }
          },
          required: ["titulo", "descripcion", "ahorro_estimado"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];

  return JSON.parse(text) as SavingsRecommendation[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const AI_SETTINGS_KEY = 'nexus_ai_instructions';

export function getAISettings(): AISettings {
  const saved = localStorage.getItem(AI_SETTINGS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return {
    custom_instructions: "Eres Nexus AI, un experto en finanzas personales. Ayuda al usuario a categorizar y optimizar sus gastos."
  };
}

export function updateAISettings(settings: AISettings) {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

export async function chatWithAI(
  prompt: string,
  context: {
    transactions: Transaction[];
    categories: CategoryConfig[];
    history: ClassificationHistory[];
    customInstructions: string;
  },
  chatHistory: ChatMessage[] = []
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `
    Eres Nexus AI, un asistente financiero experto.
    
    CONTEXTO ACTUAL:
    - Categorías configuradas: ${context.categories.map(c => c.name).join(', ')}
    - Instrucciones actuales de aprendizaje: ${context.customInstructions || 'Ninguna'}
    - El usuario tiene ${context.transactions.length} transacciones en el periodo actual.
    
    Capacidades:
    1. Sugiere reclasificaciones si detectas errores.
    2. Ayuda al usuario a definir nuevas reglas de categorización.
    3. Analiza gastos para optimizar el ahorro.
    
    REGLA: Si el usuario te da una regla nueva (Ej: "Pon DIDI en Transporte"), confírmala y explícitamente dile que ahora la has aprendido.
  `;

  const previousMessages = chatHistory.map(m =>
    `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.parts[0].text}`
  ).join('\n');

  const fullPrompt = `${systemPrompt}\n\n${previousMessages}\nUsuario: ${prompt}\nAsistente:`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text: fullPrompt }] }]
  });

  return response.text;
}

