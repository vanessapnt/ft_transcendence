const express = require('express');
const { statements } = require('../database');

const router = express.Router();

router.post('/set-language', (req, res) => {
  const { language } = req.body;
  if (!language) return res.status(400).json({ error: 'language required' });

  // Save in session
  req.session.lang = language;
  const logger = require('../logger');
  logger.info('Language change', { userId: req.session.userId, language });

  // If user logged in, persist to DB
  if (req.session.userId) {
    try {
      // Exemple de noms courants ; adapte si tes statements ont un autre nom
      statements.updateUserLanguage.run(language, req.session.userId);
      logger.info('Language updated in DB', { userId: req.session.userId, language });
    } catch (err) {
      logger.error('Failed to persist preferred language', { userId: req.session.userId, language, error: err.message });
    }
  }

  res.json({ message: 'Language set', language });
});

module.exports = router;