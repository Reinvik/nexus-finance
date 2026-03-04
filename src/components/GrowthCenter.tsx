import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { PieChart as PieChartIcon, Target, Sparkles, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SavingsRecommendation, Transaction, ClassificationResult, CategoryConfig } from '../services/geminiService';
import { FinancialStrategies } from './FinancialStrategies';
import { SalaryPeriod } from '../services/periodService';

interface ChartDataItem {
  name: string;
  value: number;
}

interface BudgetItem {
  name: string;
  spent: number;
  limit: number;
}

interface GrowthCenterProps {
  totalSavings: number;
  savingsGoal: number;
  chartData: ChartDataItem[];
  budgetData: BudgetItem[];
  recommendations: SavingsRecommendation[];
  colors: string[];
  periodLabel: string;
  periodTransactions: Transaction[];
  allTransactions: Transaction[];
  classifications: Record<string, ClassificationResult | 'loading' | 'error'>;
  activePeriod: SalaryPeriod | null;
  categories: CategoryConfig[];
}

export const GrowthCenter: React.FC<GrowthCenterProps> = ({
  totalSavings,
  savingsGoal,
  chartData,
  budgetData,
  recommendations,
  colors,
  periodLabel,
  periodTransactions,
  allTransactions,
  classifications,
  activePeriod,
  categories
}) => {
  // 1. Calculate Metric Cards for CURRENT period
  const { totalIncome, totalExpense } = useMemo(() => {
    let inc = 0, exp = 0;
    periodTransactions.forEach(t => {
      if (t.tipo === 'abono') inc += t.monto;
      else exp += t.monto;
    });
    return { totalIncome: inc, totalExpense: exp };
  }, [periodTransactions]);

  // 2. Generate Historical Chart Data (Last 6 Months)
  const historicalData = useMemo(() => {
    // Array para los nombres de meses
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    // Obtener los últimos 6 meses (incluyendo el actual)
    const dataMap = new Map<string, { month: string, index: number, ingresos: number, gastos: number }>();

    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;

      dataMap.set(key, { month: label, index: 5 - i, ingresos: 0, gastos: 0 });
    }

    // Poblar con todas las transacciones
    allTransactions.forEach(t => {
      const key = t.fecha.substring(0, 7); // yyyy-MM
      if (dataMap.has(key)) {
        const entry = dataMap.get(key)!;
        if (t.tipo === 'abono') {
          entry.ingresos += t.monto;
        } else {
          entry.gastos += t.monto;
        }
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => a.index - b.index);
  }, [allTransactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Top Metric Cards */}
      <h2 className="text-xl font-bold mb-4 text-slate-800">Resumen: {periodLabel}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        {/* Income Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-emerald-100 rounded-2xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ingresos</p>
              <h3 className="text-2xl font-bold text-slate-800">${totalIncome.toLocaleString('es-CL')}</h3>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-50 rounded-full blur-2xl"></div>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-rose-100 rounded-2xl">
              <TrendingDown className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gastos</p>
              <h3 className="text-2xl font-bold text-slate-800">${totalExpense.toLocaleString('es-CL')}</h3>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-rose-50 rounded-full blur-2xl"></div>
        </div>

        {/* Net Balance Card */}
        <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-100 relative overflow-hidden transition-all hover:shadow-xl hover:shadow-indigo-200">
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">Balance Neto</p>
              <h3 className="text-2xl font-bold">${totalSavings.toLocaleString('es-CL')}</h3>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Historical Graph */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-10">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
          <TrendingUp className="w-5 h-5 text-indigo-600" /> Historial de Dinero (Últimos 6 meses)
        </h3>
        <div className="h-80 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} dy={10} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                width={80}
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [`$${value.toLocaleString('es-CL')}`, name]}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', padding: '12px' }}
                itemStyle={{ fontWeight: 600, fontSize: '13px' }}
                labelStyle={{ color: '#64748b', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }} />
              <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
              <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorGastos)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Expense Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-indigo-600" /> Distribución de Gastos
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: number) => [`$${value.toLocaleString('es-CL')}`, undefined]}
                  contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Savings Protection */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" /> Estado de Protección de Ahorros
          </h3>
          <div className="space-y-6">
            {budgetData.map((b, i) => (
              <div key={b.name}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold">{b.name}</span>
                  <span className={b.spent > b.limit ? 'text-rose-500 font-bold' : 'text-slate-500'}>
                    ${b.spent.toLocaleString('es-CL')} / ${b.limit.toLocaleString('es-CL')}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((b.spent / b.limit) * 100, 100)}%` }}
                    className={`h-full rounded-full ${b.spent > b.limit ? 'bg-rose-500' : 'bg-indigo-600'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-10">
        <FinancialStrategies
          periodTransactions={periodTransactions}
          classifications={classifications}
          activePeriod={activePeriod}
          categories={categories}
        />
      </div>

      {/* AI Growth Strategies */}
      {recommendations.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" /> Estrategias de Crecimiento IA
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-gradient-to-br from-amber-50 to-white p-6 rounded-3xl border border-amber-100 shadow-sm"
              >
                <h4 className="font-bold text-amber-900 mb-2">{rec.titulo}</h4>
                <p className="text-sm text-amber-800/70 mb-4">{rec.descripcion}</p>
                <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Crecimiento Potencial: {rec.ahorro_estimado}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
