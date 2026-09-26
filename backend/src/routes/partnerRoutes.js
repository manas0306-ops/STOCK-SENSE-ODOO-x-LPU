const express = require('express');
const PartnerController = require('../controllers/partnerController');
const { requireAuth } = require('../middleware/auth');

const supplierRouter = express.Router();
supplierRouter.get('/', requireAuth, PartnerController.listSuppliers);
supplierRouter.post('/', requireAuth, PartnerController.createSupplier);

const customerRouter = express.Router();
customerRouter.get('/', requireAuth, PartnerController.listCustomers);
customerRouter.post('/', requireAuth, PartnerController.createCustomer);

module.exports = {
  supplierRouter,
  customerRouter,
};
