import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { metaService } from '../services/operationServices';
import Modal from '../components/Modal';
import { 
  Warehouse, 
  MapPin, 
  Layers, 
  Building2, 
  Users, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function Settings() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'warehouses');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isWhModal, setIsWhModal] = useState(false);
  const [isLocModal, setIsLocModal] = useState(false);
  const [isCatModal, setIsCatModal] = useState(false);
  const [isSupModal, setIsSupModal] = useState(false);
  const [isCustModal, setIsCustModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [newWarehouseId, setNewWarehouseId] = useState('');
  const [newContact, setNewContact] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [whRes, locRes, catRes, supRes, custRes] = await Promise.all([
        metaService.getWarehouses(),
        metaService.getLocations(),
        metaService.getCategories(),
        metaService.getSuppliers(),
        metaService.getCustomers(),
      ]);
      setWarehouses(whRes.data);
      setLocations(locRes.data);
      setCategories(catRes.data);
      setSuppliers(supRes.data);
      setCustomers(custRes.data);
      if (whRes.data.length > 0) setNewWarehouseId(whRes.data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await metaService.createWarehouse({ name: newName });
      setIsWhModal(false);
      setNewName('');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await metaService.createLocation({
        warehouse_id: parseInt(newWarehouseId, 10),
        name: newName,
      });
      setIsLocModal(false);
      setNewName('');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create location');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await metaService.createCategory({ name: newName });
      setIsCatModal(false);
      setNewName('');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await metaService.createSupplier({ name: newName, contact: newContact });
      setIsSupModal(false);
      setNewName('');
      setNewContact('');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await metaService.createCustomer({ name: newName, contact: newContact });
      setIsCustModal(false);
      setNewName('');
      setNewContact('');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings & Multi-Warehouse Configuration</h1>
          <p className="text-sm text-slate-500">Manage warehouses, internal locations, categories, and business partners</p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {[
            { id: 'warehouses', name: 'Warehouses & Locations', icon: Warehouse },
            { id: 'categories', name: 'Product Categories', icon: Layers },
            { id: 'suppliers', name: 'Suppliers', icon: Building2 },
            { id: 'customers', name: 'Customers', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'warehouses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Physical Warehouses</h3>
            <button
              onClick={() => {
                setNewName('');
                setErrorMsg('');
                setIsWhModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Warehouse</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map((wh) => (
              <div key={wh.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-emerald-600" />
                    <span>{wh.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {wh.location_count || 0} designated location(s)
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Warehouse Sub-Locations (Racks, Stores, Aisles)</h3>
            <button
              onClick={() => {
                setNewName('');
                setErrorMsg('');
                setIsLocModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Location</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3 px-6">Location Name</th>
                  <th className="py-3 px-6">Parent Warehouse</th>
                  <th className="py-3 px-6 text-right">Total Units Stored</th>
                  <th className="py-3 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-6 font-semibold text-slate-900 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{loc.name}</span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-600">{loc.warehouse_name}</td>
                    <td className="py-3.5 px-6 text-right font-bold text-slate-800">
                      {parseFloat(loc.total_units_stored || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Product Categories</h3>
            <button
              onClick={() => {
                setNewName('');
                setErrorMsg('');
                setIsCatModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div className="font-semibold text-slate-800">{cat.name}</div>
                <div className="text-xs text-slate-400 font-medium">{cat.product_count || 0} products</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Registered Suppliers</h3>
            <button
              onClick={() => {
                setNewName('');
                setNewContact('');
                setErrorMsg('');
                setIsSupModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Supplier</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3 px-6">Supplier Name</th>
                  <th className="py-3 px-6">Contact Information</th>
                  <th className="py-3 px-6 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">{s.name}</td>
                    <td className="py-3.5 px-6 text-slate-600 text-xs">{s.contact || 'No contact provided'}</td>
                    <td className="py-3.5 px-6 text-right text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Customer Accounts</h3>
            <button
              onClick={() => {
                setNewName('');
                setNewContact('');
                setErrorMsg('');
                setIsCustModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Customer</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3 px-6">Customer Name</th>
                  <th className="py-3 px-6">Contact / Shipping Info</th>
                  <th className="py-3 px-6 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">{c.name}</td>
                    <td className="py-3.5 px-6 text-slate-600 text-xs">{c.contact || 'No contact provided'}</td>
                    <td className="py-3.5 px-6 text-right text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isWhModal} onClose={() => setIsWhModal(false)} title="Add Warehouse Facility">
        {errorMsg && <div className="mb-3 text-xs text-rose-600">{errorMsg}</div>}
        <form onSubmit={handleCreateWarehouse} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Warehouse Name *</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. North Distribution Center"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsWhModal(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg">Save Warehouse</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isLocModal} onClose={() => setIsLocModal(false)} title="Add Warehouse Sub-Location">
        {errorMsg && <div className="mb-3 text-xs text-rose-600">{errorMsg}</div>}
        <form onSubmit={handleCreateLocation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Parent Warehouse *</label>
            <select
              value={newWarehouseId}
              onChange={(e) => setNewWarehouseId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Location Name *</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Cold Storage Bay 2"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsLocModal(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg">Save Location</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCatModal} onClose={() => setIsCatModal(false)} title="Add Product Category">
        {errorMsg && <div className="mb-3 text-xs text-rose-600">{errorMsg}</div>}
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Packaging Materials"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsCatModal(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg">Save Category</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isSupModal} onClose={() => setIsSupModal(false)} title="Add Supplier">
        {errorMsg && <div className="mb-3 text-xs text-rose-600">{errorMsg}</div>}
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Supplier Company Name *</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Acme Industrial Parts"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact Email / Phone</label>
            <input
              type="text"
              value={newContact}
              onChange={(e) => setNewContact(e.target.value)}
              placeholder="e.g. sales@acme.com | +1-800-555-0199"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsSupModal(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg">Save Supplier</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCustModal} onClose={() => setIsCustModal(false)} title="Add Customer">
        {errorMsg && <div className="mb-3 text-xs text-rose-600">{errorMsg}</div>}
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Customer / Client Name *</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Horizon Robotics LLC"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact / Shipping Address</label>
            <input
              type="text"
              value={newContact}
              onChange={(e) => setNewContact(e.target.value)}
              placeholder="e.g. orders@horizon.com | Plant 4, Sector 7"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={() => setIsCustModal(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg">Save Customer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
