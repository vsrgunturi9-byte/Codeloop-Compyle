const express = require('express');
const { requireAuth, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/dashboard', requirePermission('view_analytics'), (req, res) => {
  res.json({
    success: true,
    message: 'Analytics routes - to be implemented',
    data: {}
  });
});

module.exports = router;