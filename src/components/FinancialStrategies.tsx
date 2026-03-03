import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Transaction, ClassificationResult } from '../services/geminiService';
import { SalaryPeriod } from '../services/periodService';

interface FinancialStrategiesProps {
    periodTransactions: Transaction[];
    classifications: Record<string, ClassificationResult | 'loading' | 'error'>;
    activePeriod: SalaryPeriod | null;
}

type StrategyTab = '50-30-20' | '6-jarras';

// Category buckets for 50/30/20
const NEEDS_CATS = ['Arriendo', 'Cuentas Casa', 'Supermercado (Comida)', 'Ahorro Automático'];
const WANTS_CATS = ['Entretenimiento', 'Gastos Chicos/Almacén', 'Transporte', 'Por Definir'];
const SAVINGS_CATS = ['Ahorro Automático', 'Ingreso Roberto Mella'];

// 6 Jars config
const JARS = [
    { key: 'necesidades', label: 'Necesidades', pct: 55, color: '#6366f1', emoji: '🏠', cats: ['Arriendo', 'Cuentas Casa', 'Supermercado (Comida)'] },
    { key: 'ahorro_lp', label: 'Ahorro L/P', pct: 10, color: '#10b981', emoji: '💰', cats: ['Ahorro Automático'] },
    { key: 'educacion', label: 'Educación', pct: 10, color: '#f59e0b', emoji: '📚', cats: [] },
    { key: 'diversion', label: 'Diversión', pct: 10, color: '#ec4899', emoji: '🎉', cats: ['Entretenimiento'] },
    { key: 'libertad', label: 'Libertad Fin.', pct: 10, color: '#8b5cf6', emoji: '📈', cats: [] },
    { key: 'donaciones', label: 'Donaciones', pct: 5, color: '#14b8a6', emoji: '🙏', cats: [] },
];

function getSpentByCategories(
    transactions: Transaction[],
    classifications: Record<string, ClassificationResult | 'loading' | 'error'>,
    cats: string[]
): number {
    return transactions
        .filter(t => {
            if (t.tipo !== 'cargo') return false;
            const c = classifications[t.id];
            if (typeof c !== 'object') return false;
            return cats.includes(c.categoria_asignada);
        })
        .reduce((acc, t) => acc + t.monto, 0);
}

function Bar({ pct, color, over }: { pct: number; color: string; over: boolean }) {
    return (
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ backgroundColor: over ? '#ef4444' : color }}
                className="h-full rounded-full"
            />
        </div>
    );
}

export const FinancialStrategies: React.FC<FinancialStrategiesProps> = ({
    periodTransactions,
    classifications,
    activePeriod
}) => {
    const [tab, setTab] = useState<StrategyTab>('50-30-20');

    // Income = salary (abonos >= 700k)
    const income = periodTransactions
        .filter(t => t.tipo === 'abono' && t.monto >= 700_000)
        .reduce((acc, t) => acc + t.monto, 0);

    if (income === 0) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
                Sin sueldo detectado en este periodo para calcular estrategias.
            </div>
        );
    }

    // 50/30/20
    const needsSpent = getSpentByCategories(periodTransactions, classifications, NEEDS_CATS);
    const wantsSpent = getSpentByCategories(periodTransactions, classifications, WANTS_CATS);
    const totalExpenses = periodTransactions.filter(t => t.tipo === 'cargo').reduce((a, t) => a + t.monto, 0);
    const actualSavings = income - totalExpenses;

    const buckets5030 = [
        { label: 'Necesidades', pct: 50, target: income * 0.5, actual: needsSpent, color: '#6366f1', tip: 'Arriendo, comida, cuentas' },
        { label: 'Deseos', pct: 30, target: income * 0.3, actual: wantsSpent, color: '#f59e0b', tip: 'Entretención, transporte, misc' },
        { label: 'Ahorro', pct: 20, target: income * 0.2, actual: Math.max(actualSavings, 0), color: '#10b981', tip: 'Lo que queda después de gastos' },
    ];

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            {/* Tab selector */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Estrategias Financieras</h3>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {(['50-30-20', '6-jarras'] as StrategyTab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {t === '50-30-20' ? '50/30/20' : '6 Jarras'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="text-xs text-slate-400 mb-5">
                Sueldo del periodo: <span className="font-semibold text-slate-600">${income.toLocaleString('es-CL')} CLP</span>
            </div>

            {tab === '50-30-20' && (
                <div className="space-y-5">
                    {buckets5030.map(b => {
                        const realPct = (b.actual / b.target) * 100;
                        const over = b.actual > b.target;
                        return (
                            <div key={b.label}>
                                <div className="flex justify-between items-baseline mb-1.5">
                                    <div>
                                        <span className="font-semibold text-sm">{b.label}</span>
                                        <span className="text-xs text-slate-400 ml-2">{b.pct}% · {b.tip}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-bold ${over ? 'text-rose-500' : 'text-slate-700'}`}>
                                            ${b.actual.toLocaleString('es-CL')}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-1">/ ${b.target.toLocaleString('es-CL')}</span>
                                    </div>
                                </div>
                                <Bar pct={realPct} color={b.color} over={over} />
                                {over && (
                                    <p className="text-xs text-rose-500 mt-1">
                                        ⚠️ Superado en ${(b.actual - b.target).toLocaleString('es-CL')}
                                    </p>
                                )}
                            </div>
                        );
                    })}

                    <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                        <div className="text-xs text-slate-500">
                            {actualSavings >= income * 0.2
                                ? '✅ ¡Cumpliendo el 20% de ahorro!'
                                : `⚠️ Faltan $${Math.max(0, income * 0.2 - actualSavings).toLocaleString('es-CL')} para el 20% de ahorro`}
                        </div>
                    </div>
                </div>
            )}

            {tab === '6-jarras' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {JARS.map(jar => {
                        const target = income * (jar.pct / 100);
                        const actual = jar.cats.length > 0
                            ? getSpentByCategories(periodTransactions, classifications, jar.cats)
                            : 0;
                        const fillPct = jar.cats.length > 0 ? (actual / target) * 100 : 0;
                        const over = actual > target;

                        return (
                            <div key={jar.key} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <div className="text-2xl mb-2">{jar.emoji}</div>
                                <div className="font-bold text-sm mb-0.5">{jar.label}</div>
                                <div className="text-xs text-slate-400 mb-3">{jar.pct}% · ${target.toLocaleString('es-CL')}</div>

                                {/* Jar visual */}
                                <div className="relative h-20 w-10 mx-auto mb-3">
                                    <div className="absolute inset-0 rounded-b-xl border-2 overflow-hidden" style={{ borderColor: jar.color }}>
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.min(fillPct, 100)}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                            style={{ backgroundColor: over ? '#ef444460' : jar.color + '40' }}
                                            className="absolute bottom-0 w-full"
                                        />
                                    </div>
                                </div>

                                {jar.cats.length > 0 ? (
                                    <div className={`text-xs font-semibold text-center ${over ? 'text-rose-500' : 'text-slate-600'}`}>
                                        ${actual.toLocaleString('es-CL')}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-300 text-center">sin asignar</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
