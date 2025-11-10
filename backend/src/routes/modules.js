const express = require('express');
const { requireAuth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// All module routes require authentication
router.use(requireAuth);

// Placeholder routes
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Module routes - to be implemented',
    data: []
  });
});

module.exports = router;