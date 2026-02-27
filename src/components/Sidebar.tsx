import React from 'react';
import { LayoutDashboard, TrendingUp, Wallet, Target, Settings, Sparkles } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: 'dashboard' | 'transactions' | 'budgets') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
          <Sparkles className="text-white w-5 h-5" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-800">Nexus Finance</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        <NavItem 
          icon={<LayoutDashboard className="w-5 h-5" />} 
          label="Centro de Crecimiento" 
          active={activeView === 'dashboard'} 
          onClick={() => onViewChange('dashboard')} 
        />
        <NavItem 
          icon={<Wallet className="w-5 h-5" />} 
          label="Transacciones" 
          active={activeView === 'transactions'} 
          onClick={() => onViewChange('transactions')} 
        />
        <NavItem 
          icon={<Target className="w-5 h-5" />} 
          label="Protección de Ahorros" 
          active={activeView === 'budgets'} 
          onClick={() => onViewChange('budgets')} 
        />
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">AM</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Ariel Mellag</p>
            <p className="text-xs text-slate-500 truncate">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
        active 
          ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
};
