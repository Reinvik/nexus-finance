import React, { useState, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles } from 'lucide-react';
import {
  classifyTransaction,
  getAIRecommendations,
  Transaction,
  ClassificationResult,
  SavingsRecommendation
} from './services/geminiService';
import { Sidebar } from './components/Sidebar';
import { GrowthCenter } from './components/GrowthCenter';
import { TransactionsModule } from './components/TransactionsModule';
import { SavingsGuard } from './components/SavingsGuard';
import { supabase, DatabaseTransaction } from './services/supabaseClient';
import { getFintoc } from '@fintoc/fintoc-js';

const CATEGORIES = [
  "Sueldo", "Arriendo", "Ingreso Roberto Mella", "Cuentas Casa",
  "Supermercado (Comida)", "Gastos Chicos/Almacén", "Por Definir", "Entretenimiento"
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Usuario demo hasta implementar Auth real
const USER_ID = '00000000-0000-0000-0000-000000000000';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [classifications, setClassifications] = useState<Record<string, ClassificationResult | 'loading' | 'error'>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'dashboard' | 'transactions' | 'budgets'>('dashboard');
  const [recommendations, setRecommendations] = useState<SavingsRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [loadingFintoc, setLoadingFintoc] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingsGoal, setSavingsGoal] = useState(1000000);
  const [budgets, setBudgets] = useState<Record<string, number>>({
    "Cuentas Casa": 100000,
    "Supermercado (Comida)": 200000,
    "Gastos Chicos/Almacén": 50000,
    "Entretenimiento": 80000
  });

  React.useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('transacciones')
      .select('*')
      .eq('user_id', USER_ID)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error loading txs:', error.message, error.details, error.hint);
      return;
    }

    if (data) {
      const mapped = data.map((t: DatabaseTransaction) => ({
        id: t.id,
        descripcion: t.descripcion,
        monto: t.monto,
        tipo: t.tipo as 'abono' | 'cargo',
        fecha: t.fecha
      }));
      setTransactions(mapped);

      const loadedClassifications: Record<string, ClassificationResult> = {};
      data.forEach((t: DatabaseTransaction) => {
        if (t.categoria_asignada) {
          loadedClassifications[t.id] = {
            categoria_asignada: t.categoria_asignada,
            estado_revision: t.estado_revision as 'oficial' | 'pendiente',
            razonamiento_breve: t.razonamiento_breve || ''
          };
        }
      });
      setClassifications(loadedClassifications);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // FLUJO CORRECTO FINTOC MOVEMENTS:
  // 1. Backend crea link_intent → retorna widget_token
  // 2. Frontend abre widget con widget_token
  // 3. Fintoc envía link_token al webhook en finance.nexusnetwork.cl
  // ─────────────────────────────────────────────────────────────────
  const syncFintoc = async () => {
    setLoadingFintoc(true);
    try {
      // Paso 1: Pedir widget_token al backend
      const intentRes = await fetch('/api/fintoc/create-link-intent', { method: 'POST' });
      if (!intentRes.ok) {
        const errData = await intentRes.json();
        throw new Error(errData.error || 'No se pudo crear el link intent');
      }
      const { widget_token } = await intentRes.json();
      console.log('[Fintoc] widget_token recibido del backend');

      // Paso 2: Inicializar SDK con widget_token
      const fintoc = await getFintoc();
      if (!fintoc) throw new Error('Failed to load Fintoc SDK');

      const publicKey = import.meta.env.VITE_FINTOC_PUBLIC_KEY || '';

      const widget = fintoc.create({
        publicKey,
        widgetToken: widget_token,
        holderType: 'individual',
        product: 'movements',
        country: 'cl',
        onSuccess: async () => {
          // El link_token llega por webhook automáticamente al servidor.
          // Esperamos 4s para que el webhook procese y recargamos transacciones.
          alert('¡Conexión bancaria exitosa! Sincronizando transacciones...');
          setLoadingFintoc(false);
          setTimeout(async () => {
            await loadTransactions();
          }, 4000);
        },
        onExit: () => setLoadingFintoc(false)
      });

      widget.open();
    } catch (error: any) {
      console.error('[Fintoc] Error:', error);
      alert(`Error Fintoc: ${error.message}`);
      setLoadingFintoc(false);
    }
  };

  const handleClassify = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    setClassifications(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const result = await classifyTransaction(transaction);
      await supabase.from('transacciones').update({
        categoria_asignada: result.categoria_asignada,
        estado_revision: result.estado_revision,
        razonamiento_breve: result.razonamiento_breve
      }).eq('id', id);
      setClassifications(prev => ({ ...prev, [id]: result }));
    } catch (error) {
      setClassifications(prev => ({ ...prev, [id]: 'error' }));
    }
  };

  const handleManualClassify = async (id: string, category: string) => {
    const newClass: ClassificationResult = {
      categoria_asignada: category,
      estado_revision: 'oficial',
      razonamiento_breve: 'Modificado manualmente por el usuario'
    };
    await supabase.from('transacciones').update({
      categoria_asignada: newClass.categoria_asignada,
      estado_revision: newClass.estado_revision,
      razonamiento_breve: newClass.razonamiento_breve
    }).eq('id', id);
    setClassifications(prev => ({ ...prev, [id]: newClass }));
    setEditingId(null);
  };

  const handleClassifyAll = async () => {
    const unclassified = transactions.filter(t => !classifications[t.id] || classifications[t.id] === 'error');
    for (const t of unclassified) {
      await handleClassify(t.id);
    }
  };

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const recs = await getAIRecommendations(transactions);
      setRecommendations(recs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRecs(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t =>
      t.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.tipo === 'cargo') {
        const cat = typeof classifications[t.id] === 'object'
          ? (classifications[t.id] as ClassificationResult).categoria_asignada
          : 'Por Definir';
        data[cat] = (data[cat] || 0) + t.monto;
      }
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [transactions, classifications]);

  const budgetData = useMemo(() => {
    return Object.entries(budgets).map(([name, limit]) => {
      const spent = transactions
        .filter(t => t.tipo === 'cargo' && typeof classifications[t.id] === 'object' && (classifications[t.id] as ClassificationResult).categoria_asignada === name)
        .reduce((acc, t) => acc + t.monto, 0);
      return { name, spent, limit };
    });
  }, [transactions, classifications, budgets]);

  const totalSavings = useMemo(() => {
    const income = transactions.filter(t => t.tipo === 'abono').reduce((acc, t) => acc + t.monto, 0);
    const expenses = transactions.filter(t => t.tipo === 'cargo').reduce((acc, t) => acc + t.monto, 0);
    return income - expenses;
  }, [transactions]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar activeView={view} onViewChange={setView} />

      <main className="lg:ml-64 min-h-screen">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 px-6 flex items-center justify-between">
          <h2 className="text-lg font-bold capitalize">
            {view === 'dashboard' ? 'Centro de Crecimiento' : view === 'budgets' ? 'Protección de Ahorros' : 'Transacciones'}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={syncFintoc}
              disabled={loadingFintoc}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-full hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 disabled:opacity-60"
            >
              {loadingFintoc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {loadingFintoc ? 'Conectando...' : 'Conectar Banco (Fintoc)'}
            </button>
            <button
              onClick={handleClassifyAll}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              <RefreshCw className="w-4 h-4" />
              Clasificar Todo
            </button>
            <button
              onClick={fetchRecommendations}
              disabled={loadingRecs}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-full hover:bg-amber-600 transition-all shadow-md shadow-amber-100"
            >
              {loadingRecs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {recommendations.length > 0 ? 'Refrescar Estrategias' : 'Estrategias de Ahorro'}
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <GrowthCenter
                key="dashboard"
                totalSavings={totalSavings}
                savingsGoal={savingsGoal}
                chartData={chartData}
                budgetData={budgetData}
                recommendations={recommendations}
                colors={COLORS}
              />
            )}

            {view === 'transactions' && (
              <TransactionsModule
                key="transactions"
                transactions={filteredTransactions}
                classifications={classifications}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onClassify={handleClassify}
                onManualClassify={handleManualClassify}
                editingId={editingId}
                setEditingId={setEditingId}
                categories={CATEGORIES}
              />
            )}

            {view === 'budgets' && (
              <SavingsGuard
                key="budgets"
                savingsGoal={savingsGoal}
                onGoalChange={setSavingsGoal}
                budgets={budgets}
                onBudgetChange={(cat, limit) => setBudgets(prev => ({ ...prev, [cat]: limit }))}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
