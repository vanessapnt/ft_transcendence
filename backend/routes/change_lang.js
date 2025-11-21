const express = require('express');
const { statements } = require('../database');

const router = express.Router();

router.post('/set-language', (req, res) => {
  const { language } = req.body;
  if (!language) return res.status(400).json({ error: 'language required' });

  // Save in session
  req.session.lang = language;

  // If user logged in, persist to DB
  if (req.session.userId) {
    try {
      // Exemple de noms courants ; adapte si tes statements ont un autre nom
      if (statements.updatePreferredLanguage) {
        statements.updatePreferredLanguage.run(language, req.session.userId);
      } else if (statements.updateUserPreferredLanguage) {
        statements.updateUserPreferredLanguage.run(language, req.session.userId);
      } else if (statements.updateUser) {
        // si updateUser existe, adapte les params : statements.updateUser.run(...).
      }
    } catch (err) {
      console.error('Failed to save preferred language:', err);
    }
  }

  res.json({ message: 'Language set', language });
});

module.exports = router;