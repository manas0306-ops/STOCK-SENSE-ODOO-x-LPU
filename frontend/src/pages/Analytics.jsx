import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { 
  BarChart3, PieChart as PieIcon, TrendingUp, Layers, Package, 
  Warehouse, Calendar, ArrowUpRight, Flame, AlertCircle, Sparkles 
} from 'lucide-react';
import api from '../services/api';
import Product360Modal from '../components/Product360Modal';

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timePreset, setTimePreset] = useState('30D');
  const [dashboardData, setDashboardData] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductFor360, setSelectedProductFor360] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/dashboard'),
      api.get('/ledger?limit=100'),
      api.get('/products?limit=100'),
    ])
      .then(([dashRes, ledgerRes, prodRes]) => {
        setDashboardData(dashRes.data || null);
        setLedgerEntries(ledgerRes.data?.items || ledgerRes.data || []);
        setProducts(prodRes.data?.items || prodRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Compute Movement Trends over time from actual ledger data
  const movementTrendMap = {};
  ledgerEntries.forEach(l => {
    const d = new Date(l.timestamp);
    const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!movementTrendMap[dateKey]) {
      movementTrendMap[dateKey] = { date: dateKey, receipts: 0, deliveries: 0, transfers: 0 };
    }
    const qty = parseFloat(l.quantity || 0);
    if (l.operation_type === 'RECEIPT') movementTrendMap[dateKey].receipts += qty;
    if (l.operation_type === 'DELIVERY') movementTrendMap[dateKey].deliveries += qty;
    if (l.operation_type === 'TRANSFER_IN' || l.operation_type === 'TRANSFER_OUT') movementTrendMap[dateKey].transfers += qty / 2;
  });

  const movementTrendData = Object.values(movementTrendMap).slice(-10);

  // Category composition data
  const categoryData = (dashboardData?.stockByCategory || []).map(c => ({
    name: c.category || 'General',
    value: parseFloat(c.total_units || 0),
  })).filter(c => c.value > 0);

  // Warehouse breakdown
  const warehouseData = (dashboardData?.stockByWarehouse || []).map(w => ({
    name: w.warehouse_name,
    stock: parseFloat(w.total_units || 0),
  }));

  // Scatter/Correlation data: stock vs outflow
  const scatterData = products.map(p => {
    const outflow = ledgerEntries
      .filter(l => l.product_id === p.id && l.operation_type === 'DELIVERY')
      .reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0);
    return {
      id: p.id,
      name: p.name,
      stock: parseFloat(p.current_stock ?? p.total_stock ?? 0),
      velocity: outflow,
    };
  });

  const fastMovers = dashboardData?.fastMovers || [];
  const deadStock = dashboardData?.deadStock || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Title and Range Presets */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Analytics Studio</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational intelligence derived from verified double-entry ledger transactions.
          </p>
        </div>

        {/* Time Filter Presets */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {['7D', '30D', '90D', '1Y'].map(preset => (
            <button
              key={preset}
              onClick={() => setTimePreset(preset)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                timePreset === preset ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Executive Overview
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'trends' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Movement Trajectory
        </button>
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'warehouses' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Warehouse className="h-4 w-4" />
          Warehouse Distribution
        </button>
        <button
          onClick={() => setActiveTab('intelligence')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'intelligence' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          Velocity & Dead Stock
        </button>
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="py-24 text-center text-sm text-slate-500">
          Loading analytics telemetry...
        </div>
      ) : activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Top Row: Movement vs Category Composition */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Movement Trends Area Chart */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Inbound vs Outbound Movements</h3>
                  <p className="text-xs text-slate-500">Receipts and Deliveries recorded in Stock Ledger</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span>Receipts</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                    <span>Deliveries</span>
                  </div>
                </div>
              </div>

              {movementTrendData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  No historical movement records for this period.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={movementTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="receipts" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="deliveries" stackId="2" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Category Donut */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col">
              <h3 className="font-bold text-slate-900 text-sm">Inventory Composition</h3>
              <p className="text-xs text-slate-500 mb-2">Total Units by Material Category</p>

              {categoryData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  No category stock data available.
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-auto space-y-1.5 pt-2 border-t border-slate-100">
                {categoryData.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}></span>
                      <span className="text-slate-700">{cat.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{cat.value} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'trends' ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Operational Trajectory: Inflow vs Outflow</h3>
            <p className="text-xs text-slate-500">Historical stock ledger progression across operations</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={movementTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="receipts" name="Receipts (IN)" stroke="#10b981" strokeWidth={2.5} />
                <Line type="monotone" dataKey="deliveries" name="Deliveries (OUT)" stroke="#f43f5e" strokeWidth={2.5} />
                <Line type="monotone" dataKey="transfers" name="Internal Transfers" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : activeTab === 'warehouses' ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Warehouse Stock Volume Distribution</h3>
            <p className="text-xs text-slate-500">Physical stock quantities held per facility</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="stock" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fast Movers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-500" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Fast-Moving SKUs</h3>
                <p className="text-xs text-slate-500">Highest delivery outflow frequency</p>
              </div>
            </div>

            {fastMovers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No outbound movements recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {fastMovers.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedProductFor360(m)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{m.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{m.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-rose-600 font-mono">
                        -{m.total_outflow} {m.unit_of_measure}
                      </div>
                      <span className="text-[11px] text-slate-400">Total Outflow</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dead Stock */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Dormant Stock (Zero Outflow)</h3>
                <p className="text-xs text-slate-500">Items with on-hand inventory but no delivery movements</p>
              </div>
            </div>

            {deadStock.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">All inventory has active outflow.</p>
            ) : (
              <div className="space-y-2">
                {deadStock.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductFor360(p)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{p.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-amber-600 font-mono">
                        {p.current_stock} units
                      </div>
                      <span className="text-[11px] text-slate-400">Zero movement</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product 360 Drawer */}
      <Product360Modal
        product={selectedProductFor360}
        isOpen={Boolean(selectedProductFor360)}
        onClose={() => setSelectedProductFor360(null)}
      />
    </div>
  );
}
