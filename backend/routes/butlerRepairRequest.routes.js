const express = require('express');
const butlerRepairRequestController = require('../controllers/butlerRepairRequest.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/', butlerRepairRequestController.listRepairRequests);
router.post('/', butlerRepairRequestController.createRepairRequest);
router.patch('/:id', butlerRepairRequestController.updateRepairRequest);
router.delete('/:id', butlerRepairRequestController.deleteRepairRequest);

module.exports = router;
