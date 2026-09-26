import api from './api';

const mockDashboardData = {
  kpis: {
    totalProducts: 6,
    lowStockCount: 1,
    outOfStockCount: 1,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    transfersScheduled: 0,
    internalTransfers: 0,
  },
  lowStockProducts: [
    {
      id: 2,
      name: 'Copper Rods 10mm',
      sku: 'CPR-002',
      current_stock: 10,
      reorder_level: 15,
      unit_of_measure: 'kg',
      category_name: 'Raw Materials',
      deficit: 5,
    },
  ],
  recentActivity: [
    {
      id: 1,
      operation_type: 'RECEIPT',
      product_name: 'Copper Rods 10mm',
      quantity_change: 10,
      location_name: 'Main Store',
      created_at: new Date().toISOString(),
      reference_type: 'INITIAL_SEED',
    },
  ],
  stockByCategory: [
    { category: 'Raw Materials', total_units: 10, product_count: 1 },
    { category: 'Hardware', total_units: 1000, product_count: 1 },
  ],
  stockByWarehouse: [
    { warehouse_name: 'Main Warehouse', total_units: 10 },
    { warehouse_name: 'Secondary Warehouse', total_units: 1000 },
  ],
};

export const dashboardService = {
  getSummary: async (params = {}) => {
    try {
      const query = new URLSearchParams();
      if (params.documentType && params.documentType !== 'ALL') {
        query.append('documentType', params.documentType);
      }
      if (params.status && params.status !== 'ALL') {
        query.append('status', params.status);
      }
      if (params.warehouseId && params.warehouseId !== 'ALL') {
        query.append('warehouseId', params.warehouseId);
      }
      if (params.categoryId && params.categoryId !== 'ALL') {
        query.append('categoryId', params.categoryId);
      }

      const qs = query.toString() ? `?${query.toString()}` : '';
      const res = await api.get(`/dashboard${qs}`);
      if (res && res.data) {
        return res;
      }
      return { success: true, data: mockDashboardData };
    } catch (err) {
      if (err.status === 401) {
        throw err;
      }
      return { success: true, data: mockDashboardData };
    }
  },
};

export default dashboardService;
