import React from 'react';
import { motion } from 'motion/react';

interface SavingsGuardProps {
  savingsGoal: number;
  onGoalChange: (goal: number) => void;
  budgets: Record<string, number>;
  onBudgetChange: (category: string, limit: number) => void;
}

export const SavingsGuard: React.FC<SavingsGuardProps> = ({
  savingsGoal,
  onGoalChange,
  budgets,
  onBudgetChange
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
    >
      <div className="mb-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold mb-4">Establece tu Meta de Ahorro</h3>
        <div className="flex items-center gap-4 max-w-md">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
            <input 
              type="number" 
              value={savingsGoal} 
              onChange={(e) => onGoalChange(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-50 border-none rounded-2xl p-4 pl-8 text-2xl font-bold focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="text-slate-500 font-semibold uppercase tracking-widest text-xs">Meta</div>
        </div>
        <p className="mt-4 text-sm text-slate-500 italic">Este es el hito que estamos trabajando para alcanzar mediante el ahorro disciplinado.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(budgets).map(([cat, limit]) => (
          <div key={cat} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all">
            <h4 className="font-bold mb-4 text-slate-700">{cat}</h4>
            <div className="flex items-center gap-4">
              <input 
                type="number" 
                value={limit} 
                onChange={(e) => onBudgetChange(cat, parseInt(e.target.value) || 0)}
                className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-lg font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <div className="text-slate-400 font-mono text-xs font-bold">LÍMITE</div>
            </div>
            <p className="mt-4 text-[10px] text-slate-400 uppercase tracking-widest font-bold">Protegiendo tus ahorros al limitar este gasto.</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
