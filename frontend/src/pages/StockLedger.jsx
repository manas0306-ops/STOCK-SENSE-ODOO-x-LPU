import React, { useState, useEffect, useMemo } from 'react';
import { ledgerService } from '../services/operationServices';
import { productService } from '../services/productService';
import StatusBadge from '../components/StatusBadge';
import { useInventoryUI } from '../context/InventoryUIContext';
import { 
  ClipboardList, 
  RefreshCw, 
  Filter, 
  Download, 
  ShieldCheck, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  RotateCcw,
  Search,
  Eye,
  Lock,
  Layers,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { exportToCSV } from '../utils/csvExport';

export default function StockLedger() {
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedOperation, setSelectedOperation] = useState('');
  const [dateRange, setDateRange] = useState('ALL');

  const { openProduct360 } = useInventoryUI();

  const fetchProducts = async () => {
    try {
      const res = await productService.getAll();
      setProducts(res.data?.items || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await ledgerService.getAll({
        productId: selectedProduct,
        operationType: selectedOperation,
      });
      setLogs(res.data?.items || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [selectedProduct, selectedOperation]);

  // Client-side filtering for Search and Date Range
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = l.product_name?.toLowerCase().includes(q);
        const matchesSku = l.sku?.toLowerCase().includes(q);
        const matchesRef = l.reference_type?.toLowerCase().includes(q);
        const matchesUser = l.user_name?.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesRef && !matchesUser) return false;
      }

      if (dateRange !== 'ALL') {
        const itemDate = new Date(l.timestamp);
        const now = new Date();
        if (dateRange === 'TODAY') {
          const isToday = itemDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (dateRange === '7D') {
          const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 7) return false;
        } else if (dateRange === '30D') {
          const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 30) return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, dateRange]);

  // Telemetry Aggregates
  const telemetry = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    filteredLogs.forEach((l) => {
      const q = parseFloat(l.quantity || 0);
      const op = (l.operation_type || '').toUpperCase();
      if (op.includes('RECEIPT') || op.includes('IN')) {
        inflow += q;
      } else if (op.includes('DELIVERY') || op.includes('OUT')) {
        outflow += q;
      }
    });
    return {
      totalCount: filteredLogs.length,
      inflow,
      outflow,
      netDelta: inflow - outflow,
    };
  }, [filteredLogs]);

  const handleExportCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      return;
    }

    const columns = [
      { label: 'Timestamp', accessor: (l) => new Date(l.timestamp).toISOString() },
      { label: 'Operation Type', key: 'operation_type' },
      { label: 'Product Name', key: 'product_name' },
      { label: 'SKU', key: 'sku' },
      { label: 'Source Location', accessor: (l) => l.source_location_name ? `${l.source_location_name} (${l.source_warehouse_name || ''})` : 'SUPPLIER IN' },
      { label: 'Destination Location', accessor: (l) => l.destination_location_name ? `${l.destination_location_name} (${l.destination_warehouse_name || ''})` : 'CUSTOMER OUT' },
      { label: 'Movement Quantity', accessor: (l) => parseFloat(l.quantity) },
      { label: 'Unit', key: 'unit_of_measure' },
      { label: 'Previous Balance', accessor: (l) => parseFloat(l.previous_stock) },
      { label: 'Resulting Balance', accessor: (l) => parseFloat(l.new_stock) },
      { label: 'Operator', accessor: (l) => l.user_name || 'System' },
      { label: 'Reference Type', key: 'reference_type' },
      { label: 'Reference ID', key: 'reference_id' }
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(`stocksense_ledger_${dateStr}`, columns, filteredLogs);
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedProduct('');
    setSelectedOperation('');
    setDateRange('ALL');
  };

  const hasActiveFilters = searchQuery || selectedProduct || selectedOperation || dateRange !== 'ALL';

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Immutability Seal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stock Ledger Audit Trail</h1>
            <span 
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
              title="Cryptographically immutable append-only ledger"
            >
              <Lock className="h-3 w-3 text-emerald-600" />
              <span>Immutable Ledger</span>
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Append-only double-entry audit records of every stock receipt, delivery, transfer, and adjustment
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download audit records as CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchLedger}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Audit Telemetry Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Audit Entries</span>
            <ClipboardList className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{telemetry.totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Total movements tracked</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1 flex items-center justify-between">
            <span>Total Inflow</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">+{telemetry.inflow.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Receipts & incoming bays</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1 flex items-center justify-between">
            <span>Total Outflow</span>
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">-{telemetry.outflow.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Deliveries & dispatches</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1 flex items-center justify-between">
            <span>Net Delta</span>
            <ArrowLeftRight className="h-4 w-4 text-purple-500" />
          </div>
          <div className={`text-2xl font-bold ${telemetry.netDelta >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {telemetry.netDelta >= 0 ? `+${telemetry.netDelta.toLocaleString()}` : telemetry.netDelta.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Physical balance difference</div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Filter Ledger Stream</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition-colors font-medium cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Quick Search */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search product, SKU, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Product Filter */}
          <div>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">All Catalog Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Operation Type Filter */}
          <div>
            <select
              value={selectedOperation}
              onChange={(e) => setSelectedOperation(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">All Operation Types</option>
              <option value="RECEIPT">RECEIPT (Incoming)</option>
              <option value="DELIVERY">DELIVERY (Outgoing)</option>
              <option value="TRANSFER_OUT">TRANSFER_OUT (Bay source)</option>
              <option value="TRANSFER_IN">TRANSFER_IN (Bay dest)</option>
              <option value="ADJUSTMENT">ADJUSTMENT (Variance reconciliation)</option>
            </select>
          </div>

          {/* Date Range Preset */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="7D">Past 7 Days</option>
              <option value="30D">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Ledger Table with Double-Entry Audit Visual Progression */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Querying immutable stock ledger records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ClipboardList className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No ledger transactions match criteria</p>
            <p className="text-xs text-slate-400 mt-1">
              Double-entry audit entries are generated automatically as operations are validated.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-5">Operation</th>
                  <th className="py-3 px-5">Product & SKU</th>
                  <th className="py-3 px-5">Double-Entry Location Flow</th>
                  <th className="py-3 px-5 text-right">Movement Delta</th>
                  <th className="py-3 px-5 text-right">Stock Evolution</th>
                  <th className="py-3 px-5">Operator</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((l) => {
                  const qty = parseFloat(l.quantity || 0);
                  const prev = parseFloat(l.previous_stock || 0);
                  const nextStock = parseFloat(l.new_stock || 0);
                  const op = (l.operation_type || '').toUpperCase();
                  const isInbound = op.includes('RECEIPT') || op.includes('IN');
                  const isOutbound = op.includes('DELIVERY') || op.includes('OUT');

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-5 text-xs text-slate-500 whitespace-nowrap">
                        <div className="font-mono text-slate-700">
                          {new Date(l.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      {/* Operation Type */}
                      <td className="py-3.5 px-5">
                        <StatusBadge status={l.operation_type} type="operation" />
                      </td>

                      {/* Product Name & SKU */}
                      <td className="py-3.5 px-5 font-medium text-slate-900">
                        <button
                          onClick={() => openProduct360({ id: l.product_id, name: l.product_name, sku: l.sku, unit_of_measure: l.unit_of_measure })}
                          className="hover:text-blue-600 text-left font-semibold cursor-pointer block"
                          title="View Product 360"
                        >
                          {l.product_name}
                        </button>
                        <div className="text-xs font-mono text-slate-400">{l.sku}</div>
                      </td>

                      {/* Location Progression */}
                      <td className="py-3.5 px-5 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5">
                          {l.source_location_name ? (
                            <span className="font-medium text-slate-800">
                              {l.source_location_name}
                              {l.source_warehouse_name ? <span className="text-[10px] text-slate-400 block">{l.source_warehouse_name}</span> : null}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                              SUPPLIER IN
                            </span>
                          )}
                          <span className="text-slate-400">→</span>
                          {l.destination_location_name ? (
                            <span className="font-medium text-slate-800">
                              {l.destination_location_name}
                              {l.destination_warehouse_name ? <span className="text-[10px] text-slate-400 block">{l.destination_warehouse_name}</span> : null}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold">
                              CUSTOMER OUT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Movement Delta */}
                      <td className="py-3.5 px-5 text-right font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          isInbound 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : isOutbound 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {isInbound ? `+${qty}` : isOutbound ? `-${qty}` : `±${qty}`} {l.unit_of_measure}
                        </span>
                      </td>

                      {/* Stock Evolution */}
                      <td className="py-3.5 px-5 text-right font-mono text-xs whitespace-nowrap">
                        <span className="text-slate-400">{prev.toLocaleString()}</span>
                        <span className="mx-1.5 text-slate-300">→</span>
                        <span className="font-bold text-slate-900">{nextStock.toLocaleString()}</span>
                      </td>

                      {/* Operator */}
                      <td className="py-3.5 px-5 text-xs text-slate-600 whitespace-nowrap">
                        {l.user_name || 'System Auto'}
                      </td>

                      {/* Inspect 360 Action */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => openProduct360({ id: l.product_id, name: l.product_name, sku: l.sku, unit_of_measure: l.unit_of_measure })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                          title="Inspect Product 360 Dossier"
                        >
                          <Eye className="h-3 w-3 text-slate-500" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
