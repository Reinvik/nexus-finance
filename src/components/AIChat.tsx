import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, User, Loader2, MessageSquare, Save } from 'lucide-react';
import { chatWithAI, ChatMessage, Transaction, CategoryConfig, ClassificationHistory, getAISettings, updateAISettings } from '../services/geminiService';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: CategoryConfig[];
  history: ClassificationHistory[];
}

export const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose, transactions, categories, history }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [instructions, setInstructions] = useState(getAISettings().custom_instructions);
  const [showInstructions, setShowInstructions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithAI(input, {
        transactions,
        categories,
        history,
        customInstructions: instructions
      }, messages);

      setMessages(prev => [...prev, { role: 'model', parts: [{ text: response }] }]);

      // Check if the AI confirmed it learned a new rule
      if (response.toLowerCase().includes('aprendido') || response.toLowerCase().includes('regla')) {
        // AI detected a rule change.
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: 'Lo siento, hubo un error procesando tu mensaje.' }] }]);
    } finally {
      setLoading(false);
    }
  };

  const saveInstructions = () => {
    updateAISettings({ custom_instructions: instructions });
    setShowInstructions(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-bold text-sm">Nexus AI</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="p-1 hover:bg-white/10 rounded-md transition-colors"
                title="Reglas de Aprendizaje"
              >
                <Save className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Instructions Editor */}
          {showInstructions && (
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-900 animate-in slide-in-from-top">
              <p className="font-bold mb-2">Libro de Reglas (Instrucciones Personalizadas)</p>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full h-24 p-2 rounded-lg border border-indigo-200 mb-2 font-sans text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Escribe aquí las reglas que quieres que la IA recuerde..."
              />
              <button
                onClick={saveInstructions}
                className="w-full py-1.5 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition-colors"
              >
                Guardar Reglas
              </button>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-6">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-sm">¡Hola! Soy tu asistente Nexus AI.</p>
                <p className="text-xs mt-1">Dime cosas como: 'Siempre pon DIDI en transporte' o 'Clasifica los últimos movimientos'.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-100'
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                  <div className="flex items-center gap-2 mb-1 opacity-70">
                    {m.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-indigo-600" />}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{m.role === 'user' ? 'Tú' : 'Nexus AI'}</span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.parts[0].text}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe un mensaje..."
                className="flex-1 h-10 px-4 bg-slate-50 rounded-full border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
