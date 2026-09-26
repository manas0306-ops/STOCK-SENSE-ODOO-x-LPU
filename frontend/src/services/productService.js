import api from './api';

export const productService = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.lowStock) query.append('lowStock', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return api.get(`/products${qs}`);
  },

  getById: (id) => api.get(`/products/${id}`),

  create: (data) => api.post('/products', data),

  update: (id, data) => api.put(`/products/${id}`, data),
};
