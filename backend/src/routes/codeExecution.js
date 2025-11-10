const express = require('express');
const { requireAuth, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/execute', (req, res) => {
  res.json({
    success: true,
    message: 'Code execution routes - to be implemented'
  });
});

module.exports = router;