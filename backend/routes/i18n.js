const express = require('express');
const { statements } = require('../database');

const router = express.Router();

router.post('/set-language', (req, res) => {
  const { language } = req.body;
  if (!language) return res.status(400).json({ error: 'language required' });

  // set in session
  req.session.lang = language;

  // if logged in, try persist in DB
  if (req.session.userId) {
    try {
      // Try to find the appropriate update statement
      if (statements.updatePreferredLanguage) {
        statements.updatePreferredLanguage.run(language, req.session.userId);
      } else if (statements.updateUserPreferredLanguage) {
        statements.updateUserPreferredLanguage.run(language, req.session.userId);
      }
      // If neither exists, just skip DB update (session is enough for now)
    } catch (err) {
      console.error('Failed to persist preferred language', err);
      // don't block the response if DB update fails
    }
  }

  res.json({ message: 'language set', language });
});

module.exports = router;
