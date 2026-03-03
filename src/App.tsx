import React, { useState, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles, Settings2 } from 'lucide-react';
import {
  classifyTransaction,
  getAIRecommendations,
  Transaction,
  ClassificationResult,
  SavingsRecommendation,
  CategoryConfig,
  ClassificationHistory
} from './services/geminiService';
import { getSalaryPeriods, getTransactionsForPeriod } from './services/periodService';
import { Sidebar } from './components/Sidebar';
import { GrowthCenter } from './components/GrowthCenter';
import { TransactionsModule } from './components/TransactionsModule';
import { SavingsGuard } from './components/SavingsGuard';
import { PeriodSelector } from './components/PeriodSelector';
import { CategoryManager } from './components/CategoryManager';
import { Login } from './components/Login';
import { supabase, DatabaseTransaction } from './services/supabaseClient';
import { getFintoc } from '@fintoc/fintoc-js';

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { name: "Sueldo", bucket: "Ingreso", jar: "Ingreso" },
  { name: "Arriendo", bucket: "Necesidades", jar: "Necesidades" },
  { name: "Ingreso Roberto Mella", bucket: "Ingreso", jar: "Ingreso" },
  { name: "Cuentas Casa", bucket: "Necesidades", jar: "Necesidades" },
  { name: "Supermercado (Comida)", bucket: "Necesidades", jar: "Necesidades" },
  { name: "Gastos Chicos/Almacén", bucket: "Deseos", jar: "Diversión" },
  { name: "Por Definir", bucket: "Ignorar", jar: "Ignorar" },
  { name: "Entretenimiento", bucket: "Deseos", jar: "Diversión" },
  { name: "Transporte", bucket: "Deseos", jar: "Diversión" },
  { name: "Ahorro Automático", bucket: "Ahorro", jar: "Ahorro LP" }
];

const STORAGE_KEY = 'nexus_categories';

function loadCategories(): CategoryConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // old array of strings migration
        if (typeof parsed[0] === 'string') {
          return parsed.map((name: string) => ({ name, bucket: 'Ignorar', jar: 'Ignorar' } as CategoryConfig));
        }
        // array of objects (CategoryConfig) validation
        if (typeof parsed[0] === 'object' && parsed[0] !== null && 'name' in parsed[0]) {
          return parsed as CategoryConfig[];
        }
      }
    }
  } catch (err) {
    console.error("Local storage categories parse error", err);
  }
  return DEFAULT_CATEGORIES;
}

