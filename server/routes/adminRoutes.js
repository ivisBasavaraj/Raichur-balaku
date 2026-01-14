const express = require('express');
const router = express.Router();
const {
    uploadNewspaper,
    addMappedArea,
    getAdminNewspapers,
    togglePublish,
    deleteNewspaper,
} = require('../controllers/newspaperController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/newspapers').get(protect, admin, getAdminNewspapers);
router.route('/newspaper/upload').post(protect, admin, uploadNewspaper); // JSON payload with Base64
router.route('/newspaper/:id/map-area').post(protect, admin, addMappedArea); // JSON payload with Base64 image data
router.route('/newspaper/:id/publish').put(protect, admin, togglePublish);
router.route('/newspaper/:id').delete(protect, admin, deleteNewspaper);

module.exports = router;
