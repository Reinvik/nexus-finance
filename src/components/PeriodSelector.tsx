import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { SalaryPeriod } from '../services/periodService';

interface PeriodSelectorProps {
    periods: SalaryPeriod[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
    periods,
    selectedIndex,
    onSelect
}) => {
    if (periods.length === 0) return null;

    const canGoBack = selectedIndex > 0;
    const canGoForward = selectedIndex < periods.length - 1;

    return (
        <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                    Periodo Financiero
                </h3>
            </div>

            {/* Desktop: tabs */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
                {periods.map((period, i) => (
                    <motion.button
                        key={period.label}
                        onClick={() => onSelect(i)}
                        whileTap={{ scale: 0.96 }}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${i === selectedIndex
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                    >
                        {period.label}
                    </motion.button>
                ))}
            </div>

            {/* Mobile: prev/next navigator */}
            <div className="flex sm:hidden items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <button
                    onClick={() => canGoBack && onSelect(selectedIndex - 1)}
                    disabled={!canGoBack}
                    className="p-1 rounded-full disabled:opacity-30 hover:bg-slate-100 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                    <div className="font-bold text-slate-800">{periods[selectedIndex].label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                        {periods[selectedIndex].start} → {periods[selectedIndex].end}
                    </div>
                </div>

                <button
                    onClick={() => canGoForward && onSelect(selectedIndex + 1)}
                    disabled={!canGoForward}
                    className="p-1 rounded-full disabled:opacity-30 hover:bg-slate-100 transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Current period info */}
            <div className="mt-3 text-xs text-slate-400 hidden sm:block">
                {periods[selectedIndex].start} → {periods[selectedIndex].end}
                {' · '}Sueldo: ${periods[selectedIndex].salaryAmount.toLocaleString('es-CL')} CLP
            </div>
        </div>
    );
};
