const express = require('express');
const router = express.Router();
const logger = require('../logger');

// Route technique pour forcer la création de l'index ELK
router.post('/technical', (req, res) => {
    const { message, timestamp } = req.body;
    logger.info(message || 'Technical log', { type: 'technical', timestamp: timestamp || new Date().toISOString() });
    res.status(204).end();
});

module.exports = router;
