import React, { useState, useEffect } from 'react';
import { X, Package, MapPin, Activity, History, ArrowDownLeft, ArrowUpRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function Product360Modal({ product, productId, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [details, setDetails] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const id = productId || product?.id;
    if (!id) return;

    setLoading(true);
    Promise.all([
      api.get(`/products/${id}`),
      api.get(`/ledger?productId=${id}&limit=20`),
    ])
      .then(([prodRes, ledgerRes]) => {
        setDetails(prodRes.data || product);
        setMovements(ledgerRes.data?.items || ledgerRes.data || []);
      })
      .catch((err) => {
        console.error('Error fetching Product 360 data:', err);
        setDetails(product);
      })
      .finally(() => setLoading(false));
  }, [isOpen, productId, product]);

  if (!isOpen) return null;

  const prod = details || product || {};
  const currentStock = parseFloat(prod.current_stock ?? prod.total_stock ?? 0);
  const reorderLevel = parseFloat(prod.reorder_level ?? 0);
  const isLowStock = currentStock <= reorderLevel;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">{prod.name}</h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {prod.sku}
                </span>
              </div>
              <p className="text-xs text-slate-500">Product 360 Intelligence Dossier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 px-6 flex gap-4 bg-white text-sm font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent hover:text-slate-900'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${activeTab === 'locations' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent hover:text-slate-900'}`}
          >
            Location Breakdown ({(prod.stock_by_location || prod.locations || []).length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 cursor-pointer transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent hover:text-slate-900'}`}
          >
            Audit Movements ({movements.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading 360 telemetry...
            </div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Top KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total On Hand</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {currentStock} <span className="text-xs font-normal text-slate-500">{prod.unit_of_measure}</span>
                  </div>
                  <div className="text-xs mt-1.5 flex items-center gap-1 font-medium">
                    {isLowStock ? (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Reorder Needed
                      </span>
                    ) : (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Healthy Level
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reorder Level</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {reorderLevel} <span className="text-xs font-normal text-slate-500">{prod.unit_of_measure}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Minimum buffer threshold</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</span>
                  <div className="text-lg font-bold text-slate-900 mt-1 truncate">
                    {prod.category_name || 'Uncategorized'}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Standard master classification</p>
                </div>
              </div>

              {/* Stock Runway Progress */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                  <span>Stock Buffer Coverage</span>
                  <span>{reorderLevel > 0 ? Math.round((currentStock / reorderLevel) * 100) : 100}% of Reorder Level</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, reorderLevel > 0 ? (currentStock / reorderLevel) * 100 : 100)}%` }}
                  />
                </div>
              </div>

              {/* Description */}
              {prod.description && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Catalog Description</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">{prod.description}</p>
                </div>
              )}
            </div>
          ) : activeTab === 'locations' ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Stock per Location</h4>
              {(prod.stock_by_location || prod.locations || []).length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No location records for this SKU.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {(prod.stock_by_location || prod.locations || []).map((loc, idx) => (
                    <div key={idx} className="p-3.5 bg-white flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{loc.location_name}</div>
                          <div className="text-xs text-slate-500">{loc.warehouse_name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900 font-mono">
                          {parseFloat(loc.quantity || 0)} {prod.unit_of_measure}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Immutable Ledger Trace</h4>
              {movements.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No ledger movements recorded for this item.</p>
              ) : (
                <div className="space-y-2">
                  {movements.map((m) => (
                    <div key={m.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        {m.operation_type === 'RECEIPT' ? (
                          <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <ArrowDownLeft className="h-4 w-4" />
                          </div>
                        ) : m.operation_type === 'DELIVERY' ? (
                          <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <ArrowUpRight className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Activity className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">{m.operation_type}</div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(m.timestamp).toLocaleString()} • By {m.user_name || 'System'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 font-mono">
                          {m.operation_type === 'DELIVERY' ? '-' : '+'}{m.quantity} {prod.unit_of_measure}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {m.previous_stock} → {m.new_stock}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">StockSense Double-Entry Ledger Grounded</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
