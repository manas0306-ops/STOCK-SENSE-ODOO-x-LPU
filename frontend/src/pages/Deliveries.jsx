import React, { useState, useEffect } from 'react';
import { deliveryService, metaService } from '../services/operationServices';
import { productService } from '../services/productService';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { 
  ArrowUpRight, 
  Plus, 
  CheckCircle, 
  RefreshCw, 
  Eye, 
  Trash2, 
  AlertCircle,
  Printer 
} from 'lucide-react';
import { printDeliveryDocument } from '../utils/printDocument';

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 20 }]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await deliveryService.getAll(statusFilter);
      setDeliveries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [custRes, locRes, prodRes] = await Promise.all([
        metaService.getCustomers(),
        metaService.getLocations(),
        productService.getAll(),
      ]);
      setCustomers(custRes.data);
      setLocations(locRes.data);
      setProducts(prodRes.data);
      if (locRes.data.length > 0) setSourceLocationId(locRes.data[0].id);
      if (prodRes.data.length > 0) setItems([{ product_id: prodRes.data[0].id, quantity: 20 }]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchDeliveries();
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
    setSubmitting(true);
    try {
      await deliveryService.create({
        customer_id: customerId || null,
        source_location_id: sourceLocationId,
        items: items.map(itm => ({
          product_id: parseInt(itm.product_id, 10),
          quantity: parseFloat(itm.quantity),
        })),
        status: 'draft',
      });
      setIsCreateOpen(false);
      fetchDeliveries();
    } catch (err) {
      setFormError(err.message || 'Failed to create delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (id) => {
    setActionLoading(true);
    setActionError('');
    setActionMessage('');
    try {
      const res = await deliveryService.getById(id);
      setSelectedDelivery(res.data);
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
      await deliveryService.markReady(id);
      openDetail(id);
      fetchDeliveries();
      setActionMessage('Delivery marked as Ready.');
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
      await deliveryService.validate(id);
      openDetail(id);
      fetchDeliveries();
      setActionMessage('Delivery validated! Stock successfully deducted and recorded in ledger.');
    } catch (err) {
      setActionError(err.message || 'Validation failed: Insufficient stock');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectPrint = async (id) => {
    try {
      const res = await deliveryService.getById(id);
      if (res && res.data) {
        printDeliveryDocument(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Delivery Orders</h1>
          <p className="text-sm text-slate-500">Outbound customer shipments with strict zero-negative-stock validation</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Delivery Order</span>
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
              {st === '' ? 'All Deliveries' : st}
            </button>
          ))}
        </div>

        <button
          onClick={fetchDeliveries}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading delivery orders...</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ArrowUpRight className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No deliveries found</p>
            <p className="text-xs text-slate-400 mt-1">Create a delivery order to fulfill customer requests.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Reference No</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Source Location</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Items / Quantity</th>
                  <th className="py-3.5 px-6 text-right">Created</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-900">
                      {d.reference_no}
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      {d.customer_name || 'Direct Customer'}
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      <div className="font-medium text-slate-900">{d.source_location_name}</div>
                      <div className="text-xs text-slate-400">{d.warehouse_name}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-slate-900">
                      {d.item_count} lines <span className="text-xs text-slate-500">({parseFloat(d.total_quantity).toLocaleString()} total)</span>
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-slate-500">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleDirectPrint(d.id)}
                          title="Print Delivery Slip"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDetail(d.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect / Ship</span>
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
        title="Create Outbound Delivery Order"
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
                Customer Destination
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-blue-500"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Source Warehouse Location *
              </label>
              <select
                required
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-blue-500"
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
                Products to Deliver
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
                          {p.name} ({p.sku}) — Available Total: {p.current_stock} {p.unit_of_measure}
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Draft Delivery'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
        title={selectedDelivery ? `Delivery ${selectedDelivery.reference_no}` : 'Delivery Details'}
        maxWidth="max-w-2xl"
      >
        {selectedDelivery && (
          <div className="space-y-5">
            <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Dispatch Lifecycle: Pick → Pack → Validate
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2.5 rounded-lg border text-center ${
                  selectedDelivery.status === 'draft'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <div className="text-xs font-bold">1. PICK</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {selectedDelivery.status === 'draft' ? 'Awaiting Pick' : 'Items Picked'}
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border text-center ${
                  selectedDelivery.status === 'draft'
                    ? 'bg-slate-800/60 border-slate-700/60 text-slate-500'
                    : selectedDelivery.status === 'ready'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <div className="text-xs font-bold">2. PACK</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {selectedDelivery.status === 'draft'
                      ? 'Pending Pick'
                      : selectedDelivery.status === 'ready'
                      ? 'Packed & Staged'
                      : 'Packed & Sealed'}
                  </div>
                </div>

                <div className={`p-2.5 rounded-lg border text-center ${
                  selectedDelivery.status === 'done'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-500'
                }`}>
                  <div className="text-xs font-bold">3. VALIDATE</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {selectedDelivery.status === 'done' ? 'Stock Deducted & Shipped' : 'Deduct Stock On Ship'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-semibold">Status:</span>
                <div className="mt-1"><StatusBadge status={selectedDelivery.status} /></div>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Dispatch Location:</span>
                <div className="font-semibold text-slate-900 mt-1">
                  {selectedDelivery.warehouse_name} → {selectedDelivery.source_location_name}
                </div>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Customer:</span>
                <div className="font-medium text-slate-800 mt-1">
                  {selectedDelivery.customer_name || 'Direct Customer'}
                </div>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Created By:</span>
                <div className="font-medium text-slate-800 mt-1">
                  {selectedDelivery.created_by_name || 'System'}
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
                Products to Dispatch & Location Availability
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Product Name</th>
                      <th className="py-2.5 px-4 text-right">Available in Location</th>
                      <th className="py-2.5 px-4 text-right">Requested Delivery</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDelivery.items?.map((itm) => {
                      const avail = parseFloat(itm.current_available_stock || 0);
                      const req = parseFloat(itm.quantity);
                      const isShort = selectedDelivery.status !== 'done' && avail < req;

                      return (
                        <tr key={itm.id} className={isShort ? 'bg-rose-50/50' : ''}>
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {itm.product_name}
                            <div className="text-[11px] font-mono text-slate-400">{itm.sku}</div>
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-700">
                            {avail.toLocaleString()} {itm.unit_of_measure}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-blue-700">
                            {req.toLocaleString()} {itm.unit_of_measure}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {selectedDelivery.status === 'done' ? (
                              <span className="text-emerald-700 font-semibold text-[11px]">Dispatched</span>
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
                {selectedDelivery.status === 'done' 
                  ? `Validated at ${new Date(selectedDelivery.validated_at).toLocaleString()}` 
                  : 'Document pending dispatch'}
              </span>

              <div className="flex items-center gap-2">
                {selectedDelivery.status === 'draft' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleMarkReady(selectedDelivery.id)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    Pick & Stage for Packing
                  </button>
                )}

                {selectedDelivery.status !== 'done' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleValidate(selectedDelivery.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Validate Shipment (Deduct Stock)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => printDeliveryDocument(selectedDelivery)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  <span>Print Delivery Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDelivery(null)}
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
