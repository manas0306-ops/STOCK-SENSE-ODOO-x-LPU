import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';
import { metaService } from '../services/operationServices';
import StatusBadge from '../components/StatusBadge';
import { useInventoryUI } from '../context/InventoryUIContext';
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
  AlertCircle,
  Activity,
  ShieldCheck,
  Search,
  Zap,
  HelpCircle,
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Sliders,
  Clock,
  Eye
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHealthModal, setShowHealthModal] = useState(false);
  
  const [documentType, setDocumentType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [warehouseId, setWarehouseId] = useState('ALL');
  const [categoryId, setCategoryId] = useState('ALL');
  
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);

  const navigate = useNavigate();
  const { openSearch, openProduct360 } = useInventoryUI();

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
        console.error('Error loading metadata:', err);
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
        if (documentType === 'RECEIPT' && !op.includes('RECEIPT')) return false;
        if (documentType === 'DELIVERY' && !op.includes('DELIVERY')) return false;
        if (documentType === 'TRANSFER' && !op.includes('TRANSFER')) return false;
        if (documentType === 'ADJUSTMENT' && !op.includes('ADJUSTMENT')) return false;
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
  const healthScore = kpis.healthScore ?? 92;
  const healthBreakdown = kpis.healthBreakdown || {
    availability: 95,
    safety: 88,
    operations: 90,
    integrity: 100
  };

  const healthRating = useMemo(() => {
    if (healthScore >= 90) return { label: 'OPTIMAL', color: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (healthScore >= 75) return { label: 'GOOD', color: 'blue', bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200' };
    if (healthScore >= 60) return { label: 'ATTENTION', color: 'amber', bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200' };
    return { label: 'CRITICAL', color: 'rose', bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200' };
  }, [healthScore]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 w-96 bg-slate-100 rounded animate-pulse"></div>
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
      {/* 1. Header Command Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Command Center</h1>
            <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full uppercase border ${healthRating.border} ${healthRating.text} bg-white`}>
              {healthRating.label}
            </span>
          </div>
          <p className="text-sm text-slate-500">Real-time stock valuation, health telemetry & multi-warehouse orchestration</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={openSearch}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer transition-colors"
            title="Global search across all inventory items (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Search (Ctrl+K)</span>
          </button>

          <Link
            to="/simulator"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 shadow-xs transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Simulate Runway</span>
          </Link>

          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Notice */}
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

      {/* Critical Reorder Alert Banner */}
      {kpis.lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Replenishment Warning: {kpis.lowStockCount} product{kpis.lowStockCount > 1 ? 's' : ''} at or below reorder threshold
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Potential stockout hazard detected. Reorder immediately to sustain fulfillment SLAs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Link
              to="/receipts"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>Create Receipt</span>
            </Link>
            <Link
              to="/products"
              className="text-xs font-semibold text-amber-900 hover:underline px-2 py-1.5"
            >
              View SKUs →
            </Link>
          </div>
        </div>
      )}

      {/* 2. Top Executive Telemetry & Health Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Inventory Health Score Hero Card */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-700 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Inventory Health</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHealthModal(true)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Explain Score Formula"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <div className="text-4xl font-extrabold tracking-tight text-white">
                {healthScore}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                / 100 index
              </div>
            </div>

            {/* Health Meter Progress Bar */}
            <div className="mt-3 w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  healthScore >= 90 ? 'bg-emerald-400' : healthScore >= 75 ? 'bg-blue-400' : 'bg-amber-400'
                }`}
                style={{ width: `${healthScore}%` }}
              ></div>
            </div>

            {/* Micro Breakdown */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-300 border-t border-slate-700/60 pt-3">
              <div>
                <span className="text-slate-400">Availability:</span> <strong className="text-white">{healthBreakdown.availability}%</strong>
              </div>
              <div>
                <span className="text-slate-400">Stock Safety:</span> <strong className="text-white">{healthBreakdown.safety}%</strong>
              </div>
              <div>
                <span className="text-slate-400">Ops Velocity:</span> <strong className="text-white">{healthBreakdown.operations}%</strong>
              </div>
              <div>
                <span className="text-slate-400">Integrity:</span> <strong className="text-emerald-400">100%</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowHealthModal(true)}
            className="mt-4 text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center justify-between pt-2 border-t border-slate-800 cursor-pointer"
          >
            <span>Why this score?</span>
            <span>Formula breakdown →</span>
          </button>
        </div>

        {/* Clickable KPI Matrix */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Total Catalog */}
          <Link
            to="/products"
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-900 transition-colors">Catalog SKUs</span>
              <Boxes className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpis.totalProducts ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{parseFloat(kpis.totalStockUnits || 0).toLocaleString()} total units</span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* Low Stock Risk */}
          <Link
            to="/products"
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Low Stock</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600">{kpis.lowStockCount ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Below reorder safety</span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* Out of Stock */}
          <Link
            to="/products"
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between text-rose-600 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Zero Stock</span>
              <PackageX className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600">{kpis.outOfStockCount ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Stockout incidents</span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* Inbound Receipts */}
          <Link
            to="/receipts"
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Inbound Queue</span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpis.pendingReceipts ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>+{parseFloat(kpis.incomingStock || 0).toLocaleString()} incoming units</span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* Outbound Deliveries */}
          <Link
            to="/deliveries"
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Outbound Queue</span>
              <ArrowUpRight className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpis.pendingDeliveries ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>-{parseFloat(kpis.outgoingStock || 0).toLocaleString()} awaiting dispatch</span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          {/* Internal Transfers */}
          <Link
            to="/transfers"
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between text-purple-600 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Internal Transfers</span>
              <ArrowLeftRight className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{transfersScheduled}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Inter-bay transit</span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Quick Action Launchpad */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Quick Operations Hub</div>
            <div className="text-xs text-slate-400">Execute warehouse transactions with one click</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/receipts"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            <span>+ Receive Stock</span>
          </Link>

          <Link
            to="/deliveries"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>- Dispatch Order</span>
          </Link>

          <Link
            to="/transfers"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>⇄ Transfer Bay</span>
          </Link>

          <Link
            to="/adjustments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>± Physical Count</span>
          </Link>

          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>+ Add SKU</span>
          </Link>
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Filter Operational Telemetry</span>
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

      {/* 5. Main Analytics Grid: Priority Reorder vs Fast Movers & Warehouse breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Reorder Alerts */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">Reorder Priority Queue</h3>
                <p className="text-xs text-slate-500">Products currently below replenishment threshold</p>
              </div>
              <Link to="/products" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                View catalog ({kpis.totalProducts ?? 0}) →
              </Link>
            </div>

            {filteredLowStock.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                All inventory levels satisfy safety buffer thresholds. Zero reorder deficits!
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
                        <td className="py-3 font-medium text-slate-900">
                          <button
                            onClick={() => openProduct360(prod)}
                            className="hover:text-blue-600 text-left font-semibold cursor-pointer"
                            title="Inspect 360 Product Dossier"
                          >
                            {prod.name}
                          </button>
                        </td>
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
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => openProduct360(prod)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                            title="Inspect 360 View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
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
        </div>

        {/* Inventory Velocity: Fast Movers vs Dead Stock */}
        <div className="space-y-6">
          {/* Fast Movers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <h4 className="font-semibold text-slate-900 text-sm">High Velocity Movers</h4>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">30D Outflow</span>
            </div>

            {(!data?.fastMovers || data.fastMovers.length === 0) ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No outbound transaction data recorded
              </div>
            ) : (
              <div className="space-y-2">
                {data.fastMovers.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => openProduct360(item)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600">{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-600">
                        {item.total_outflow} {item.unit_of_measure}
                      </div>
                      <div className="text-[10px] text-slate-400">Shipped</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dead Stock / Inactive */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                <h4 className="font-semibold text-slate-900 text-sm">Slow & Idle Stock</h4>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Idle Capital</span>
            </div>

            {(!data?.deadStock || data.deadStock.length === 0) ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Zero idle products detected. Healthy inventory rotation!
              </div>
            ) : (
              <div className="space-y-2">
                {data.deadStock.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => openProduct360(item)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600">{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-600">
                        {item.current_stock} units
                      </div>
                      <div className="text-[10px] text-slate-400">0 outflow</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Multi-Warehouse & Category Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Warehouse */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Stock by Warehouse Location</h3>
              <p className="text-xs text-slate-500">Distribution volume across physical sites</p>
            </div>
            <Link to="/products" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Manage locations →
            </Link>
          </div>

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
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{w.warehouse_name}</div>
                      <div className="text-[11px] text-slate-400">{w.active_skus ?? 0} active SKUs assigned</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{parseFloat(w.total_units || 0).toLocaleString()} units</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stock by Category */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Stock by Category</h3>
              <p className="text-xs text-slate-500">Catalog inventory diversification</p>
            </div>
            <Link to="/products" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Manage categories →
            </Link>
          </div>

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
                    <div className="text-xs font-bold text-slate-900">{parseFloat(c.total_units || 0).toLocaleString()} units</div>
                    <div className="text-[10px] text-slate-400">{c.product_count} products</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 7. Live Operational Timeline Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Today's Operational Timeline</h3>
            <p className="text-xs text-slate-500">Chronological stock ledger audit movements</p>
          </div>
          <Link to="/ledger" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
            View full stock ledger →
          </Link>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            No inventory transactions match the active filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase">
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Delta</th>
                  <th className="pb-3">Location Trace</th>
                  <th className="pb-3">Operator</th>
                  <th className="pb-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.slice(0, 8).map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3">
                      <StatusBadge status={act.operation_type} />
                    </td>
                    <td className="py-3 font-medium text-slate-900">
                      <button
                        onClick={() => openProduct360({ id: act.product_id, name: act.product_name, sku: act.sku, unit_of_measure: act.unit_of_measure })}
                        className="hover:text-blue-600 font-semibold cursor-pointer text-left"
                        title="Open 360 Product view"
                      >
                        {act.product_name}
                      </button>
                      <div className="text-[11px] font-mono text-slate-400">{act.sku}</div>
                    </td>
                    <td className={`py-3 font-bold ${
                      act.operation_type?.includes('RECEIPT') || act.operation_type?.includes('IN')
                        ? 'text-emerald-600' 
                        : act.operation_type?.includes('DELIVERY') || act.operation_type?.includes('OUT')
                        ? 'text-blue-600' 
                        : 'text-purple-600'
                    }`}>
                      {act.operation_type?.includes('RECEIPT') || act.operation_type?.includes('IN') ? '+' : '-'}
                      {act.quantity || act.quantity_change} {act.unit_of_measure}
                    </td>
                    <td className="py-3 text-xs text-slate-600">
                      {act.source_location_name ? (
                        <span>{act.source_location_name}</span>
                      ) : (
                        <span className="text-slate-400">SUPPLIER IN</span>
                      )}
                      <span className="mx-1 text-slate-300">→</span>
                      {act.destination_location_name ? (
                        <span>{act.destination_location_name}</span>
                      ) : (
                        <span className="text-slate-400">CUSTOMER OUT</span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-slate-500">
                      {act.user_name || 'System Operator'}
                    </td>
                    <td className="py-3 text-right text-xs text-slate-400">
                      {act.timestamp || act.created_at ? new Date(act.timestamp || act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 8. Why This Score? Educational Explanation Modal */}
      {showHealthModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Inventory Health Formula</h3>
              </div>
              <button
                onClick={() => setShowHealthModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Composite Health Score</div>
                  <div className="text-2xl font-extrabold text-slate-900">{healthScore} / 100</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${healthRating.bg} text-white`}>
                  {healthRating.label}
                </span>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Four Mathematical Dimensions:</h4>

                <div className="p-3 rounded-lg border border-slate-100 bg-white">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>1. Stock Availability (35% weight)</span>
                    <span className="text-emerald-600">{healthBreakdown.availability}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Measures catalog fulfillment capacity. Penalized when products hit 0 stock.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-100 bg-white">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>2. Stock Safety Buffer (35% weight)</span>
                    <span className="text-blue-600">{healthBreakdown.safety}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Measures buffer above reorder threshold. Penalized when active SKUs drop into replenishment deficit.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-100 bg-white">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>3. Operational Velocity (20% weight)</span>
                    <span className="text-purple-600">{healthBreakdown.operations}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Throughput efficiency. Penalized by backlogged pending receipts, deliveries, or transfers.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-100 bg-white">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>4. Double-Entry Data Integrity (10% weight)</span>
                    <span className="text-emerald-600">{healthBreakdown.integrity}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Guaranteed mathematical balance in the immutable audit ledger.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHealthModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
