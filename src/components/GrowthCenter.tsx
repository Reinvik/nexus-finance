import React from 'react';
import { motion } from 'motion/react';
import { PieChart as PieChartIcon, Target, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SavingsRecommendation } from '../services/geminiService';

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
}

export const GrowthCenter: React.FC<GrowthCenterProps> = ({ 
  totalSavings, 
  savingsGoal, 
  chartData, 
  budgetData, 
  recommendations, 
  colors 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Savings Growth Header */}
      <div className="mb-10 bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-indigo-100 font-semibold mb-2 uppercase tracking-wider text-xs">Crecimiento de Ahorros Actual</h3>
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-5xl font-bold">${totalSavings.toLocaleString('es-CL')} CLP</span>
            <span className="text-indigo-200 text-sm font-medium">Ahorrado este periodo</span>
          </div>
          
          <div className="max-w-md">
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span>Meta: ${savingsGoal.toLocaleString('es-CL')} CLP</span>
              <span>{Math.round((totalSavings / savingsGoal) * 100)}% Logrado</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden backdrop-blur-sm">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((totalSavings / savingsGoal) * 100, 100)}%` }}
                className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
              />
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>
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
                <Tooltip />
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
