import api from './api';

export const receiptService = {
  getAll: (status) => api.get(`/receipts${status ? `?status=${status}` : ''}`),
  getById: (id) => api.get(`/receipts/${id}`),
  create: (data) => api.post('/receipts', data),
  markReady: (id) => api.post(`/receipts/${id}/ready`),
  validate: (id) => api.post(`/receipts/${id}/validate`),
};

export const deliveryService = {
  getAll: (status) => api.get(`/deliveries${status ? `?status=${status}` : ''}`),
  getById: (id) => api.get(`/deliveries/${id}`),
  create: (data) => api.post('/deliveries', data),
  markReady: (id) => api.post(`/deliveries/${id}/ready`),
  validate: (id) => api.post(`/deliveries/${id}/validate`),
};

export const transferService = {
  getAll: (status) => api.get(`/transfers${status ? `?status=${status}` : ''}`),
  getById: (id) => api.get(`/transfers/${id}`),
  create: (data) => api.post('/transfers', data),
  markReady: (id) => api.post(`/transfers/${id}/ready`),
  validate: (id) => api.post(`/transfers/${id}/validate`),
};

export const adjustmentService = {
  getAll: () => api.get('/adjustments'),
  getById: (id) => api.get(`/adjustments/${id}`),
  create: (data) => api.post('/adjustments', data),
  validate: (id) => api.post(`/adjustments/${id}/validate`),
};

export const ledgerService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.productId) query.append('productId', params.productId);
    if (params.operationType) query.append('operationType', params.operationType);
    if (params.locationId) query.append('locationId', params.locationId);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return api.get(`/ledger${qs}`);
  },
};

export { default as dashboardService } from './dashboardService';

export const metaService = {
  getCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/categories', data),
  getWarehouses: () => api.get('/warehouses'),
  createWarehouse: (data) => api.post('/warehouses', data),
  updateWarehouse: (id, data) => api.put(`/warehouses/${id}`, data),
  getLocations: (warehouseId) => api.get(`/locations${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),
  createLocation: (data) => api.post('/locations', data),
  updateLocation: (id, data) => api.put(`/locations/${id}`, data),
  getSuppliers: () => api.get('/suppliers'),
  createSupplier: (data) => api.post('/suppliers', data),
  getCustomers: () => api.get('/customers'),
  createCustomer: (data) => api.post('/customers', data),
};
