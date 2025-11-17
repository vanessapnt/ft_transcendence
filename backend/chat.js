// backend/chat.js
const WebSocket = require("ws");
const { statements } = require("./database");

/**
 * Attache le chat WebSocket à un serveur HTTP existant.
 * @param {import("http").Server} server - serveur HTTP Express existant
 */
function setupChat(server) {
  // On crée un WebSocket Server monté sur le même serveur HTTP (sur /chat)
  const wss = new WebSocket.Server({ server, path: "/chat" });

  // socket => { username, displayName, userId, blocked: Set }
  const clients = new Map();

  // Petit helper pour retrouver un socket à partir d'un username
  function findSocketByUsername(username) {
    for (const [sock, info] of clients.entries()) {
      if (info.username === username) {
        return sock;
      }
    }
    return null;
  }

  // === Connexion d'un nouveau client ===
  wss.on("connection", (socket) => {
    clients.set(socket, { username: null, displayName: null, userId: null, blocked: new Set() });

    // Réception d'un message WebSocket
    socket.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        const clientData = clients.get(socket);
        if (!clientData) return;

        // 1️⃣ Connexion utilisateur - récupération depuis la DB
        if (data.type === "login" && data.username) {
          // Récupérer l'utilisateur depuis la base de données
          const user = statements.getUserByUsername.get(data.username);
          
          if (!user) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: "Utilisateur non trouvé dans la base de données.",
              })
            );
            return;
          }

          // Utiliser le display_name de la DB (fallback sur username)
          clientData.username = user.username;
          clientData.displayName = user.display_name || user.username;
          clientData.userId = user.id;

          socket.send(
            JSON.stringify({
              from: "Serveur",
              text: `Bienvenue ${clientData.displayName}`,
            })
          );
          return;
        }

        // Si pas encore loggé, on ignore toutes les autres actions
        if (!clientData.username) {
          socket.send(
            JSON.stringify({
              from: "Serveur",
              text: "Tu dois d'abord te connecter au chat.",
            })
          );
          return;
        }

        // 2️⃣ Blocage / Déblocage d'utilisateur
        if (data.type === "block" && data.target) {
          clientData.blocked.add(data.target);
          socket.send(
            JSON.stringify({
              from: "Serveur",
              text: `Tu as bloqué ${data.target}`,
            })
          );
          return;
        }

        if (data.type === "unblock" && data.target) {
          clientData.blocked.delete(data.target);
          socket.send(
            JSON.stringify({
              from: "Serveur",
              text: `Tu as débloqué ${data.target}`,
            })
          );
          return;
        }

        // 3️⃣ Invitation à jouer à Pong
        if (data.type === "invite" && data.target) {
          const fromUser = clientData.username;
          const fromDisplayName = clientData.displayName;
          const targetSocket = findSocketByUsername(data.target);

          if (!targetSocket || targetSocket.readyState !== WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: `${data.target} n'est pas connecté.`,
              })
            );
            return;
          }

          const targetData = clients.get(targetSocket);

          // Si la cible a bloqué l'invitant, on ne lui envoie rien
          if (targetData && targetData.blocked.has(fromUser)) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: `${data.target} t'a bloqué, invitation ignorée.`,
              })
            );
            return;
          }

          // Envoi de l'invitation à la cible
          targetSocket.send(
            JSON.stringify({
              type: "invite",
              from: fromUser,
              fromDisplayName: fromDisplayName,
              text: `${fromDisplayName} t'invite à jouer à Pong.`,
            })
          );

          // Feedback à l'émetteur
          socket.send(
            JSON.stringify({
              from: "Serveur",
              text: `Invitation envoyée à ${targetData.displayName || data.target}`,
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
          const targetSocket = findSocketByUsername(data.to);

          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(
              JSON.stringify({
                type: "inviteResponse",
                from: fromUser,
                fromDisplayName: fromDisplayName,
                accepted: data.accepted,
              })
            );
          }
          return;
        }

        // 5️⃣ Message direct (DM) entre deux utilisateurs
        if (data.type === "dm" && data.to && data.text) {
          const fromUser = clientData.username;
          const fromDisplayName = clientData.displayName;
          const targetSocket = findSocketByUsername(data.to);

          if (!targetSocket || targetSocket.readyState !== WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: `${data.to} n'est pas connecté.`,
              })
            );
            return;
          }

          const targetData = clients.get(targetSocket);
          // Si la cible a bloqué l'expéditeur
          if (targetData && targetData.blocked.has(fromUser)) {
            socket.send(
              JSON.stringify({
                from: "Serveur",
                text: `${targetData.displayName || data.to} a bloqué vos messages.`,
              })
            );
            return;
          }

          // Envoi du DM à la cible
          targetSocket.send(
            JSON.stringify({
              type: "dm",
              from: fromUser,
              fromDisplayName: fromDisplayName,
              to: data.to,
              text: data.text,
            })
          );

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

        // 6️⃣ Messages "standards" : on limite aux messages système (Serveur / Tournoi)
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
    socket.on("close", () => {
      clients.delete(socket);
    });
  });

  console.log("💬 WebSocket chat attached on ws://localhost:8000/chat");
}

module.exports = { setupChat };