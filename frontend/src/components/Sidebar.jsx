import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Sliders, 
  ClipboardList, 
  Settings, 
  Boxes,
  Warehouse,
  User,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Receipts', href: '/receipts', icon: ArrowDownLeft, badge: 'IN' },
  { name: 'Deliveries', href: '/deliveries', icon: ArrowUpRight, badge: 'OUT' },
  { name: 'Transfers', href: '/transfers', icon: ArrowLeftRight, badge: 'INTERNAL' },
  { name: 'Adjustments', href: '/adjustments', icon: Sliders },
  { name: 'Stock Ledger', href: '/ledger', icon: ClipboardList },
  { name: 'Warehouses', href: '/settings?tab=warehouses', icon: Warehouse },
  { name: 'Settings & Meta', href: '/settings', icon: Settings },
  { name: 'My Profile', href: '/profile', icon: User },
];

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const location = useLocation();

  const isItemActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    if (href.includes('?')) {
      const [path, query] = href.split('?');
      return location.pathname === path && location.search.includes(query);
    }
    if (href === '/settings') {
      return location.pathname === '/settings' && !location.search.includes('tab=warehouses');
    }
    return location.pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300 w-64">
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight leading-none">StockSense</h1>
            <span className="text-[11px] text-emerald-400 font-medium">Enterprise Inventory</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Operations
        </div>
        {navigation.map((item) => {
          const active = isItemActive(item.href);
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-xs text-slate-400">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-300 font-medium">Engine Active</span>
        </div>
        <div className="text-[11px]">PostgreSQL 18 Atomic Ledger</div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 min-h-screen">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
            onClick={onClose}
          />
          <div className="relative z-50 flex-1 flex max-w-xs w-full">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