function saveCategories(cats: CategoryConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const USER_ID = '00000000-0000-0000-0000-000000000000';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categories, setCategories] = useState<CategoryConfig[]>(loadCategories);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [classifications, setClassifications] = useState<Record<string, ClassificationResult | 'loading' | 'error'>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'dashboard' | 'transactions' | 'budgets'>('dashboard');
  const [recommendations, setRecommendations] = useState<SavingsRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [loadingFintoc, setLoadingFintoc] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(0);
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

  // ─── Compute salary-based periods ──────────────────────────────────
  const salaryPeriods = useMemo(
    () => getSalaryPeriods(transactions),
    [transactions]
  );

  // Auto-select the most recent period whenever periods change
  React.useEffect(() => {
    if (salaryPeriods.length > 0) {
      setSelectedPeriodIndex(salaryPeriods.length - 1);
    }
  }, [salaryPeriods.length]);

  const activePeriod = salaryPeriods[selectedPeriodIndex] ?? null;

  // Transactions scoped to the selected period
  const periodTransactions = useMemo(
    () => activePeriod ? getTransactionsForPeriod(transactions, activePeriod) : transactions,
    [transactions, activePeriod]
  );

  // ─── Fintoc ────────────────────────────────────────────────────────
  const syncFintoc = async () => {
    setLoadingFintoc(true);
    try {
      const intentRes = await fetch('/api/fintoc/create-link-intent', { method: 'POST' });
      if (!intentRes.ok) {
        const errData = await intentRes.json();
        throw new Error(errData.error || 'No se pudo crear el link intent');
      }
      const { widget_token } = await intentRes.json();

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
          alert('¡Conexión bancaria exitosa! Sincronizando transacciones...');
          setLoadingFintoc(false);
          setTimeout(async () => { await loadTransactions(); }, 4000);
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

  // ─── Classification ────────────────────────────────────────────────
  const handleCategoriesChange = (newCats: CategoryConfig[]) => {
    setCategories(newCats);
    saveCategories(newCats);
  };

  const handleClassify = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    setClassifications(prev => ({ ...prev, [id]: 'loading' }));

    // Build history of officially reviewed transactions to teach the AI
    const history: ClassificationHistory[] = transactions
      .filter(t => t.id !== id && classifications[t.id] && (classifications[t.id] as ClassificationResult).estado_revision === 'oficial')
      .map(t => ({
        descripcion: t.descripcion,
        categoria: (classifications[t.id] as ClassificationResult).categoria_asignada
      }))
      .slice(0, 50); // limit to last 50 for token constraints

    try {
      const result = await classifyTransaction(transaction, categories, history);
      await supabase.from('transacciones').update({
        categoria_asignada: result.categoria_asignada,
        estado_revision: result.estado_revision,
        razonamiento_breve: result.razonamiento_breve
      }).eq('id', id);
      setClassifications(prev => ({ ...prev, [id]: result }));
    } catch {
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
    // Classify all unclassified transactions in the current period
    const target = (activePeriod ? periodTransactions : transactions)
      .filter(t => !classifications[t.id] || classifications[t.id] === 'error');
    for (const t of target) await handleClassify(t.id);
  };

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const recs = await getAIRecommendations(periodTransactions);
      setRecommendations(recs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRecs(false);
    }
  };

  // ─── Derived data (all scoped to selected period) ──────────────────
  const filteredTransactions = useMemo(() =>
    periodTransactions.filter(t =>
      t.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [periodTransactions, searchTerm]
  );

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    periodTransactions.forEach(t => {
      if (t.tipo === 'cargo') {
        const cat = typeof classifications[t.id] === 'object'
          ? (classifications[t.id] as ClassificationResult).categoria_asignada
          : 'Por Definir';
        data[cat] = (data[cat] || 0) + t.monto;
      }
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [periodTransactions, classifications]);

  const totalSavings = React.useMemo(() => {
    const income = periodTransactions.filter(t => t.tipo === 'abono').reduce((acc, t) => acc + t.monto, 0);
    const expenses = periodTransactions.filter(t => t.tipo === 'cargo').reduce((acc, t) => acc + t.monto, 0);
    return income - expenses;
  }, [periodTransactions]);

  const budgetData = useMemo(() =>
    Object.entries(budgets).map(([name, limit]) => {
      const spent = periodTransactions
        .filter(t => t.tipo === 'cargo' &&
          typeof classifications[t.id] === 'object' &&
          (classifications[t.id] as ClassificationResult).categoria_asignada === name)
        .reduce((acc, t) => acc + t.monto, 0);
      return { name, spent, limit };
    }),
    [periodTransactions, classifications, budgets]
  );

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

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
              {loadingFintoc ? 'Conectando...' : 'Conectar Banco'}
            </button>
            <button
              onClick={handleClassifyAll}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              <RefreshCw className="w-4 h-4" />
              Clasificar
            </button>
            <button
              onClick={() => setShowCategoryManager(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded-full hover:bg-slate-200 transition-all"
              title="Gestionar categorías"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              onClick={fetchRecommendations}
              disabled={loadingRecs}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-full hover:bg-amber-600 transition-all shadow-md shadow-amber-100"
            >
              {loadingRecs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {recommendations.length > 0 ? 'Estrategias' : 'IA Estrategias'}
            </button>
          </div>
        </header>

        {/* Category Manager Modal */}
        <AnimatePresence>
          {showCategoryManager && (
            <CategoryManager
              categories={categories}
              onCategoriesChange={handleCategoriesChange}
              onClose={() => setShowCategoryManager(false)}
            />
          )}
        </AnimatePresence>

        <div className="p-6 lg:p-10 max-w-6xl mx-auto">
          {/* Period selector — shown in all views */}
          {salaryPeriods.length > 0 && (
            <PeriodSelector
              periods={salaryPeriods}
              selectedIndex={selectedPeriodIndex}
              onSelect={setSelectedPeriodIndex}
            />
          )}

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
                periodLabel={activePeriod?.label ?? 'Todos los periodos'}
                periodTransactions={periodTransactions}
                classifications={classifications}
                activePeriod={activePeriod}
                categories={categories}
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
                categories={categories.map(c => c.name)}
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
