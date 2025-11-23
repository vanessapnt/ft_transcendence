// backend/chat.js
const WebSocket = require("ws");
const { statements } = require("./database");
const { t } = require("./translations");

/**
 * Attache le chat WebSocket à un serveur HTTP existant.
 * @param {import("http").Server} server - serveur HTTP Express existant
 */
function setupChat(server) {
  // On crée un WebSocket Server monté sur le même serveur HTTP (sur /chat)
  const wss = new WebSocket.Server({ server, path: "/chat" });

  // socket => { username, displayName, userId, blocked: Set }
  const clients = new Map();

  // Set pour garder la liste des utilisateurs connectés
  const onlineUsers = new Set();

  // Fonction pour diffuser la liste des utilisateurs en ligne
  function broadcastOnlineUsers() {
    const usersList = Array.from(onlineUsers);
    const message = JSON.stringify({ type: "onlineUsersList", users: usersList });

    clients.forEach((clientData, socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    });

    console.log(`📅 Diffusion de la liste des utilisateurs en ligne:`, usersList);
  }

  // Fonction pour notifier qu'un utilisateur est en ligne
  function notifyUserOnline(username) {
    const message = JSON.stringify({ type: "userOnline", username });

    clients.forEach((clientData, socket) => {
      if (socket.readyState === WebSocket.OPEN && clientData.username !== username) {
        socket.send(message);
      }
    });

    console.log(`🟢 Notification: ${username} est en ligne`);
  }

  // Fonction pour notifier qu'un utilisateur est hors ligne
  function notifyUserOffline(username) {
    const message = JSON.stringify({ type: "userOffline", username });

    clients.forEach((clientData, socket) => {
      if (socket.readyState === WebSocket.OPEN && clientData.username !== username) {
        socket.send(message);
      }
    });

    console.log(`🔴 Notification: ${username} est hors ligne`);
  }

  // Petit helper pour retrouver un socket à partir d'un username (le premier trouvé)
  function findSocketByUsername(username) {
    for (const [sock, info] of clients.entries()) {
      if (info.username === username) {
        return sock;
      }
    }
    return null;
  }

  // Helper pour retrouver TOUS les sockets d'un utilisateur (pour connexions multiples)
  function findAllSocketsByUsername(username) {
    const sockets = [];
    for (const [sock, info] of clients.entries()) {
      if (info.username === username && sock.readyState === WebSocket.OPEN) {
        sockets.push(sock);
      }
    }
    return sockets;
  }

  // Helper pour envoyer un message à tous les onglets d'un utilisateur
  function sendToAllUserSockets(username, message) {
    const sockets = findAllSocketsByUsername(username);
    const jsonMessage = JSON.stringify(message);
    let sentCount = 0;

    sockets.forEach(socket => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(jsonMessage);
        sentCount++;
      }
    });

    console.log(`📤 Message envoyé à ${sentCount} onglet(s) de ${username}`);
    return sentCount > 0;
  }

  // Helper pour diffuser le changement de statut d'un utilisateur à tous les autres utilisateurs connectés
  function broadcastUserStatus(username, isOnline) {
    const message = {
      type: isOnline ? "userOnline" : "userOffline",
      username: username
    };

    // Envoyer à tous les autres utilisateurs connectés
    for (const [socket, clientData] of clients.entries()) {
      if (socket.readyState === WebSocket.OPEN && clientData.username && clientData.username !== username) {
        socket.send(JSON.stringify(message));
      }
    }

    console.log(`📡 Diffusion du statut ${isOnline ? 'en ligne' : 'hors ligne'} de ${username}`);
  }

  // Helper pour obtenir la liste des utilisateurs en ligne
  function getOnlineUsers() {
    const onlineUsers = new Set();
    for (const [socket, clientData] of clients.entries()) {
      if (socket.readyState === WebSocket.OPEN && clientData.username) {
        onlineUsers.add(clientData.username);
      }
    }
    return Array.from(onlineUsers);
  }

  // === Connexion d'un nouveau client ===
  wss.on("connection", (socket) => {
    console.log("💬 Nouvelle connexion WebSocket");
    clients.set(socket, { username: null, displayName: null, userId: null, blocked: new Set(), language: 'en' });

    // Réception d'un message WebSocket
    socket.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        const clientData = clients.get(socket);
        if (!clientData) return;

        // 1️⃣ Connexion utilisateur - récupération depuis la DB
        if (data.type === "login" && data.username) {
          console.log("🔐 Tentative de login:", data.username);
          // Récupérer l'utilisateur depuis la base de données
          const user = statements.getUserByUsername.get(data.username);

          if (!user) {
            console.log("❌ Utilisateur non trouvé:", data.username);
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: t('user_not_found_db', clientData.language || 'en'),
              })
            );
            return;
          }

          // Note: On permet maintenant plusieurs connexions simultanées du même utilisateur
          // Cela permet d'ouvrir plusieurs onglets sans fermer les autres
          const existingSocket = findSocketByUsername(data.username);
          if (existingSocket && existingSocket !== socket) {
            console.log("ℹ️ Utilisateur déjà connecté sur un autre onglet:", data.username, "- Autoriser multiple connexions");
            // Ne pas fermer l'ancienne connexion, permettre les connexions multiples
          }

          // Utiliser le display_name de la DB (fallback sur username)
          clientData.username = user.username;
          clientData.displayName = user.display_name || user.username;
          clientData.userId = user.id;
          // Utiliser la langue envoyée par le client (langue actuelle du site) ou celle de la DB
          clientData.language = data.language || user.preferred_language || 'en';

          console.log("✅ Utilisateur connecté:", {
            username: clientData.username,
            displayName: clientData.displayName,
            language: clientData.language,
            preferredLanguageFromDB: user.preferred_language,
            totalConnected: clients.size
          });

          // Ajouter l'utilisateur à la liste des utilisateurs en ligne
          onlineUsers.add(clientData.username);

          // Vérifier si c'est une première connexion pour cet utilisateur
          const userSockets = findAllSocketsByUsername(user.username);
          const isFirstConnection = userSockets.length === 1; // Seulement cette nouvelle connexion

          // Notifier les autres utilisateurs seulement si c'est la première connexion
          if (isFirstConnection) {
            notifyUserOnline(clientData.username);
          }

          if (isFirstConnection) {
            // Diffuser que cet utilisateur est maintenant en ligne
            broadcastUserStatus(user.username, true);
          }

          const welcomeMsg = t('welcome', clientData.language, { user: clientData.displayName });
          console.log(`📨 Envoi message de bienvenue en ${clientData.language}:`, welcomeMsg);

          socket.send(
            JSON.stringify({
              from: "Serveur",
              text: welcomeMsg,
            })
          );

          // **NOUVEAU** : Livrer les messages en attente
          console.log("📬 Vérification messages en attente pour userId:", user.id);
          try {
            const undeliveredMessages = statements.getUndeliveredMessages.all(user.id);
            console.log("📬 Messages non livrés trouvés:", undeliveredMessages.length);

            if (undeliveredMessages.length > 0) {
              socket.send(
                JSON.stringify({
                  from: "Serveur",
                  text: t('undelivered_messages', clientData.language, { count: undeliveredMessages.length }),
                })
              );

              // Livrer chaque message
              for (const msg of undeliveredMessages) {
                console.log("📨 Livraison message:", msg);
                socket.send(
                  JSON.stringify({
                    type: "dm",
                    from: msg.from_username,
                    fromDisplayName: msg.from_display_name,
                    to: user.username,
                    text: msg.message_text,
                    timestamp: msg.created_at
                  })
                );

                // Marquer comme livré
                statements.markMessageAsDelivered.run(msg.id);
              }
            }
          } catch (dbError) {
            console.error("❌ Erreur livraison messages:", dbError);
          }

          return;
        }

        // Si pas encore loggé, on ignore toutes les autres actions
        if (!clientData.username) {
          socket.send(
            JSON.stringify({
              from: "Serveur",
              text: t('must_login_first', clientData.language || 'en'),
            })
          );
          return;
        }

        // 2️⃣ Blocage / Déblocage d'utilisateur
        if (data.type === "block" && data.target) {
          // ✅ Vérifier que l'utilisateur à bloquer existe
          const targetUser = statements.getUserByUsername.get(data.target);
          if (!targetUser) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: t('user_not_exists', clientData.language, { user: data.target }),
              })
            );
            return;
          }

          clientData.blocked.add(data.target);
          socket.send(
            JSON.stringify({
              from: "Serveur",
              text: t('you_blocked', clientData.language, { user: targetUser.display_name || data.target }),
            })
          );
          return;
        }

        if (data.type === "unblock" && data.target) {
          // ✅ Vérifier que l'utilisateur à débloquer existe
          const targetUser = statements.getUserByUsername.get(data.target);
          if (!targetUser) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: t('user_not_exists', clientData.language, { user: data.target }),
              })
            );
            return;
          }

          clientData.blocked.delete(data.target);
          socket.send(
            JSON.stringify({
              from: "Serveur",
              text: t('you_unblocked', clientData.language, { user: targetUser.display_name || data.target }),
            })
          );
          return;
        }

        // 3️⃣ Invitation à jouer à Pong
        if (data.type === "invite" && data.target) {
          const fromUser = clientData.username;
          const fromDisplayName = clientData.displayName;

          // ✅ Vérifier que l'utilisateur à inviter existe dans la base de données
          const targetUser = statements.getUserByUsername.get(data.target);
          if (!targetUser) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: t('user_not_exists', clientData.language, { user: data.target }),
              })
            );
            return;
          }

          const targetSocket = findSocketByUsername(data.target);

          if (!targetSocket || targetSocket.readyState !== WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: t('user_not_connected', clientData.language, { user: targetUser.display_name || data.target }),
              })
            );
            return;
          }

          const targetData = clients.get(targetSocket);

          // Si la cible a bloqué l'invitant, on ne lui envoie rien (message silencieux)
          if (targetData && targetData.blocked.has(fromUser)) {
            // Envoyer confirmation à l'expéditeur sans révéler le blocage
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: t('invitation_sent', clientData.language, { user: targetUser.display_name || data.target }),
              })
            );
            return;
          }

          // Envoi de l'invitation à TOUS les onglets de la cible (avec sa langue)
          const sent = sendToAllUserSockets(data.target, {
            type: "invite",
            from: fromUser,
            fromDisplayName: fromDisplayName,
            text: t('invite_message', targetData.language, { user: fromDisplayName }),
          });

          if (!sent) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: t('invitation_not_sent', clientData.language, { user: targetUser.display_name || data.target }),
              })
            );
            return;
          }

          // Feedback à l'émetteur
          socket.send(
            JSON.stringify({
              from: "Serveur",
              text: t('invitation_sent', clientData.language, { user: targetData.displayName || data.target }),
            })
          );

          return;
        }

        // 4️⃣ Réponse à l'invitation
        if (
          data.type === "inviteResponse" &&
          typeof data.accepted === "boolean" &&
          data.to
        ) {
          const fromUser = clientData.username;
          const fromDisplayName = clientData.displayName;

          // Envoyer la réponse à tous les onglets de l'utilisateur cible
          sendToAllUserSockets(data.to, {
            type: "inviteResponse",
            from: fromUser,
            fromDisplayName: fromDisplayName,
            accepted: data.accepted,
          });

          return;
        }

        // 5️⃣ Notification de fin de partie
        if (data.type === "gameEnded" && data.to) {
          const fromUser = clientData.username;

          // Envoyer la notification à tous les onglets de l'utilisateur cible
          sendToAllUserSockets(data.to, {
            type: "gameEnded",
            from: fromUser
          });

          console.log(`🏁 Notification de fin de partie envoyée de ${fromUser} à ${data.to}`);
          return;
        }

        // 6️⃣ Mise à jour de la langue
        if (data.type === "updateLanguage" && data.language) {
          clientData.language = data.language;
          console.log(`🌐 Langue mise à jour pour ${clientData.username}: ${data.language}`);
          return;
        }

        // 5️⃣ Message direct (DM) entre deux utilisateurs
        if (data.type === "dm" && data.to && data.text) {
          const fromUser = clientData.username;
          const fromDisplayName = clientData.displayName;

          // ✅ Vérifier que l'utilisateur destinataire existe dans la base de données
          const targetUser = statements.getUserByUsername.get(data.to);
          if (!targetUser) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: t('user_not_exists', clientData.language, { user: data.to }),
              })
            );
            return;
          }

          const targetSocket = findSocketByUsername(data.to);

          // Vérifier si la cible a bloqué l'expéditeur (seulement si elle est connectée)
          if (targetSocket) {
            const targetData = clients.get(targetSocket);
            if (targetData && targetData.blocked.has(fromUser)) {
              socket.send(
                JSON.stringify({
                  from: "Serveur",
                  text: t('user_blocked_messages', clientData.language, { user: targetData.displayName || data.to }),
                })
              );
              return;
            }
          }

          // **NOUVEAU** : Stocker le message en base de données
          console.log("💾 Tentative sauvegarde message:", {
            fromUserId: clientData.userId,
            toUserId: targetUser.id,
            text: data.text,
            isDelivered: targetSocket ? 1 : 0
          });

          try {
            statements.saveMessage.run(
              clientData.userId,    // from_user_id
              targetUser.id,        // to_user_id  
              data.text,           // message_text
              'dm',                // message_type
              targetSocket ? 1 : 0 // is_delivered (1 si en ligne, 0 sinon)
            );
            console.log("✅ Message sauvegardé en base de données");
          } catch (dbError) {
            console.error("❌ Erreur sauvegarde message:", dbError);
          }

          // Si l'utilisateur est connecté, envoyer le DM à tous ses onglets
          const sent = sendToAllUserSockets(data.to, {
            type: "dm",
            from: fromUser,
            fromDisplayName: fromDisplayName,
            to: data.to,
            text: data.text,
          });

          if (sent) {
            // Confirmation à l'expéditeur
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: t('message_delivered', clientData.language, { user: targetUser.display_name || data.to }),
              })
            );
          } else {
            // L'utilisateur n'est pas connecté - DM stocké pour livraison ultérieure
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: t('message_sent_offline', clientData.language, { user: targetUser.display_name || data.to }),
              })
            );
          }

          // Écho éventuel à l'expéditeur (utile pour logs ou synchro)
          socket.send(
            JSON.stringify({
              type: "dm",
              from: fromUser,
              fromDisplayName: fromDisplayName,
              to: data.to,
              text: data.text,
            })
          );

          return;
        }

        // 6️⃣ Commande pour lister les utilisateurs
        if (data.type === "listUsers") {
          const fromUser = clientData.username;
          console.log("🔍 Commande listUsers reçue de:", fromUser);
          try {
            // Récupérer tous les utilisateurs de la base de données
            const allUsers = statements.getAllUsers.all();
            console.log("👥 Utilisateurs trouvés:", allUsers.length);
            const userList = allUsers
              .filter(user => user.username !== fromUser) // Exclure l'utilisateur actuel
              .map(user => {
                const isOnline = onlineUsers.has(user.username);
                const status = isOnline ? "🟢" : "⚫";
                return `${status} ${user.display_name || user.username} (@${user.username})`;
              })
              .join('\n');

            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: userList || "Aucun autre utilisateur trouvé.",
              })
            );
          } catch (error) {
            console.error("❌ Erreur lors de listUsers:", error);
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: "Erreur lors de la récupération des utilisateurs.",
              })
            );
          }
          return;
        }

        // 7️⃣ Demande de la liste des utilisateurs en ligne
        if (data.type === "getOnlineUsers") {
          const usersList = getOnlineUsers();
          socket.send(JSON.stringify({ type: "onlineUsersList", users: usersList }));
          console.log(`📅 Liste des utilisateurs en ligne envoyée à ${clientData.username}:`, usersList);
          return;
        }

        // 7️⃣ Commande pour voir l'historique d'une conversation
        if (data.type === "getHistory" && data.target) {
          const fromUser = clientData.username;

          // Vérifier que l'utilisateur cible existe
          const targetUser = statements.getUserByUsername.get(data.target);
          if (!targetUser) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: t('user_not_exists', clientData.language, { user: data.target }),
              })
            );
            return;
          }

          try {
            console.log("🔍 Requête historique:", {
              fromUserId: clientData.userId,
              fromUsername: clientData.username,
              targetUserId: targetUser.id,
              targetUsername: targetUser.username,
              params: [clientData.userId, targetUser.id, targetUser.id, clientData.userId]
            });

            const history = statements.getConversationHistory.all(
              clientData.userId, targetUser.id, targetUser.id, clientData.userId
            );

            console.log("📋 Historique récupéré:", {
              count: history.length,
              messages: history.map(msg => ({
                id: msg.id,
                from: msg.from_username,
                to: msg.to_username,
                text: msg.message_text.substring(0, 50) + "...",
                date: msg.created_at
              }))
            });

            if (history.length === 0) {
              socket.send(
                JSON.stringify({
                  from: "Serveur",
                  text: t('no_history', clientData.language, { user: targetUser.display_name || data.target }),
                })
              );
            } else {
              socket.send(
                JSON.stringify({
                  from: "Serveur",
                  text: t('history_with', clientData.language, {
                    user: targetUser.display_name || data.target,
                    count: history.length
                  }),
                })
              );

              // Envoyer chaque message de l'historique
              for (const msg of history) {
                const isFromMe = msg.from_user_id === clientData.userId;
                const displayName = isFromMe ? "Moi" : (msg.from_display_name || msg.from_username);

                socket.send(
                  JSON.stringify({
                    type: "dm",
                    from: msg.from_username,
                    fromDisplayName: displayName,
                    to: isFromMe ? msg.to_username : msg.from_username,
                    text: msg.message_text,
                    timestamp: msg.created_at,
                    isHistory: true
                  })
                );
              }
            }
          } catch (dbError) {
            console.error("❌ Erreur récupération historique:", dbError);
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: "Erreur lors de la récupération de l'historique.",
              })
            );
          }
          return;
        }

        // 8️⃣ Messages "standards" : on limite aux messages système (Serveur / Tournoi)
        if (data.from && data.text) {
          const isSystem =
            data.from === "Serveur" ||
            data.from === "Tournoi";

          // DM only pour les utilisateurs : on ignore tout message "global" d'utilisateur
          if (!isSystem) {
            return;
          }

          // Diffusion globale du message système
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const cData = clients.get(client);
              if (!cData.blocked.has(data.from)) {
                client.send(
                  JSON.stringify({
                    from: data.from,
                    text: data.text,
                  })
                );
              }
            }
          });
        }
      } catch (e) {
        console.error("Erreur WebSocket chat:", e);
      }
    });

    // === Déconnexion ===
    socket.on("close", (code, reason) => {
      const clientData = clients.get(socket);
      const username = clientData?.username;

      console.log("🔌 Connexion fermée:", {
        username: username || "anonyme",
        code,
        reason: reason.toString(),
        totalConnected: clients.size - 1
      });

      clients.delete(socket);

      // Vérifier s'il reste d'autres connexions pour cet utilisateur
      if (username) {
        const remainingUserSockets = findAllSocketsByUsername(username);
        if (remainingUserSockets.length === 0) {
          // Plus aucune connexion pour cet utilisateur, le diffuser comme hors ligne
          broadcastUserStatus(username, false);
        }
      }
    });
  });

  console.log("💬 WebSocket chat attached on ws://localhost:8000/chat");
}

module.exports = { setupChat };