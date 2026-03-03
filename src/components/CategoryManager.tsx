import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Pencil, Trash2, Check, Tag } from 'lucide-react';
import { CategoryConfig, Bucket503020, Jar6 } from '../services/geminiService';

interface CategoryManagerProps {
    categories: CategoryConfig[];
    onCategoriesChange: (categories: CategoryConfig[]) => void;
    onClose: () => void;
}

const BUCKETS: Bucket503020[] = ['Necesidades', 'Deseos', 'Ahorro', 'Ingreso', 'Ignorar'];
const JARS: Jar6[] = ['Necesidades', 'Ahorro LP', 'Educación', 'Diversión', 'Libertad Fin.', 'Donaciones', 'Ingreso', 'Ignorar'];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
    categories,
    onCategoriesChange,
    onClose
}) => {
    const [newName, setNewName] = useState('');
    const [newBucket, setNewBucket] = useState<Bucket503020>('Deseos');
    const [newJar, setNewJar] = useState<Jar6>('Diversión');

    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState<CategoryConfig | null>(null);

    const add = () => {
        const trimmed = newName.trim();
        if (!trimmed || categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) return;

        onCategoriesChange([...categories, { name: trimmed, bucket: newBucket, jar: newJar }]);
        setNewName('');
        setNewBucket('Deseos');
        setNewJar('Diversión');
    };

    const startEdit = (i: number) => {
        setEditingIndex(i);
        setEditingValue({ ...categories[i] });
    };

    const saveEdit = () => {
        if (editingIndex === null || !editingValue) return;
        const trimmed = editingValue.name.trim();
        if (!trimmed) return;

        const updated = [...categories];
        updated[editingIndex] = { ...editingValue, name: trimmed };
        onCategoriesChange(updated);
        setEditingIndex(null);
    };

    const remove = (i: number) => {
        onCategoriesChange(categories.filter((_, idx) => idx !== i));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center p-4 overflow-y-auto"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 my-auto flex flex-col"
                style={{ maxHeight: '90vh' }}
            >
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Tag className="w-5 h-5 text-indigo-600" /> Gestionar Categorías
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Add new */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6 shrink-0 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex-1 space-y-3">
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && add()}
                            placeholder="Nombre de la nueva categoría..."
                            className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex gap-3">
                            <select
                                value={newBucket}
                                onChange={e => setNewBucket(e.target.value as Bucket503020)}
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {BUCKETS.map(b => <option key={b} value={b}>50/30/20: {b}</option>)}
                            </select>
                            <select
                                value={newJar}
                                onChange={e => setNewJar(e.target.value as Jar6)}
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {JARS.map(j => <option key={j} value={j}>Jarra: {j}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-end sm:items-stretch">
                        <button
                            onClick={add}
                            disabled={!newName.trim()}
                            className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Category list */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-[200px]">
                    <AnimatePresence>
                        {categories.map((cat, i) => (
                            <motion.div
                                key={cat.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-colors group"
                            >
                                {editingIndex === i && editingValue ? (
                                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                        <input
                                            autoFocus
                                            value={editingValue.name}
                                            onChange={e => setEditingValue({ ...editingValue, name: e.target.value })}
                                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingIndex(null); }}
                                            className="flex-1 px-3 py-1.5 rounded-lg border-2 border-indigo-400 text-sm focus:outline-none"
                                        />
                                        <select
                                            value={editingValue.bucket}
                                            onChange={e => setEditingValue({ ...editingValue, bucket: e.target.value as Bucket503020 })}
                                            className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none"
                                        >
                                            {BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                        <select
                                            value={editingValue.jar}
                                            onChange={e => setEditingValue({ ...editingValue, jar: e.target.value as Jar6 })}
                                            className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none"
                                        >
                                            {JARS.map(j => <option key={j} value={j}>{j}</option>)}
                                        </select>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={saveEdit} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setEditingIndex(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 font-medium text-slate-800">{cat.name}</div>

                                        <div className="flex gap-2 text-[10px] font-bold tracking-wide uppercase">
                                            <span className={`px-2 py-1 rounded-md ${cat.bucket === 'Necesidades' ? 'bg-indigo-100 text-indigo-700' :
                                                    cat.bucket === 'Ahorro' ? 'bg-emerald-100 text-emerald-700' :
                                                        cat.bucket === 'Deseos' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-100 text-slate-500'
                                                }`}>
                                                50/30/20: {cat.bucket}
                                            </span>
                                            <span className={`px-2 py-1 rounded-md bg-pink-50 text-pink-700 border border-pink-100`}>
                                                Jarra: {cat.jar}
                                            </span>
                                        </div>

                                        <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(i)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => remove(i)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center shrink-0">
                    {categories.length} categorías · La IA aprenderá de cómo uses estas categorías para transacciones futuras.
                </div>
            </motion.div>
        </motion.div>
    );
};
