import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';
import { metaService } from '../services/operationServices';
import StatusBadge from '../components/StatusBadge';
import { 
  Boxes, 
  AlertTriangle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  PackageX, 
  RefreshCw, 
  ExternalLink,
  Layers,
  Warehouse,
  Filter,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [documentType, setDocumentType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [warehouseId, setWarehouseId] = useState('ALL');
  const [categoryId, setCategoryId] = useState('ALL');
  
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [wRes, cRes] = await Promise.allSettled([
          metaService.getWarehouses(),
          metaService.getCategories(),
        ]);
        if (wRes.status === 'fulfilled' && wRes.value?.data) {
          setWarehouses(wRes.value.data);
        }
        if (cRes.status === 'fulfilled' && cRes.value?.data) {
          setCategories(cRes.value.data);
        }
      } catch (err) {
      }
    }
    loadMeta();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardService.getSummary({
        documentType,
        status,
        warehouseId,
        categoryId,
      });
      setData(res.data);
    } catch (err) {
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [documentType, status, warehouseId, categoryId]);

  const resetFilters = () => {
    setDocumentType('ALL');
    setStatus('ALL');
    setWarehouseId('ALL');
    setCategoryId('ALL');
  };

  const hasActiveFilters = documentType !== 'ALL' || status !== 'ALL' || warehouseId !== 'ALL' || categoryId !== 'ALL';

  const filteredActivities = useMemo(() => {
    if (!data?.recentActivity) return [];
    return data.recentActivity.filter((act) => {
      if (documentType !== 'ALL') {
        const op = (act.operation_type || '').toUpperCase();
        if (documentType === 'RECEIPT' && op !== 'RECEIPT') return false;
        if (documentType === 'DELIVERY' && op !== 'DELIVERY') return false;
        if (documentType === 'TRANSFER' && op !== 'TRANSFER') return false;
        if (documentType === 'ADJUSTMENT' && op !== 'ADJUSTMENT') return false;
      }
      return true;
    });
  }, [data?.recentActivity, documentType]);

  const filteredLowStock = useMemo(() => {
    if (!data?.lowStockProducts) return [];
    return data.lowStockProducts.filter((prod) => {
      if (categoryId !== 'ALL') {
        const catName = categories.find((c) => String(c.id) === String(categoryId))?.name;
        if (catName && prod.category_name !== catName) return false;
      }
      return true;
    });
  }, [data?.lowStockProducts, categoryId, categories]);

  const kpis = data?.kpis || {};
  const transfersScheduled = kpis.transfersScheduled ?? kpis.pendingTransfers ?? kpis.internalTransfers ?? 0;

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 w-72 bg-slate-100 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 h-28 animate-pulse flex flex-col justify-between">
              <div className="h-4 w-16 bg-slate-200 rounded"></div>
              <div className="h-7 w-12 bg-slate-300 rounded"></div>
              <div className="h-3 w-20 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time stock valuation and multi-warehouse ledger metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/receipts"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 shadow-xs transition-colors"
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>New Receipt</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-sm text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboard}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold cursor-pointer transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {kpis.lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Low Stock Warning: {kpis.lowStockCount} item{kpis.lowStockCount > 1 ? 's are' : ' is'} at or below reorder threshold
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Immediate replenishment required to prevent stockout in active warehouses.
              </p>
            </div>
          </div>
          <Link
            to="/products"
            className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline flex items-center gap-1 shrink-0 ml-4"
          >
            View Low Stock <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Filter Dashboard Analytics</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition-colors font-medium cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Documents</option>
              <option value="RECEIPT">Receipt (Incoming)</option>
              <option value="DELIVERY">Delivery (Outgoing)</option>
              <option value="TRANSFER">Internal Transfer</option>
              <option value="ADJUSTMENT">Stock Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="READY">Ready</option>
              <option value="DONE">Done</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Warehouse
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Products</span>
            <Boxes className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.totalProducts ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Catalog items</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{kpis.lowStockCount ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Under reorder level</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock</span>
            <PackageX className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{kpis.outOfStockCount ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Zero inventory</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Receipts</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.pendingReceipts ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Draft & ready IN</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Deliveries</span>
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.pendingDeliveries ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Deliveries pending OUT</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Transfers Scheduled</span>
            <ArrowLeftRight className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{transfersScheduled}</div>
          <div className="text-[11px] text-slate-400 mt-1">Internal movements</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Reorder Priority Alerts</h3>
              <p className="text-xs text-slate-500">Products currently below replenishment threshold</p>
            </div>
            <Link to="/products" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              View all products →
            </Link>
          </div>

          {filteredLowStock.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              No inventory data matches the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase">
                    <th className="pb-3">Product</th>
                    <th className="pb-3">SKU</th>
                    <th className="pb-3 text-right">Available</th>
                    <th className="pb-3 text-right">Min Level</th>
                    <th className="pb-3 text-right">Deficit</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLowStock.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-medium text-slate-900">{prod.name}</td>
                      <td className="py-3 text-xs font-mono text-slate-500">{prod.sku}</td>
                      <td className="py-3 text-right font-semibold text-rose-600">
                        {prod.current_stock} {prod.unit_of_measure}
                      </td>
                      <td className="py-3 text-right text-slate-500">
                        {prod.reorder_level} {prod.unit_of_measure}
                      </td>
                      <td className="py-3 text-right font-bold text-amber-600">
                        +{prod.deficit} {prod.unit_of_measure}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to="/receipts"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          Restock
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <h3 className="font-semibold text-slate-900 mb-1">Stock by Warehouse</h3>
            <p className="text-xs text-slate-500 mb-4">Location volume distribution</p>

            <div className="space-y-3">
              {(!data?.stockByWarehouse || data.stockByWarehouse.length === 0) ? (
                <div className="py-4 text-center text-xs text-slate-400">No warehouse stock data</div>
              ) : (
                data.stockByWarehouse.map((w, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-slate-200/60 rounded text-slate-700">
                        <Warehouse className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium text-slate-800">{w.warehouse_name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">{w.total_units} units</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <h3 className="font-semibold text-slate-900 mb-1">Stock by Category</h3>
            <p className="text-xs text-slate-500 mb-4">Catalog distribution breakdown</p>

            <div className="space-y-3">
              {(!data?.stockByCategory || data.stockByCategory.length === 0) ? (
                <div className="py-4 text-center text-xs text-slate-400">No category stock data</div>
              ) : (
                data.stockByCategory.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded">
                        <Layers className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium text-slate-800">{c.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">{c.total_units} units</div>
                      <div className="text-[10px] text-slate-400">{c.product_count} products</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Recent Movements & Documents</h3>
            <p className="text-xs text-slate-500">Chronological activity feed across operations</p>
          </div>
          <Link to="/ledger" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
            View full stock ledger →
          </Link>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            No inventory data matches the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase">
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Reference</th>
                  <th className="pb-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.slice(0, 8).map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3">
                      <StatusBadge status={act.operation_type} />
                    </td>
                    <td className="py-3 font-medium text-slate-900">{act.product_name}</td>
                    <td className={`py-3 font-semibold ${
                      act.operation_type === 'RECEIPT' 
                        ? 'text-emerald-600' 
                        : act.operation_type === 'DELIVERY' 
                        ? 'text-blue-600' 
                        : 'text-purple-600'
                    }`}>
                      {act.operation_type === 'RECEIPT' ? '+' : act.operation_type === 'DELIVERY' ? '-' : ''}
                      {act.quantity_change} {act.unit_of_measure}
                    </td>
                    <td className="py-3 text-xs text-slate-600">
                      {act.location_name || act.destination_location_name || 'Warehouse'}
                    </td>
                    <td className="py-3 text-xs font-mono text-slate-500">{act.reference_type || 'SYSTEM'}</td>
                    <td className="py-3 text-right text-xs text-slate-400">
                      {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
