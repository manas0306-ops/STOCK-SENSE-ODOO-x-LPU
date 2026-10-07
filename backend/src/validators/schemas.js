const { z } = require('zod');

// Common pagination and filter schema
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  status: z.enum(['draft', 'ready', 'done', 'canceled']).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  lowStock: z.enum(['true', 'false']).optional(),
});

// Authentication schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['Inventory Manager', 'Warehouse Staff']).default('Warehouse Staff'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// Product schemas
const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(2, 'SKU must be at least 2 characters').toUpperCase(),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  unit_of_measure: z.string().min(1).default('Units'),
  reorder_level: z.coerce.number().min(0).default(0),
  initial_stock: z.coerce.number().min(0).optional(),
  initial_location_id: z.coerce.number().int().positive().optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  unit_of_measure: z.string().min(1).optional(),
  reorder_level: z.coerce.number().min(0).optional(),
});

// Receipt schemas
const createReceiptSchema = z.object({
  supplier_id: z.coerce.number().int().positive().nullable().optional(),
  destination_location_id: z.coerce.number().int().positive('Destination location is required'),
  status: z.enum(['draft', 'ready']).default('draft'),
  items: z.array(z.object({
    product_id: z.coerce.number().int().positive('Valid product ID is required'),
    quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  })).min(1, 'At least one receipt item is required'),
});

// Delivery schemas
const createDeliverySchema = z.object({
  customer_id: z.coerce.number().int().positive().nullable().optional(),
  source_location_id: z.coerce.number().int().positive('Source location is required'),
  status: z.enum(['draft', 'ready']).default('draft'),
  items: z.array(z.object({
    product_id: z.coerce.number().int().positive('Valid product ID is required'),
    quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  })).min(1, 'At least one delivery item is required'),
});

// Transfer schemas
const createTransferSchema = z.object({
  source_location_id: z.coerce.number().int().positive('Source location is required'),
  destination_location_id: z.coerce.number().int().positive('Destination location is required'),
  status: z.enum(['draft', 'ready']).default('draft'),
  items: z.array(z.object({
    product_id: z.coerce.number().int().positive('Valid product ID is required'),
    quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  })).min(1, 'At least one transfer item is required'),
}).refine(data => data.source_location_id !== data.destination_location_id, {
  message: 'Source and destination locations must be different',
  path: ['destination_location_id'],
});

// Adjustment schemas
const createAdjustmentSchema = z.object({
  product_id: z.coerce.number().int().positive('Product is required'),
  location_id: z.coerce.number().int().positive('Location is required'),
  counted_quantity: z.coerce.number().min(0, 'Counted quantity must be non-negative'),
  reason: z.string().min(3, 'Adjustment reason is required'),
  auto_validate: z.boolean().default(true),
});

module.exports = {
  paginationSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createProductSchema,
  updateProductSchema,
  createReceiptSchema,
  createDeliverySchema,
  createTransferSchema,
  createAdjustmentSchema,
};
