import React, { useState, useEffect } from 'react';
import { receiptService, metaService } from '../services/operationServices';
import { productService } from '../services/productService';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { 
  ArrowDownLeft, 
  Plus, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Eye, 
  Trash2, 
  AlertCircle,
  Printer 
} from 'lucide-react';
import { printReceiptDocument } from '../utils/printDocument';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 100 }]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await receiptService.getAll(statusFilter);
      setReceipts(res.data?.items || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [supRes, locRes, prodRes] = await Promise.all([
        metaService.getSuppliers(),
        metaService.getLocations(),
        productService.getAll(),
      ]);
      setSuppliers(supRes.data?.items || supRes.data || []);
      setLocations(locRes.data?.items || locRes.data || []);
      const prods = prodRes.data?.items || prodRes.data || [];
      setProducts(prods);
      if (locRes.data?.length > 0) setDestinationLocationId(locRes.data[0].id);
      if (prods.length > 0) setItems([{ product_id: prods[0].id, quantity: 100 }]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [statusFilter]);

  const handleAddItem = () => {
    setItems([...items, { product_id: products[0]?.id || '', quantity: 50 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const next = [...items];
    next[index][field] = value;
    setItems(next);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await receiptService.create({
        supplier_id: supplierId || null,
        destination_location_id: destinationLocationId,
        items: items.map(itm => ({
          product_id: parseInt(itm.product_id, 10),
          quantity: parseFloat(itm.quantity),
        })),
        status: 'draft',
      });
      setIsCreateOpen(false);
      fetchReceipts();
    } catch (err) {
      setFormError(err.message || 'Failed to create receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (id) => {
    setActionLoading(true);
    setActionMessage('');
    try {
      const res = await receiptService.getById(id);
      setSelectedReceipt(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReady = async (id) => {
    setActionLoading(true);
    setActionMessage('');
    try {
      await receiptService.markReady(id);
      openDetail(id);
      fetchReceipts();
      setActionMessage('Receipt marked as Ready for stock intake.');
    } catch (err) {
      setActionMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async (id) => {
    setActionLoading(true);
    setActionMessage('');
    try {
      const res = await receiptService.validate(id);
      openDetail(id);
      fetchReceipts();
      setActionMessage('Stock successfully incremented and recorded in ledger!');
    } catch (err) {
      setActionMessage(err.message || 'Validation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (id) => {
    setActionLoading(true);
    setActionMessage('');
    try {
      await receiptService.cancel(id);
      openDetail(id);
      fetchReceipts();
      setActionMessage('Receipt canceled successfully.');
    } catch (err) {
      setActionMessage(err.message || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectPrint = async (id) => {
    try {
      const res = await receiptService.getById(id);
      if (res && res.data) {
        printReceiptDocument(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Incoming Receipts</h1>
          <p className="text-sm text-slate-500">Inbound purchase receipts from suppliers into destination warehouse locations</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Receipt</span>
        </button>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          {['', 'draft', 'ready', 'done'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === '' ? 'All Receipts' : st}
            </button>
          ))}
        </div>

        <button
          onClick={fetchReceipts}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading incoming receipts...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ArrowDownLeft className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No receipts found</p>
            <p className="text-xs text-slate-400 mt-1">Create a receipt to receive stock from suppliers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Reference No</th>
                  <th className="py-3.5 px-6">Supplier</th>
                  <th className="py-3.5 px-6">Destination Location</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Items / Total Qty</th>
                  <th className="py-3.5 px-6 text-right">Created</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-900">
                      {r.reference_no}
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      {r.supplier_name || 'General Supplier'}
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      <div className="font-medium text-slate-900">{r.destination_location_name}</div>
                      <div className="text-xs text-slate-400">{r.warehouse_name}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-slate-900">
                      {r.item_count} lines <span className="text-xs text-slate-500">({parseFloat(r.total_quantity).toLocaleString()} total)</span>
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleDirectPrint(r.id)}
                          title="Print Receipt Note"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDetail(r.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect / Validate</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Incoming Goods Receipt"
        maxWidth="max-w-3xl"
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Destination Warehouse Location *
              </label>
              <select
                required
                value={destinationLocationId}
                onChange={(e) => setDestinationLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.warehouse_name} → {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase">
                Products to Receive
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex-1">
                    <select
                      value={item.product_id}
                      onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800"
                      required
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — [{p.unit_of_measure}]
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      placeholder="Quantity"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Draft Receipt'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title={selectedReceipt ? `Receipt ${selectedReceipt.reference_no}` : 'Receipt Details'}
        maxWidth="max-w-2xl"
      >
        {selectedReceipt && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-semibold">Status:</span>
                <div className="mt-1"><StatusBadge status={selectedReceipt.status} /></div>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Destination:</span>
                <div className="font-semibold text-slate-900 mt-1">
                  {selectedReceipt.warehouse_name} → {selectedReceipt.destination_location_name}
                </div>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Supplier:</span>
                <div className="font-medium text-slate-800 mt-1">
                  {selectedReceipt.supplier_name || 'General Supplier'}
                </div>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Created By:</span>
                <div className="font-medium text-slate-800 mt-1">
                  {selectedReceipt.created_by_name || 'System'}
                </div>
              </div>
            </div>

            {actionMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{actionMessage}</span>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Products in this Receipt
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Product Name</th>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4 text-right">Quantity Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReceipt.items?.map((itm) => (
                      <tr key={itm.id}>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{itm.product_name}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{itm.sku}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                          +{parseFloat(itm.quantity).toLocaleString()} {itm.unit_of_measure}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {selectedReceipt.status === 'done' 
                  ? `Validated at ${new Date(selectedReceipt.validated_at).toLocaleString()}` 
                  : 'Document pending validation'}
              </span>

              <div className="flex items-center gap-2">
                {selectedReceipt.status === 'draft' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleMarkReady(selectedReceipt.id)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    Mark Ready
                  </button>
                )}

                {selectedReceipt.status !== 'done' && selectedReceipt.status !== 'canceled' && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleValidate(selectedReceipt.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Validate & Increase Stock</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleCancel(selectedReceipt.id)}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      Cancel Receipt
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => printReceiptDocument(selectedReceipt)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  <span>Print Receipt Note</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
