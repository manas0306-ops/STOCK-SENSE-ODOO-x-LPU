const LedgerRepository = require('../repositories/ledgerRepo');

class LedgerController {
  static async list(req, res, next) {
    try {
      const { productId, operationType, locationId, startDate, endDate, page = 1, limit = 50 } = req.query;

      const { items, pagination } = await LedgerRepository.list({
        productId,
        operationType,
        locationId,
        startDate,
        endDate,
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        message: 'Stock ledger retrieved',
        data: items,
        pagination,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = LedgerController;
