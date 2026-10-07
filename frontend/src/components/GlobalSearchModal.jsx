import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Package, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Warehouse, Sliders, ArrowRight } from 'lucide-react';
import api from '../services/api';

export default function GlobalSearchModal({ isOpen, onClose, onOpenProduct360 }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    products: [],
    receipts: [],
    deliveries: [],
    transfers: [],
  });

  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ products: [], receipts: [], deliveries: [], transfers: [] });
      return;
    }

    if (!query.trim()) {
      setResults({ products: [], receipts: [], deliveries: [], transfers: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const q = query.toLowerCase().trim();
        const [prodRes, recRes, delRes, trfRes] = await Promise.all([
          api.get(`/products?search=${encodeURIComponent(q)}`),
          api.get('/receipts'),
          api.get('/deliveries'),
          api.get('/transfers'),
        ]);

        const prods = (prodRes.data?.items || prodRes.data || [])
          .filter(p => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
          .slice(0, 4);

        const recs = (recRes.data?.items || recRes.data || [])
          .filter(r => r.reference_no?.toLowerCase().includes(q) || r.supplier_name?.toLowerCase().includes(q))
          .slice(0, 3);

        const dels = (delRes.data?.items || delRes.data || [])
          .filter(d => d.reference_no?.toLowerCase().includes(q) || d.customer_name?.toLowerCase().includes(q))
          .slice(0, 3);

        const trfs = (trfRes.data?.items || trfRes.data || [])
          .filter(t => t.reference_no?.toLowerCase().includes(q))
          .slice(0, 3);

        setResults({
          products: prods,
          receipts: recs,
          deliveries: dels,
          transfers: trfs,
        });
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const totalHits = results.products.length + results.receipts.length + results.deliveries.length + results.transfers.length;

  const handleSelect = (path) => {
    onClose();
    navigate(path);
  };

  const handleProductSelect = (p) => {
    if (onOpenProduct360) {
      onOpenProduct360(p);
    } else {
      handleSelect('/products');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 bg-slate-50/50">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, SKUs, receipts, deliveries, transfers..."
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-slate-200 rounded border border-slate-300">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-8 text-center text-sm text-slate-500">
              Searching inventory system...
            </div>
          )}

          {!loading && query && totalHits === 0 && (
            <div className="py-8 text-center text-sm text-slate-500">
              No matching records found for "{query}".
            </div>
          )}

          {!loading && !query && (
            <div className="py-6 text-center text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-600">Quick Navigation</p>
              <p>Type to search across Products, Receipts, Deliveries, and Transfers.</p>
            </div>
          )}

          {/* Products */}
          {results.products.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-blue-500" />
                Products ({results.products.length})
              </div>
              <div className="space-y-1">
                {results.products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleProductSelect(p)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{p.sku}</span>
                        <span>Stock: <strong className="text-slate-700">{p.current_stock ?? p.total_stock ?? 0} {p.unit_of_measure}</strong></span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Receipts */}
          {results.receipts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                Incoming Receipts ({results.receipts.length})
              </div>
              <div className="space-y-1">
                {results.receipts.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(`/receipts`)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 font-mono">
                        {r.reference_no}
                      </div>
                      <div className="text-xs text-slate-500">
                        Supplier: {r.supplier_name || 'General Supplier'} • Status: <span className="uppercase text-[11px] font-semibold">{r.status}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deliveries */}
          {results.deliveries.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
                Outgoing Deliveries ({results.deliveries.length})
              </div>
              <div className="space-y-1">
                {results.deliveries.map(d => (
                  <button
                    key={d.id}
                    onClick={() => handleSelect(`/deliveries`)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 group-hover:text-rose-600 font-mono">
                        {d.reference_no}
                      </div>
                      <div className="text-xs text-slate-500">
                        Customer: {d.customer_name || 'Direct Customer'} • Status: <span className="uppercase text-[11px] font-semibold">{d.status}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-rose-500 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transfers */}
          {results.transfers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <ArrowLeftRight className="h-3.5 w-3.5 text-amber-500" />
                Internal Transfers ({results.transfers.length})
              </div>
              <div className="space-y-1">
                {results.transfers.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(`/transfers`)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 group-hover:text-amber-600 font-mono">
                        {t.reference_no}
                      </div>
                      <div className="text-xs text-slate-500">
                        Status: <span className="uppercase text-[11px] font-semibold">{t.status}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-amber-500 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-2.5 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Search index spans Master Catalog, Operations, and Locations</span>
          <span className="font-mono text-slate-400">StockSense Search</span>
        </div>
      </div>
    </div>
  );
}
