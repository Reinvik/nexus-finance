import React, { useState, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles, Settings2, Menu } from 'lucide-react';
import {
  classifyTransaction,
  getAIRecommendations,
  Transaction,
  ClassificationResult,
  SavingsRecommendation,
  CategoryConfig,
  ClassificationHistory,
  getAISettings
} from './services/geminiService';
import { getSalaryPeriods, getTransactionsForPeriod } from './services/periodService';
import { Sidebar } from './components/Sidebar';
import { GrowthCenter } from './components/GrowthCenter';
import { TransactionsModule } from './components/TransactionsModule';
import { SavingsGuard } from './components/SavingsGuard';
import { PeriodSelector } from './components/PeriodSelector';
import { CategoryManager } from './components/CategoryManager';
import { AIChat } from './components/AIChat';
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
        if (typeof parsed[0] === 'string') {
          return parsed.map((name: string) => ({ name, bucket: 'Ignorar', jar: 'Ignorar' } as CategoryConfig));
        }
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

const STORAGE_KEY_BUDGETS = 'nexus_finance_budgets';

const DEFAULT_BUDGETS: Record<string, number> = {
  "Cuentas Casa": 100000,
  "Supermercado (Comida)": 200000,
  "Gastos Chicos/Almacén": 50000,
  "Entretenimiento": 80000
};

function loadBudgets(): Record<string, number> {
  const saved = localStorage.getItem(STORAGE_KEY_BUDGETS);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing budgets', e);
    }
  }
  return DEFAULT_BUDGETS;
}

function saveBudgets(budgets: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
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
  const [budgets, setBudgets] = useState<Record<string, number>>(loadBudgets);

  const handleAddBudget = (category: string, limit: number) => {
    setBudgets(prev => ({
      ...prev,
      [category]: limit
    }));
  };

  const handleDeleteBudget = (category: string) => {
    setBudgets(prev => {
      const copy = { ...prev };
      delete copy[category];
      return copy;
    });
  };

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      console.error('Error loading txs:', error.message);
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

  const salaryPeriods = useMemo(() => getSalaryPeriods(transactions), [transactions]);

  React.useEffect(() => {
    saveBudgets(budgets);
  }, [budgets]);

  React.useEffect(() => {
    if (salaryPeriods.length > 0) {
      setSelectedPeriodIndex(prev => Math.min(prev, salaryPeriods.length - 1));
    }
  }, [salaryPeriods.length]);

  const activePeriod = salaryPeriods[selectedPeriodIndex] ?? null;

  const periodTransactions = useMemo(
    () => activePeriod ? getTransactionsForPeriod(transactions, activePeriod) : transactions,
    [transactions, activePeriod]
  );

  const syncFintoc = async () => {
    setLoadingFintoc(true);
    try {
      const intentRes = await fetch('/api/fintoc/create-link-intent', { method: 'POST' });
      if (!intentRes.ok) throw new Error('No se pudo crear el link intent');
      const { widget_token } = await intentRes.json();
      const fintoc = await getFintoc();
      if (!fintoc) throw new Error('Failed to load Fintoc SDK');

      const widget = fintoc.create({
        publicKey: import.meta.env.VITE_FINTOC_PUBLIC_KEY || '',
        widgetToken: widget_token,
        holderType: 'individual',
        product: 'movements',
        country: 'cl',
        onSuccess: async (link_token: string) => {
          try {
            // Pass link_token to sync endpoint so server saves it and syncs atomically
            const syncUrl = `/api/fintoc/sync?userId=${USER_ID}${link_token ? `&linkToken=${encodeURIComponent(link_token)}` : ''}`;
            const syncRes = await fetch(syncUrl, { method: 'GET' });
            const syncData = await syncRes.json();
            console.log('[Fintoc] Sync result:', syncData);
          } catch (err) {
            console.error('[Fintoc] Error during post-connection sync:', err);
          } finally {
            alert('¡Conexión bancaria sincronizada!');
            setLoadingFintoc(false);
            loadTransactions();
          }
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

  const handleCategoriesChange = (newCats: CategoryConfig[]) => {
    setCategories(newCats);
    saveCategories(newCats);
  };

  const handleClassify = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    setClassifications(prev => ({ ...prev, [id]: 'loading' }));

    const history: ClassificationHistory[] = transactions
      .filter(t => t.id !== id && classifications[t.id] && (classifications[t.id] as ClassificationResult).estado_revision === 'oficial')
      .map(t => ({
        descripcion: t.descripcion,
        categoria: (classifications[t.id] as ClassificationResult).categoria_asignada
      }))
      .slice(0, 50);

    try {
      const instructions = getAISettings().custom_instructions;
      const result = await classifyTransaction(transaction, categories, history, instructions);
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
    const target = periodTransactions.filter(t => !classifications[t.id] || classifications[t.id] === 'error');
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

  const filteredTransactions = useMemo(() =>
    periodTransactions.filter(t => t.descripcion.toLowerCase().includes(searchTerm.toLowerCase())),
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

  const totalSavings = useMemo(() => {
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
      <Sidebar
        activeView={view}
        onViewChange={setView}
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
        onSync={syncFintoc}
        isSyncing={loadingFintoc}
        onClassifyAll={handleClassifyAll}
      />

      <main className="lg:ml-64 min-h-screen flex flex-col">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold capitalize">
              {view === 'dashboard' ? 'Centro de Crecimiento' : view === 'budgets' ? 'Protección de Ahorros' : 'Transacciones'}
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsChatOpen(true)}
              className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-full transition-colors relative"
              title="Nexus AI Chat"
            >
              <Sparkles className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white"></span>
            </button>
            <button
              onClick={() => setShowCategoryManager(true)}
              className="p-2 hover:bg-slate-100 text-slate-600 rounded-full transition-colors"
              title="Configurar Categorías"
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <button
              onClick={syncFintoc}
              disabled={loadingFintoc}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-full hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loadingFintoc ? 'animate-spin' : ''}`} />
              {loadingFintoc ? 'Conectando...' : 'Conectar Banco'}
            </button>
            <button
              onClick={handleClassifyAll}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              <Sparkles className="w-4 h-4" />
              Clasificar Todo
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full">
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
                allTransactions={transactions}
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
                onAddBudget={handleAddBudget}
                onDeleteBudget={handleDeleteBudget}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      <AIChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        transactions={periodTransactions}
        categories={categories}
        history={transactions
          .filter(t => classifications[t.id] && (classifications[t.id] as ClassificationResult).estado_revision === 'oficial')
          .map(t => ({
            descripcion: t.descripcion,
            categoria: (classifications[t.id] as ClassificationResult).categoria_asignada
          }))
        }
      />

      <AnimatePresence>
        {showCategoryManager && (
          <CategoryManager
            categories={categories}
            onCategoriesChange={handleCategoriesChange}
            onClose={() => setShowCategoryManager(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
