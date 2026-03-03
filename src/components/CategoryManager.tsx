import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Pencil, Trash2, Check, Tag } from 'lucide-react';

interface CategoryManagerProps {
    categories: string[];
    onCategoriesChange: (categories: string[]) => void;
    onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
    categories,
    onCategoriesChange,
    onClose
}) => {
    const [newName, setNewName] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');

    const add = () => {
        const trimmed = newName.trim();
        if (!trimmed || categories.includes(trimmed)) return;
        onCategoriesChange([...categories, trimmed]);
        setNewName('');
    };

    const startEdit = (i: number) => {
        setEditingIndex(i);
        setEditingValue(categories[i]);
    };

    const saveEdit = () => {
        if (editingIndex === null) return;
        const trimmed = editingValue.trim();
        if (!trimmed) return;
        const updated = [...categories];
        updated[editingIndex] = trimmed;
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Tag className="w-5 h-5 text-indigo-600" /> Categorías
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Add new */}
                <div className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && add()}
                        placeholder="Nueva categoría..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        onClick={add}
                        disabled={!newName.trim()}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> Agregar
                    </button>
                </div>

                {/* Category list */}
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    <AnimatePresence>
                        {categories.map((cat, i) => (
                            <motion.div
                                key={cat + i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="flex items-center gap-2 group"
                            >
                                {editingIndex === i ? (
                                    <>
                                        <input
                                            autoFocus
                                            value={editingValue}
                                            onChange={e => setEditingValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingIndex(null); }}
                                            className="flex-1 px-3 py-2 rounded-xl border-2 border-indigo-400 text-sm focus:outline-none"
                                        />
                                        <button onClick={saveEdit} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setEditingIndex(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-1 px-3 py-2 rounded-xl bg-slate-50 text-sm font-medium border border-slate-100">
                                            {cat}
                                        </span>
                                        <button
                                            onClick={() => startEdit(i)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => remove(i)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">
                    {categories.length} categorías · Los cambios se guardan automáticamente
                </div>
            </motion.div>
        </motion.div>
    );
};
