const express = require('express');
const financialChartController = require('../controllers/financialChart.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/', financialChartController.getFinancialChartSummary);
router.get('/export', financialChartController.exportFinancialCsv);

module.exports = router;
