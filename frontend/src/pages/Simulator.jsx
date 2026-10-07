import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid 
} from 'recharts';
import { Play, RotateCcw, AlertTriangle, ShieldCheck, TrendingDown, Info, Package, Sparkles } from 'lucide-react';
import api from '../services/api';

export default function Simulator() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentStock, setCurrentStock] = useState(100);
  const [reorderLevel, setReorderLevel] = useState(25);
  const [dailyOutflow, setDailyOutflow] = useState(5);
  const [inflowQty, setInflowQty] = useState(50);
  const [inflowDay, setInflowDay] = useState(7);
  const [simDays, setSimDays] = useState(30);

  useEffect(() => {
    api.get('/products')
      .then(res => {
        const list = res.data?.items || res.data || [];
        setProducts(list);
        if (list.length > 0) {
          handleSelectProduct(list[0]);
        }
      })
      .catch(console.error);
  }, []);

  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    const stock = parseFloat(prod.current_stock ?? prod.total_stock ?? 50);
    const reorder = parseFloat(prod.reorder_level ?? 20);
    setCurrentStock(stock);
    setReorderLevel(reorder);
    setDailyOutflow(Math.max(1, Math.round(stock / 15)) || 3);
  };

  // Generate Simulation Curve
  const simulationData = [];
  let stock = currentStock;
  let stockOutDay = null;
  let minStockReached = currentStock;

  for (let day = 0; day <= simDays; day++) {
    if (day > 0) {
      stock -= dailyOutflow;
      if (day === inflowDay) {
        stock += inflowQty;
      }
    }

    if (stock < minStockReached) {
      minStockReached = stock;
    }

    if (stock <= 0 && stockOutDay === null) {
      stockOutDay = day;
    }

    simulationData.push({
      day: `Day ${day}`,
      dayNum: day,
      stock: Math.max(0, Math.round(stock * 10) / 10),
      reorder: reorderLevel,
    });
  }

  const isCriticalRisk = stockOutDay !== null;
  const isWarningRisk = !isCriticalRisk && minStockReached <= reorderLevel;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Simulation Banner Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Inventory Scenario Simulator</h2>
            <p className="text-xs text-slate-600">
              Test demand surges, lead time delays, and replenishment scenarios mathematically without altering production stock.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-blue-700 border border-blue-300">
          <Info className="h-3.5 w-3.5 text-blue-600" />
          Sandbox Active
        </div>
      </div>

      {/* Main Grid: Parameters on Left, Projection Curve on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Parameters Panel */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-500" />
            Simulation Parameters
          </h3>

          {/* Product Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Product</label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const found = products.find(p => p.id === parseInt(e.target.value, 10));
                if (found) handleSelectProduct(found);
              }}
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Current Stock on Hand</span>
              <span className="font-mono text-blue-600 font-bold">{currentStock}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              value={currentStock}
              onChange={(e) => setCurrentStock(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          {/* Daily Expected Outflow Rate */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Expected Daily Outflow</span>
              <span className="font-mono text-rose-600 font-bold">-{dailyOutflow} units/day</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={dailyOutflow}
              onChange={(e) => setDailyOutflow(parseFloat(e.target.value))}
              className="w-full accent-rose-600"
            />
          </div>

          {/* Planned Replenishment Quantity */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Incoming Replenishment Quantity</span>
              <span className="font-mono text-emerald-600 font-bold">+{inflowQty} units</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              value={inflowQty}
              onChange={(e) => setInflowQty(parseFloat(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Inflow Arrival Day */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Arrival Day</span>
              <span className="font-mono text-slate-800">Day {inflowDay}</span>
            </div>
            <input
              type="range"
              min="1"
              max={simDays}
              value={inflowDay}
              onChange={(e) => setInflowDay(parseInt(e.target.value, 10))}
              className="w-full accent-slate-600"
            />
          </div>

          {/* Horizon Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Simulation Horizon</label>
            <div className="grid grid-cols-4 gap-2">
              {[14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSimDays(d)}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    simDays === d ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Projection Visualization */}
        <div className="lg:col-span-8 space-y-6">
          {/* Outcome Status Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projected Runway</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {stockOutDay !== null ? `${stockOutDay} Days` : `>${simDays} Days`}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stockOutDay ? `Stock-out expected on Day ${stockOutDay}` : 'Sufficient inventory through horizon'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lowest Stock Level</span>
              <div className={`text-2xl font-bold mt-1 ${minStockReached <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {Math.max(0, minStockReached)} <span className="text-xs font-normal text-slate-500">units</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Buffer threshold is {reorderLevel} units
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scenario Risk</span>
              <div className="mt-1">
                {isCriticalRisk ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> High Risk (Stockout)
                  </span>
                ) : isWarningRisk ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> Buffer Breach Warning
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="h-3.5 w-3.5" /> Healthy Runway
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isCriticalRisk ? 'Accelerate replenishment order' : 'Parameters within safe margin'}
              </p>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Projected Inventory Trajectory</h3>
                <p className="text-xs text-slate-500">Simulated curve including daily burn and replenishment arrival</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  <span>Stock Projection</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-rose-400"></span>
                  <span>Reorder Buffer</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dayNum" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl font-mono">
                            <p className="font-bold">{payload[0].payload.day}</p>
                            <p className="text-blue-400">Projected: {payload[0].value} units</p>
                            <p className="text-rose-400">Buffer: {reorderLevel} units</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={reorderLevel} stroke="#f43f5e" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="stock"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
