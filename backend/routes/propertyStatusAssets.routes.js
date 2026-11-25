const express = require('express');
const propertyStatusAssetsController = require('../controllers/propertyStatusAssets.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.get('/public/vacant', propertyStatusAssetsController.listPublicVacantAssets);
router.use(requireAuth);
router.get('/', propertyStatusAssetsController.listPropertyAssets);
router.get('/geocode', propertyStatusAssetsController.geocodePropertyAddress);

router.get('/:id', propertyStatusAssetsController.getPropertyAssetById);
router.post('/', propertyStatusAssetsController.createPropertyAsset);
router.patch('/:id', propertyStatusAssetsController.updatePropertyAsset);
router.delete('/:id', propertyStatusAssetsController.deletePropertyAsset);

module.exports = router;
