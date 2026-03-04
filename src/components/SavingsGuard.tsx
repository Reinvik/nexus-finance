import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';

interface SavingsGuardProps {
  savingsGoal: number;
  onGoalChange: (goal: number) => void;
  budgets: Record<string, number>;
  onBudgetChange: (category: string, limit: number) => void;
  onAddBudget: (category: string, limit: number) => void;
  onDeleteBudget: (category: string) => void;
}

export const SavingsGuard: React.FC<SavingsGuardProps> = ({
  savingsGoal,
  onGoalChange,
  budgets,
  onBudgetChange,
  onAddBudget,
  onDeleteBudget
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');

  const handleAdd = () => {
    if (newCategory.trim() && newLimit) {
      onAddBudget(newCategory.trim(), parseInt(newLimit) || 0);
      setNewCategory('');
      setNewLimit('');
    }
  };
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
          <div key={cat} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-slate-800 text-lg">{cat}</h4>
                <p className="text-sm text-slate-500 mt-1">Límite mensual</p>
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold">
                  Activo
                </div>
                <button
                  onClick={() => onDeleteBudget(cat)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar presupuesto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
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

        <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-300 flex flex-col justify-center">
          <h4 className="font-bold mb-4 text-slate-700">Añadir Nuevo Presupuesto</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre de categoría"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Límite ($)"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button
                onClick={handleAdd}
                disabled={!newCategory.trim() || !newLimit}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
