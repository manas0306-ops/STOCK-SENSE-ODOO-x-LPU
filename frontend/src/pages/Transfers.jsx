import React, { useState, useEffect } from 'react';
import { transferService, metaService } from '../services/operationServices';
import { productService } from '../services/productService';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { 
  ArrowLeftRight, 
  Plus, 
  CheckCircle, 
  RefreshCw, 
  Eye, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 20 }]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await transferService.getAll(statusFilter);
      setTransfers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [locRes, prodRes] = await Promise.all([
        metaService.getLocations(),
        productService.getAll(),
      ]);
      setLocations(locRes.data);
      setProducts(prodRes.data);
      if (locRes.data.length >= 2) {
        setSourceLocationId(locRes.data[0].id);
        setDestinationLocationId(locRes.data[1].id);
      }
      if (prodRes.data.length > 0) setItems([{ product_id: prodRes.data[0].id, quantity: 20 }]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter]);

  const handleAddItem = () => {
    setItems([...items, { product_id: products[0]?.id || '', quantity: 10 }]);
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
    if (Number(sourceLocationId) === Number(destinationLocationId)) {
      setFormError('Source and destination locations cannot be the same!');
      return;
    }

    setSubmitting(true);
    try {
      await transferService.create({
        source_location_id: sourceLocationId,
        destination_location_id: destinationLocationId,
        items: items.map(itm => ({
          product_id: parseInt(itm.product_id, 10),
          quantity: parseFloat(itm.quantity),
        })),
        status: 'draft',
      });
      setIsCreateOpen(false);
      fetchTransfers();
    } catch (err) {
      setFormError(err.message || 'Failed to create internal transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (id) => {
    setActionLoading(true);
    setActionError('');
    setActionMessage('');
    try {
      const res = await transferService.getById(id);
      setSelectedTransfer(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReady = async (id) => {
    setActionLoading(true);
    setActionError('');
    setActionMessage('');
    try {
      await transferService.markReady(id);
      openDetail(id);
      fetchTransfers();
      setActionMessage('Transfer marked as Ready.');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async (id) => {
    setActionLoading(true);
    setActionError('');
    setActionMessage('');
    try {
      await transferService.validate(id);
      openDetail(id);
      fetchTransfers();
      setActionMessage('Transfer executed atomically! Both source and destination updated in ledger.');
    } catch (err) {
      setActionError(err.message || 'Validation failed: Insufficient source stock');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Internal Transfers</h1>
          <p className="text-sm text-slate-500">Atomic intra-warehouse and inter-warehouse stock relocations</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-500 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Transfer</span>
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
              {st === '' ? 'All Transfers' : st}
            </button>
          ))}
        </div>

        <button
          onClick={fetchTransfers}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-6 w-6 text-purple-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading transfers...</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ArrowLeftRight className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No transfers found</p>
            <p className="text-xs text-slate-400 mt-1">Create an internal transfer to relocate stock between locations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Reference No</th>
                  <th className="py-3.5 px-6">Source Location</th>
                  <th className="py-3.5 px-6">Destination Location</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Items / Quantity</th>
                  <th className="py-3.5 px-6 text-right">Created</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-900">
                      {t.reference_no}
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      <div className="font-medium text-slate-900">{t.source_location_name}</div>
                      <div className="text-xs text-slate-400">{t.source_warehouse_name}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      <div className="font-medium text-slate-900">{t.destination_location_name}</div>
                      <div className="text-xs text-slate-400">{t.destination_warehouse_name}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-slate-900">
                      {t.item_count} lines <span className="text-xs text-slate-500">({parseFloat(t.total_quantity).toLocaleString()} total)</span>
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-slate-500">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openDetail(t.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect / Transfer</span>
                      </button>
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
        title="Create Internal Stock Transfer"
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
                Source Location (From) *
              </label>
              <select
                required
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-purple-500"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.warehouse_name} → {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Destination Location (To) *
              </label>
              <select
                required
                value={destinationLocationId}
                onChange={(e) => setDestinationLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-purple-500"
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
                Products to Relocate
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
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
                          {p.name} ({p.sku}) — Total: {p.current_stock} {p.unit_of_measure}
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
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Draft Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!selectedTransfer}
        onClose={() => setSelectedTransfer(null)}
        title={selectedTransfer ? `Transfer ${selectedTransfer.reference_no}` : 'Transfer Details'}
        maxWidth="max-w-2xl"
      >
        {selectedTransfer && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-semibold">Status:</span>
                <div className="mt-1"><StatusBadge status={selectedTransfer.status} /></div>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Route:</span>
                <div className="font-semibold text-slate-900 mt-1">
                  {selectedTransfer.source_location_name} → {selectedTransfer.destination_location_name}
                </div>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Warehouses:</span>
                <div className="font-medium text-slate-800 mt-1">
                  {selectedTransfer.source_warehouse_name} → {selectedTransfer.destination_warehouse_name}
                </div>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Created By:</span>
                <div className="font-medium text-slate-800 mt-1">
                  {selectedTransfer.created_by_name || 'System'}
                </div>
              </div>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{actionMessage}</span>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Items to Relocate
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Product Name</th>
                      <th className="py-2.5 px-4 text-right">Available in Source</th>
                      <th className="py-2.5 px-4 text-right">Transfer Quantity</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTransfer.items?.map((itm) => {
                      const avail = parseFloat(itm.source_available_stock || 0);
                      const req = parseFloat(itm.quantity);
                      const isShort = selectedTransfer.status !== 'done' && avail < req;

                      return (
                        <tr key={itm.id} className={isShort ? 'bg-rose-50/50' : ''}>
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {itm.product_name}
                            <div className="text-[11px] font-mono text-slate-400">{itm.sku}</div>
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-700">
                            {avail.toLocaleString()} {itm.unit_of_measure}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-purple-700">
                            {req.toLocaleString()} {itm.unit_of_measure}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {selectedTransfer.status === 'done' ? (
                              <span className="text-emerald-700 font-semibold text-[11px]">Transferred</span>
                            ) : isShort ? (
                              <span className="text-rose-700 font-bold text-[11px] bg-rose-100 px-2 py-0.5 rounded-full">
                                Short: -{req - avail}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-100 px-2 py-0.5 rounded-full">
                                Available
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {selectedTransfer.status === 'done' 
                  ? `Validated at ${new Date(selectedTransfer.validated_at).toLocaleString()}` 
                  : 'Document pending transfer'}
              </span>

              <div className="flex items-center gap-2">
                {selectedTransfer.status === 'draft' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleMarkReady(selectedTransfer.id)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    Mark Ready
                  </button>
                )}

                {selectedTransfer.status !== 'done' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleValidate(selectedTransfer.id)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Execute Atomic Transfer</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedTransfer(null)}
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
