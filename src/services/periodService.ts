import { Transaction } from './geminiService';

export const SALARY_THRESHOLD = 700_000;

export interface SalaryPeriod {
    label: string;        // "Enero 2026"
    start: string;        // ISO date "2025-12-26"
    end: string;          // ISO date "2026-01-27" (day before next salary)
    salaryAmount: number;
}

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Builds custom financial periods based on salary deposits.
 * A salary received on Nov 28 marks the START of "Diciembre 2025".
 * Each period runs from that salary date until the day before the next salary.
 */
export function getSalaryPeriods(transactions: Transaction[]): SalaryPeriod[] {
    // Find all salary-level deposits, sorted ascending by date
    const salaries = transactions
        .filter(t => t.tipo === 'abono' && t.monto >= SALARY_THRESHOLD)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

    if (salaries.length === 0) return [];

    const periods: SalaryPeriod[] = [];

    for (let i = 0; i < salaries.length; i++) {
        const salaryDate = new Date(salaries[i].fecha + 'T12:00:00');

        // The period label is the NEXT month (salary on Nov 28 → "Diciembre 2025")
        // Use a safe date (1st of month) before adding month to avoid roll-over bugs (Jan 31 -> March)
        const labelDate = new Date(salaryDate.getFullYear(), salaryDate.getMonth() + 1, 1);
        const label = `${MONTH_NAMES[labelDate.getMonth()]} ${labelDate.getFullYear()}`;

        // Period ends the day before the next salary (or today if it's the last period)
        let endDate: Date;
        if (i + 1 < salaries.length) {
            endDate = new Date(salaries[i + 1].fecha + 'T12:00:00');
            endDate.setDate(endDate.getDate() - 1);
        } else {
            endDate = new Date(); // open period: today
        }

        periods.push({
            label,
            start: salaries[i].fecha,
            end: endDate.toISOString().split('T')[0],
            salaryAmount: salaries[i].monto
        });
    }

    return periods;
}

/**
 * Filters transactions to those within the given period's date range.
 */
export function getTransactionsForPeriod(
    transactions: Transaction[],
    period: SalaryPeriod
): Transaction[] {
    return transactions.filter(t => t.fecha >= period.start && t.fecha <= period.end);
}
