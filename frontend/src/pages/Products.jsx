import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../services/productService';
import { metaService } from '../services/operationServices';
import Modal from '../components/Modal';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  Layers, 
  Warehouse, 
  Eye, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoryId') || '');
  const [lowStockFilter, setLowStockFilter] = useState(searchParams.get('lowStock') === 'true');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('kg');
  const [reorderLevel, setReorderLevel] = useState(10);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productService.getAll({
        search: searchTerm,
        categoryId: selectedCategory,
        lowStock: lowStockFilter,
      });
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await metaService.getCategories();
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, selectedCategory, lowStockFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);
    try {
      await productService.create({
        name,
        sku,
        category_id: categoryId || null,
        unit_of_measure: unitOfMeasure,
        reorder_level: parseFloat(reorderLevel),
      });
      setIsCreateOpen(false);
      setName('');
      setSku('');
      setCategoryId('');
      setReorderLevel(10);
      fetchProducts();
    } catch (err) {
      setFormError(err.message || 'Failed to create product');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openProductDetail = async (prodId) => {
    setDetailLoading(true);
    try {
      const res = await productService.getById(prodId);
      setSelectedProduct(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h1>
          <p className="text-sm text-slate-500">Manage SKU definitions, reorder thresholds, and current stock distribution</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Product</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              lowStockFilter
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Low Stock Only</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading catalog items...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No products found</p>
            <p className="text-xs text-slate-400 mt-1">Try changing search terms or add a new product.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-6">Product & SKU</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6 text-right">Available Stock</th>
                  <th className="py-3.5 px-6 text-right">Reorder Level</th>
                  <th className="py-3.5 px-6 text-center">Stock Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const stock = parseFloat(p.current_stock);
                  const reorder = parseFloat(p.reorder_level);
                  const isOutOfStock = stock === 0;
                  const isLowStock = !isOutOfStock && stock <= reorder;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-900">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs font-mono text-slate-500">{p.sku}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          <Layers className="h-3 w-3 text-slate-400" />
                          {p.category_name || 'General'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900">
                        {stock.toLocaleString()} <span className="text-xs font-normal text-slate-500">{p.unit_of_measure}</span>
                      </td>
                      <td className="py-4 px-6 text-right text-slate-600">
                        {reorder.toLocaleString()} <span className="text-xs text-slate-400">{p.unit_of_measure}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openProductDetail(p.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-2.5 py-1.5 rounded-md hover:bg-emerald-50 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Locations</span>
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

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Product"
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Steel Sheets Grade A"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Unique SKU *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. STL-900"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-hidden focus:border-emerald-500 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Unit of Measure *
              </label>
              <select
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="kg">kg (Kilograms)</option>
                <option value="pcs">pcs (Pieces)</option>
                <option value="units">units (Units)</option>
                <option value="meters">meters (Meters)</option>
                <option value="liters">liters (Liters)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Reorder Threshold Level *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {formSubmitting ? 'Creating...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : 'Product Details'}
      >
        {selectedProduct && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Total Warehouse Stock:</span>
                <div className="text-xl font-bold text-slate-900">
                  {selectedProduct.total_stock} {selectedProduct.unit_of_measure}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 uppercase font-semibold">Reorder Threshold:</span>
                <div className="text-sm font-semibold text-amber-600">
                  {selectedProduct.reorder_level} {selectedProduct.unit_of_measure}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Warehouse className="h-4 w-4 text-slate-400" />
                <span>Multi-Warehouse Location Distribution</span>
              </h4>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Warehouse</th>
                      <th className="py-2.5 px-3">Specific Location</th>
                      <th className="py-2.5 px-3 text-right">Physical Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedProduct.stock_by_location?.map((loc) => (
                      <tr key={loc.location_id}>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{loc.warehouse_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{loc.location_name}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {parseFloat(loc.quantity).toLocaleString()} {selectedProduct.unit_of_measure}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
