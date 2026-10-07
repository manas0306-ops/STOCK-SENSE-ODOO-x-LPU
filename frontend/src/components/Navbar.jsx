import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldCheck, Menu, Boxes, Activity, Database } from 'lucide-react';
import { getOperatingMode, subscribeOperatingMode } from '../services/api';

export default function Navbar({ onMenuToggle, onOpenSearch }) {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState(getOperatingMode());

  useEffect(() => {
    return subscribeOperatingMode((newMode) => {
      setMode(newMode);
    });
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3 sm:gap-6">
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 lg:hidden">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <Boxes className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight">StockSense</span>
        </div>

        {/* Dynamic Live / Demo Mode Indicator */}
        <div className="flex items-center gap-2">
          {mode === 'LIVE' ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
              title="Connected to Live PostgreSQL Backend API"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE MODE
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
              title="Zero-Config In-Memory Demo Engine active (safe offline evaluation)"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              DEMO MODE
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {user && (
          <Link
            to="/profile"
            className="flex items-center gap-2.5 sm:gap-3 pr-2 sm:pr-4 border-r border-slate-200 hover:opacity-80 transition-opacity cursor-pointer"
            title="View Profile & Credentials"
          >
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs sm:text-sm">
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-semibold text-slate-900 leading-tight">{user.name}</div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                <span>{user.role}</span>
              </div>
            </div>
          </Link>
        )}

        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
          title="Sign out of workspace"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
