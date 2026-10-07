import React, { useState, useEffect } from 'react';
import { adjustmentService, metaService } from '../services/operationServices';
import { productService } from '../services/productService';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { 
  Sliders, 
  Plus, 
  CheckCircle, 
  RefreshCw, 
  AlertCircle 
} from 'lucide-react';

export default function Adjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [systemQuantity, setSystemQuantity] = useState(0);
  const [countedQuantity, setCountedQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const res = await adjustmentService.getAll();
      setAdjustments(res.data?.items || res.data || []);
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
      const locs = locRes.data?.items || locRes.data || [];
      const prods = prodRes.data?.items || prodRes.data || [];
      setLocations(locs);
      setProducts(prods);
      if (locs.length > 0) setLocationId(locs[0].id);
      if (prods.length > 0) setProductId(prods[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMeta();
    fetchAdjustments();
  }, []);

  useEffect(() => {
    async function updateSystemQty() {
      if (!productId || !locationId) return;
      try {
        const prod = await productService.getById(productId);
        const locStock = prod.data.stock_by_location?.find(
          l => Number(l.location_id) === Number(locationId)
        );
        const qty = locStock ? parseFloat(locStock.quantity) : 0;
        setSystemQuantity(qty);
      } catch (err) {
        console.error(err);
      }
    }
    updateSystemQty();
  }, [productId, locationId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!reason.trim()) {
      setFormError('A valid audit reason is required for physical inventory adjustments');
      return;
    }

    setSubmitting(true);
    try {
      await adjustmentService.create({
        product_id: parseInt(productId, 10),
        location_id: parseInt(locationId, 10),
        counted_quantity: parseFloat(countedQuantity),
        reason: reason.trim(),
        auto_validate: true,
      });
      setIsCreateOpen(false);
      setCountedQuantity('');
      setReason('');
      fetchAdjustments();
    } catch (err) {
      setFormError(err.message || 'Failed to apply inventory adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const delta = countedQuantity !== '' ? (parseFloat(countedQuantity) - systemQuantity) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Adjustments</h1>
          <p className="text-sm text-slate-500">Reconcile physical stock counts with system recorded quantities</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Stock Adjustment</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-6 w-6 text-purple-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading adjustments history...</p>
          </div>
        ) : adjustments.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Sliders className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No adjustments recorded</p>
            <p className="text-xs text-slate-400 mt-1">Perform a count reconciliation to record physical inventory variance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Reference No</th>
                  <th className="py-3.5 px-6">Product & SKU</th>
                  <th className="py-3.5 px-6">Location</th>
                  <th className="py-3.5 px-6 text-right">System Qty</th>
                  <th className="py-3.5 px-6 text-right">Counted Qty</th>
                  <th className="py-3.5 px-6 text-right">Variance / Delta</th>
                  <th className="py-3.5 px-6">Reason</th>
                  <th className="py-3.5 px-6 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.map((a) => {
                  const diff = parseFloat(a.difference);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-mono font-semibold text-slate-900">
                        {a.reference_no}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900">
                        <div>{a.product_name}</div>
                        <div className="text-xs font-mono text-slate-400">{a.sku}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-700">
                        <div className="font-medium text-slate-900">{a.location_name}</div>
                        <div className="text-xs text-slate-400">{a.warehouse_name}</div>
                      </td>
                      <td className="py-4 px-6 text-right text-slate-600">
                        {parseFloat(a.system_quantity).toLocaleString()} {a.unit_of_measure}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900">
                        {parseFloat(a.counted_quantity).toLocaleString()} {a.unit_of_measure}
                      </td>
                      <td className="py-4 px-6 text-right font-bold">
                        {diff > 0 ? (
                          <span className="text-emerald-600">+{diff} {a.unit_of_measure}</span>
                        ) : diff < 0 ? (
                          <span className="text-rose-600">{diff} {a.unit_of_measure}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-600 max-w-xs truncate" title={a.reason}>
                        {a.reason}
                      </td>
                      <td className="py-4 px-6 text-right text-xs text-slate-500">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Physical Inventory Adjustment Reconciliation"
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
                Product *
              </label>
              <select
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-slate-800"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Location *
              </label>
              <select
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-slate-800"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.warehouse_name} → {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">System Current</div>
              <div className="text-xl font-bold text-slate-700 mt-1">{systemQuantity}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Physical Count</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {countedQuantity !== '' ? countedQuantity : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Variance (Delta)</div>
              <div className={`text-xl font-bold mt-1 ${
                delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-500'
              }`}>
                {countedQuantity !== '' ? (delta > 0 ? `+${delta}` : delta) : '—'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Actual Physical Counted Quantity *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={countedQuantity}
              onChange={(e) => setCountedQuantity(e.target.value)}
              placeholder="e.g. 77"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Audit Reason / Discrepancy Explanation *
            </label>
            <textarea
              required
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. 3 kg damaged in storage during heavy rainfall in aisle 3"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-slate-800"
            ></textarea>
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
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Applying...' : 'Apply Count Reconciliation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
