import React from 'react';
import { motion } from 'motion/react';
import { Search, CheckCircle2, Clock, RefreshCw, Edit2, X } from 'lucide-react';
import { Transaction, ClassificationResult } from '../services/geminiService';

interface TransactionsModuleProps {
  transactions: Transaction[];
  classifications: Record<string, any>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onClassify: (id: string) => void;
  onManualClassify: (id: string, category: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  categories: string[];
}

export const TransactionsModule: React.FC<TransactionsModuleProps> = ({
  transactions,
  classifications,
  searchTerm,
  onSearchChange,
  onClassify,
  onManualClassify,
  editingId,
  setEditingId,
  categories
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filtrar transacciones..."
              className="w-full bg-slate-50 border-none rounded-full py-2 pl-10 pr-4 text-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-semibold text-slate-400 uppercase border-b border-slate-50">
                <th className="px-6 py-4">Transacción</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((t) => {
                const classification = classifications[t.id];
                const isEditing = editingId === t.id;
                const isClassified = typeof classification === 'object';

                return (
                  <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold">{t.descripcion}</p>
                      <p className="text-xs text-slate-400">{t.fecha}</p>
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select 
                          className="text-xs border rounded-lg p-1"
                          onChange={(e) => onManualClassify(t.id, e.target.value)}
                          defaultValue={isClassified ? (classification as ClassificationResult).categoria_asignada : ""}
                        >
                          <option value="" disabled>Seleccionar Categoría</option>
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : isClassified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                          {(classification as ClassificationResult).categoria_asignada}
                          <Edit2 className="w-3 h-3 cursor-pointer opacity-0 group-hover:opacity-100" onClick={() => setEditingId(t.id)} />
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin categorizar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-sm">
                      ${t.monto.toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-4">
                      {isClassified && (
                        <div className="flex items-center gap-1">
                          {(classification as ClassificationResult).estado_revision === 'oficial' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-amber-500" />}
                          <span className="text-xs font-bold capitalize">{(classification as ClassificationResult).estado_revision}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => isEditing ? setEditingId(null) : setEditingId(t.id)} className="p-2 text-slate-400 hover:text-indigo-600">
                        {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </button>
                      <button onClick={() => onClassify(t.id)} className="p-2 text-slate-400 hover:text-indigo-600">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
