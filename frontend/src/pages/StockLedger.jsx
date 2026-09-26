import React, { useState, useEffect } from 'react';
import { ledgerService } from '../services/operationServices';
import { productService } from '../services/productService';
import StatusBadge from '../components/StatusBadge';
import { ClipboardList, RefreshCw, Filter, Download } from 'lucide-react';
import { exportToCSV } from '../utils/csvExport';

export default function StockLedger() {
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedOperation, setSelectedOperation] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await productService.getAll();
      setProducts(res.data);
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
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
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
    exportToCSV(`stocksense_ledger_${dateStr}`, columns, logs);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [selectedProduct, selectedOperation]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stock Ledger Audit Trail</h1>
          <p className="text-sm text-slate-500">Immutable ledger of every receipt, delivery, transfer, and adjustment</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export to CSV</span>
          </button>
          <button
            onClick={fetchLedger}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        <div>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:border-slate-800"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedOperation}
            onChange={(e) => setSelectedOperation(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:border-slate-800"
          >
            <option value="">All Operation Types</option>
            <option value="RECEIPT">RECEIPT (Incoming)</option>
            <option value="DELIVERY">DELIVERY (Outgoing)</option>
            <option value="TRANSFER_OUT">TRANSFER_OUT</option>
            <option value="TRANSFER_IN">TRANSFER_IN</option>
            <option value="ADJUSTMENT">ADJUSTMENT (Variance)</option>
          </select>
        </div>

        {(selectedProduct || selectedOperation) && (
          <button
            onClick={() => {
              setSelectedProduct('');
              setSelectedOperation('');
            }}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 underline cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Querying stock ledger audit history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ClipboardList className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No ledger transactions found</p>
            <p className="text-xs text-slate-400 mt-1">Transactions appear automatically when stock operations are validated.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Operation Type</th>
                  <th className="py-3.5 px-6">Product & SKU</th>
                  <th className="py-3.5 px-6">Location Movement</th>
                  <th className="py-3.5 px-6 text-right">Movement Qty</th>
                  <th className="py-3.5 px-6 text-right">Stock Evolution</th>
                  <th className="py-3.5 px-6">User / Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => {
                  const qty = parseFloat(l.quantity);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                        <div className="font-mono text-slate-700">
                          {new Date(l.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={l.operation_type} type="operation" />
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900">
                        <div>{l.product_name}</div>
                        <div className="text-xs font-mono text-slate-400">{l.sku}</div>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-700">
                        {l.source_location_name ? (
                          <span>{l.source_location_name} ({l.source_warehouse_name})</span>
                        ) : (
                          <span className="text-slate-400">SUPPLIER IN</span>
                        )}
                        <span className="mx-2 text-slate-300">→</span>
                        {l.destination_location_name ? (
                          <span>{l.destination_location_name} ({l.destination_warehouse_name})</span>
                        ) : (
                          <span className="text-slate-400">CUSTOMER OUT</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900">
                        {qty > 0 ? `+${qty}` : qty} {l.unit_of_measure}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-xs">
                        <span className="text-slate-400">{parseFloat(l.previous_stock).toLocaleString()}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <span className="font-bold text-slate-900">{parseFloat(l.new_stock).toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-600">
                        {l.user_name || 'System Auto'}
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
