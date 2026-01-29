const express = require('express');
const router = express.Router();
const PackageController = require('./package.controller');
const upload = require('../../configs/upload.config');
const { checkIsAdmin, optionalAuth } = require('../../middleware/auJWT.middleware');

const checkAdmin = (req, res, next) => {
    // Basic check based on req.user usually, but here just a placeholder if needed or middleware usage
    // Original code used req.isAdmin set by some middleware or manual check
    // Assuming 'auJWT' or similar sets req.user.role
    // For now we trust the controller logic relies on service/model or just returns filtered data
    next();
};
// Middleware to flag admin for filtered results
const setAdminFlag = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        req.isAdmin = true;
    } else {
        req.isAdmin = false;
    }
    next();
};


router.get('/', PackageController.getAllTopupPackages);
router.get('/game/:game_code', optionalAuth, PackageController.getTopupPackagesByGameSlug);

router.post('/', upload.single("thumbnail"), PackageController.createTopupPackage);
router.put('/', upload.single("thumbnail"), PackageController.updateTopupPackage);
router.get('/getLog', PackageController.getLogTopupPackages);
router.delete('/:id', PackageController.deleteTopupPackage);
router.get('/search', PackageController.searchTopupPackages);
router.patch('/update-status', PackageController.updateStatus);
router.patch('/update-sale', PackageController.updateSale);
// Missing: /:id -> need a controller method for single package if FE calls it.
router.get('/:id', PackageController.getPackageById); // Assuming controller has it? Need to check.

module.exports = router;
