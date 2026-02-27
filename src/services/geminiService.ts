import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTIONS = `
Eres un asistente de clasificación financiera automatizada. Recibirás los datos de una transacción bancaria en formato JSON. Tu objetivo es analizar la descripción, el monto y el tipo de movimiento para asignar una "categoría" y un "estado" basándote ESTRICTAMENTE en las siguientes reglas:

REGLAS DE INGRESOS (Montos a favor):
1. Si la descripción menciona "Sueldo", "Remuneración" o "Pago de nómina", categorizar como "Sueldo".
2. Si la descripción menciona "Arriendo" o "Alquiler", categorizar como "Arriendo".
3. Si el remitente o la descripción menciona "Roberto Mella", categorizar como "Ingreso Roberto Mella".

REGLAS DE EGRESOS (Cargos o pagos):
4. Si la descripción menciona "Servipag", "Dividendo", "Luz", "Agua", "Enel", "Aguas Andinas" o "Isapre", categorizar como "Cuentas Casa".
5. Si la descripción menciona "Lider", "Walmart" o hipermercados, categorizar como "Supermercado (Comida)".
6. Si la descripción sugiere un comercio local, almacén de barrio, minimarket o kiosco, categorizar como "Gastos Chicos/Almacén".

REGLA DE EXCEPCIÓN Y CONTROL:
7. Si es una transferencia a un tercero o un comercio que NO calza con un 100% de seguridad en las reglas anteriores, debes categorizar OBLIGATORIAMENTE como "Por Definir".

REGLAS DE ESTADO DE REVISIÓN:
- Si la transacción calzó perfectamente en las reglas 1 a la 6, asigna el estado "oficial" (automatización completa).
- Si la transacción cayó en la regla 7 ("Por Definir"), asigna el estado "pendiente" (requiere revisión manual del usuario).

Devuelve tu respuesta ÚNICAMENTE en un formato JSON válido.
`;

export interface Transaction {
  id: string;
  descripcion: string;
  monto: number;
  tipo: 'abono' | 'cargo';
  fecha: string;
}

export interface ClassificationResult {
  categoria_asignada: string;
  estado_revision: 'oficial' | 'pendiente';
  razonamiento_breve: string;
}

export async function classifyTransaction(transaction: Transaction): Promise<ClassificationResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        text: `${SYSTEM_INSTRUCTIONS}\n\nTransacción a analizar:\n${JSON.stringify({
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
