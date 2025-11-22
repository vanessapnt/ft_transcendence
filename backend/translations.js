// backend/translations.js
// Traductions pour les messages du chat côté serveur

const translations = {
  en: {
    user_not_exists: "User {{user}} does not exist.",
    user_blocked_messages: "{{user}} has blocked your messages.",
    you_blocked: "You blocked {{user}}",
    you_unblocked: "You unblocked {{user}}",
    invitation_sent: "Invitation sent to {{user}}",
    user_not_found_db: "User not found in database.",
    user_not_connected: "{{user}} is not currently connected.",
    must_login_first: "You must login to the chat first.",
    invite_message: "{{user}} invites you to play Pong.",
    invitation_not_sent: "Could not send invitation to {{user}}.",
    welcome: "Welcome {{user}}",
    undelivered_messages: "📬 You have {{count}} pending message(s)",
    message_delivered: "Message delivered to {{user}} (online)",
    message_sent_offline: "Message sent to {{user}} (will be delivered when they connect)",
    no_history: "No conversation history with {{user}}.",
    history_with: "📜 History with {{user}} ({{count}} messages):",
  },
  fr: {
    user_not_exists: "L'utilisateur {{user}} n'existe pas.",
    user_blocked_messages: "{{user}} a bloqué vos messages.",
    you_blocked: "Tu as bloqué {{user}}",
    you_unblocked: "Tu as débloqué {{user}}",
    invitation_sent: "Invitation envoyée à {{user}}",
    user_not_found_db: "Utilisateur non trouvé dans la base de données.",
    user_not_connected: "{{user}} n'est pas connecté actuellement.",
    must_login_first: "Tu dois d'abord te connecter au chat.",
    invite_message: "{{user}} t'invite à jouer à Pong.",
    invitation_not_sent: "Impossible d'envoyer l'invitation à {{user}}.",
    welcome: "Bienvenue {{user}}",
    undelivered_messages: "📬 Vous avez {{count}} message(s) en attente",
    message_delivered: "Message livré à {{user}} (en ligne)",
    message_sent_offline: "Message envoyé à {{user}} (sera livré à la connexion)",
    no_history: "Aucun historique de conversation avec {{user}}.",
    history_with: "📜 Historique avec {{user}} ({{count}} messages):",
  },
  es: {
    user_not_exists: "El usuario {{user}} no existe.",
    user_blocked_messages: "{{user}} ha bloqueado tus mensajes.",
    you_blocked: "Bloqueaste a {{user}}",
    you_unblocked: "Desbloqueaste a {{user}}",
    invitation_sent: "Invitación enviada a {{user}}",
    user_not_found_db: "Usuario no encontrado en la base de datos.",
    user_not_connected: "{{user}} no está conectado actualmente.",
    must_login_first: "Debes iniciar sesión en el chat primero.",
    invite_message: "{{user}} te invita a jugar a Pong.",
    invitation_not_sent: "No se pudo enviar la invitación a {{user}}.",
    welcome: "Bienvenido {{user}}",
    undelivered_messages: "📬 Tienes {{count}} mensaje(s) pendiente(s)",
    message_delivered: "Mensaje entregado a {{user}} (en línea)",
    message_sent_offline: "Mensaje enviado a {{user}} (se entregará cuando se conecte)",
    no_history: "Sin historial de conversación con {{user}}.",
    history_with: "📜 Historial con {{user}} ({{count}} mensajes):",
  }
};

/**
 * Traduit une clé selon la langue donnée
 * @param {string} key - Clé de traduction
 * @param {string} lang - Code de langue (en, fr, es)
 * @param {Object} params - Paramètres pour interpolation {{variable}}
 * @returns {string} - Texte traduit
 */
function t(key, lang = 'en', params = {}) {
  const langTranslations = translations[lang] || translations['en'];
  let text = langTranslations[key] || translations['en'][key] || key;
  
  // Interpolation simple des variables {{variable}}
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
  });
  
  return text;
}

module.exports = { t };
