import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Calendar, 
  LogOut, 
  CheckCircle2, 
  Key, 
  Building2, 
  Warehouse,
  Boxes,
  FileCheck2
} from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isManager = user?.role === 'Inventory Manager';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <User className="h-6 w-6 text-emerald-400" />
            My Profile
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personal identity, assigned system privileges, and active session configuration
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Terminate Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-slate-850 border border-slate-700/60 rounded-xl p-6 text-center shadow-lg">
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl font-bold mb-4 shadow-inner">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <h2 className="text-lg font-bold text-white">{user?.name || 'StockSense Operator'}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{user?.email || 'user@stocksense.local'}</p>

          <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col items-center">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isManager 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {user?.role || 'Inventory Manager'}
            </span>
            <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Joined: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active Member'}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-850 border border-slate-700/60 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-400" />
              Account Credentials & Identity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-900 border border-slate-700/60 rounded-lg">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Display Name</div>
                <div className="text-sm font-semibold text-slate-200 mt-1">{user?.name || 'Administrator'}</div>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-700/60 rounded-lg">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Email Address</div>
                <div className="text-sm font-semibold text-slate-200 mt-1">{user?.email || 'admin@stocksense.local'}</div>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-700/60 rounded-lg">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Security Access Level</div>
                <div className="text-sm font-semibold text-slate-200 mt-1">{user?.role || 'Inventory Manager'}</div>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-700/60 rounded-lg">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">User ID / Node</div>
                <div className="text-sm font-mono text-slate-200 mt-1">USR-#{user?.id || 1}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-850 border border-slate-700/60 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-emerald-400" />
              Assigned Permissions & Privileges
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Full Stock Movements:</strong> Validate and post receipts, internal warehouse transfers, delivery orders, and inventory adjustments.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Audit Trail & Ledger:</strong> Complete read and filtered CSV export access across immutable transaction logs.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Master Catalog Management:</strong> Register new product SKUs, maintain categories, units of measure, and reorder levels.
                </span>
              </div>
              {isManager && (
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Enterprise Configuration:</strong> Manage physical warehouses, storage locations, suppliers, and customer master lists.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-850 border border-slate-700/60 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-400" />
              Connected Facilities
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-900 border border-slate-700/60 rounded-lg flex items-center gap-2.5">
                <Warehouse className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Main Warehouse</div>
                  <div className="text-[10px] text-slate-400">Stores, Production, Inspection</div>
                </div>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-700/60 rounded-lg flex items-center gap-2.5">
                <Boxes className="h-4 w-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Secondary Facility</div>
                  <div className="text-[10px] text-slate-400">Secondary Storage & Buffer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
