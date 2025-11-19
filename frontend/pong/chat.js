var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function () {
    class Chat {
        constructor() {
            this.chatBox = null;
            this.messageInput = null;
            this.btnSend = null;
            this.conversationTabs = null;
            this.currentChatLabel = null;
            this.profileModal = null;
            this.profileClose = null;
            this.profileName = null;
            this.profileUsername = null;
            this.profileAvatar = null;
            this.conversations = {};
            this.currentChatUser = null;
            this.username = null;
            this.ws = null;
            this.init();
        }
        init() {
            document.addEventListener('DOMContentLoaded', () => {
                this.initChat();
                console.log('✅ Chat initialized');
            });
        }
        initChat() {
            return __awaiter(this, void 0, void 0, function* () {
                this.chatBox = document.getElementById("chatbox");
                this.messageInput = document.getElementById("msg");
                this.btnSend = document.getElementById("send");
                this.conversationTabs = document.getElementById("conversation-tabs");
                this.currentChatLabel = document.getElementById("current-chat");
                this.profileModal = document.getElementById("profile-modal");
                this.profileClose = document.getElementById("profile-modal-close");
                this.profileName = document.getElementById("profile-modal-name");
                this.profileUsername = document.getElementById("profile-modal-username");
                this.profileAvatar = document.getElementById("profile-modal-avatar");
                if (!this.chatBox || !this.messageInput || !this.btnSend) {
                    console.error("Chat: éléments DOM introuvables (#chatbox, #msg, #send).");
                    return;
                }
                // 1) Essayer d'utiliser le vrai username du user connecté
                try {
                    const res = yield fetch('/api/user/profile');
                    if (res.ok) {
                        const data = yield res.json();
                        if (data.user && data.user.username) {
                            this.username = data.user.username;
                        }
                    }
                }
                catch (e) {
                    console.warn("Impossible de récupérer /api/user/profile, fallback sur pseudo libre.");
                }
                this.setupWebSocket();
                this.setupEventListeners();
            });
        }
        setupWebSocket() {
            const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
            const wsUrl = `${wsProtocol}://${window.location.host}/chat`;
            this.ws = new WebSocket(wsUrl);
            // Helper pour le tournoi : envoie un message système dans le chat
            if (!window.PONG)
                window.PONG = {};
            window.PONG.sendChatSystemMessage = (text) => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ from: "Tournoi", text }));
                }
            };
            this.ws.onopen = () => {
                if (this.ws) {
                    this.ws.send(JSON.stringify({ type: "login", username: this.username }));
                    this.addSystemMessage(`Tu es connecté en tant que ${this.username}`);
                    this.addSystemMessage(`Commandes : /dm pseudo ton message (pour démarrer une conversation), /block pseudo, /unblock pseudo, /invite pseudo`);
                }
            };
            this.ws.onmessage = (event) => {
                this.handleWebSocketMessage(event);
            };
            this.ws.onerror = (err) => {
                console.error("Chat: WS ERROR", err);
                this.addSystemMessage("Erreur de connexion au chat.");
            };
            this.ws.onclose = () => {
                this.addSystemMessage("Connexion au chat fermée.");
            };
        }
        handleWebSocketMessage(event) {
            let data;
            try {
                data = JSON.parse(event.data);
            }
            catch (_a) {
                return;
            }
            // Invitations
            if (data.type === "invite") {
                this.handleInvite(data);
                return;
            }
            if (data.type === "inviteResponse") {
                this.handleInviteResponse(data);
                return;
            }
            const from = data.from;
            const text = data.text;
            if (!from || !text)
                return;
            // DM reçu
            if (data.type === "dm") {
                // on ignore l'écho de nos propres DM, on les a déjà ajoutés au store local
                if (from === this.username)
                    return;
                const otherUser = from; // celui qui nous écrit
                this.addMessageToConversation(otherUser, from, text, false);
                return;
            }
            // Messages système (Serveur / Tournoi)
            if (from === "Serveur" || from === "Tournoi") {
                this.addSystemMessage(text);
            }
        }
        setupEventListeners() {
            if (this.btnSend) {
                this.btnSend.addEventListener("click", () => this.sendMessage());
            }
            if (this.messageInput) {
                this.messageInput.addEventListener("keyup", (e) => {
                    if (e.key === "Enter")
                        this.sendMessage();
                });
            }
            // Fermeture du modal profil
            if (this.profileClose && this.profileModal) {
                this.profileClose.addEventListener("click", () => {
                    if (this.profileModal) {
                        this.profileModal.style.display = "none";
                    }
                });
                this.profileModal.addEventListener("click", (e) => {
                    if (e.target === this.profileModal && this.profileModal) {
                        this.profileModal.style.display = "none";
                    }
                });
            }
        }
        ensureConversation(user) {
            if (!this.conversations[user]) {
                this.conversations[user] = [];
            }
        }
        setCurrentChatUser(user) {
            this.currentChatUser = user;
            if (this.currentChatLabel) {
                this.currentChatLabel.textContent = user
                    ? `Conversation avec ${user}`
                    : "Aucune conversation sélectionnée";
            }
            this.renderConversationTabs();
            this.renderCurrentConversation();
        }
        renderConversationTabs() {
            if (!this.conversationTabs)
                return;
            this.conversationTabs.innerHTML = "";
            Object.keys(this.conversations).forEach((user) => {
                const tab = document.createElement("button");
                tab.classList.add("conversation-tab");
                if (user === this.currentChatUser)
                    tab.classList.add("active");
                tab.textContent = user;
                tab.addEventListener("click", () => {
                    this.setCurrentChatUser(user);
                });
                if (this.conversationTabs) {
                    this.conversationTabs.appendChild(tab);
                }
            });
        }
        renderCurrentConversation() {
            if (!this.chatBox)
                return;
            this.chatBox.innerHTML = "";
            if (!this.currentChatUser)
                return;
            const msgs = this.conversations[this.currentChatUser] || [];
            msgs.forEach((m) => {
                const type = m.mine ? "me" : "other";
                const fromLabel = m.mine ? this.username || "" : m.from;
                const node = this.createMessageBubble(fromLabel, m.text, type);
                if (this.chatBox) {
                    this.chatBox.appendChild(node);
                }
            });
            if (this.chatBox) {
                this.chatBox.scrollTop = this.chatBox.scrollHeight;
            }
        }
        addMessageToConversation(otherUser, from, text, mine = false) {
            this.ensureConversation(otherUser);
            this.conversations[otherUser].push({ from, text, mine });
            if (!this.currentChatUser) {
                // Première conversation → on la sélectionne automatiquement
                this.setCurrentChatUser(otherUser);
            }
            else if (otherUser === this.currentChatUser) {
                this.renderCurrentConversation();
            }
            else {
                // juste mettre à jour les tabs (nouvelle conversation)
                this.renderConversationTabs();
            }
        }
        addSystemMessage(text) {
            if (!this.chatBox)
                return;
            const msgDiv = document.createElement("div");
            msgDiv.classList.add("message", "system");
            msgDiv.textContent = text;
            this.chatBox.appendChild(msgDiv);
            this.chatBox.scrollTop = this.chatBox.scrollHeight;
        }
        sendMessage() {
            if (!this.messageInput || !this.ws)
                return;
            const text = this.messageInput.value.trim();
            if (!text)
                return;
            if (text.startsWith("/block ")) {
                const target = text.split(" ")[1];
                if (target) {
                    this.ws.send(JSON.stringify({ type: "block", target }));
                    this.addSystemMessage(`Tu bloques ${target}`);
                }
                else {
                    this.addSystemMessage("Format : /block pseudo");
                }
            }
            else if (text.startsWith("/unblock ")) {
                const target = text.split(" ")[1];
                if (target) {
                    this.ws.send(JSON.stringify({ type: "unblock", target }));
                    this.addSystemMessage(`Tu débloques ${target}`);
                }
                else {
                    this.addSystemMessage("Format : /unblock pseudo");
                }
            }
            else if (text.startsWith("/invite ")) {
                const target = text.split(" ")[1];
                if (target) {
                    this.ws.send(JSON.stringify({ type: "invite", target }));
                    this.addSystemMessage(`Invitation envoyée à ${target}`);
                }
                else {
                    this.addSystemMessage("Format : /invite pseudo");
                }
            }
            else if (text.startsWith("/dm ")) {
                // Démarrer une nouvelle conversation via commande
                const parts = text.split(" ");
                const target = parts[1];
                const body = parts.slice(2).join(" ");
                if (!target || !body) {
                    this.addSystemMessage("Format attendu : /dm pseudo ton message");
                }
                else {
                    this.ws.send(JSON.stringify({
                        type: "dm",
                        to: target,
                        text: body,
                    }));
                    this.addMessageToConversation(target, this.username || "", body, true);
                }
            }
            else {
                // Message simple → envoyé à la conversation actuellement sélectionnée
                if (!this.currentChatUser) {
                    this.addSystemMessage("Aucune conversation sélectionnée. Utilise : /dm pseudo ton message pour démarrer une nouvelle conversation.");
                }
                else {
                    this.ws.send(JSON.stringify({
                        type: "dm",
                        to: this.currentChatUser,
                        text,
                    }));
                    this.addMessageToConversation(this.currentChatUser, this.username || "", text, true);
                }
            }
            this.messageInput.value = "";
        }
        handleInvite(data) {
            var _a;
            const from = data.from;
            if (!from || !this.ws)
                return;
            const accept = window.confirm(`${from} t'invite à jouer à Pong.\nVeux-tu accepter ?`);
            this.ws.send(JSON.stringify({
                type: "inviteResponse",
                to: from,
                accepted: accept,
            }));
            const gameModule = window.PONG;
            if (accept && ((_a = gameModule === null || gameModule === void 0 ? void 0 : gameModule.PongGame) === null || _a === void 0 ? void 0 : _a.start)) {
                gameModule.PongGame.start();
            }
        }
        handleInviteResponse(data) {
            var _a;
            const from = data.from;
            if (!from)
                return;
            const gameModule = window.PONG;
            if (data.accepted) {
                this.addSystemMessage(`${from} a accepté ton invitation, la partie commence !`);
                if ((_a = gameModule === null || gameModule === void 0 ? void 0 : gameModule.PongGame) === null || _a === void 0 ? void 0 : _a.start) {
                    gameModule.PongGame.start();
                }
            }
            else {
                this.addSystemMessage(`${from} a refusé ton invitation.`);
            }
        }
        openUserProfile(usernameToView) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const res = yield fetch(`/api/user/public/${encodeURIComponent(usernameToView)}`);
                    if (res.status === 404) {
                        this.addSystemMessage(`Ce joueur (${usernameToView}) n'a pas de profil enregistré (invité ou non inscrit).`);
                        return;
                    }
                    if (!res.ok) {
                        this.addSystemMessage(`Erreur en récupérant le profil de ${usernameToView}.`);
                        return;
                    }
                    const data = yield res.json();
                    const user = data.user || data;
                    if (this.profileName && this.profileUsername && this.profileAvatar && this.profileModal) {
                        this.profileName.textContent =
                            user.display_name || user.username || usernameToView;
                        this.profileUsername.textContent = `@${user.username || usernameToView}`;
                        this.profileAvatar.src =
                            user.avatar_url || "/avatars/default_avatar.png";
                        this.profileModal.style.display = "flex";
                    }
                    // En même temps, on ouvre/force une conversation avec ce joueur
                    this.ensureConversation(usernameToView);
                    this.setCurrentChatUser(usernameToView);
                }
                catch (e) {
                    console.error("Erreur chargement profil:", e);
                    this.addSystemMessage(`Erreur lors du chargement du profil de ${usernameToView}.`);
                }
            });
        }
        createMessageBubble(from, text, type) {
            const msgDiv = document.createElement("div");
            msgDiv.classList.add("message", type);
            if (!from || type === "system") {
                msgDiv.textContent = text;
            }
            else {
                const nameSpan = document.createElement("span");
                nameSpan.classList.add("chat-username");
                nameSpan.textContent = from + ": ";
                nameSpan.addEventListener("click", () => {
                    this.openUserProfile(from);
                });
                const textSpan = document.createElement("span");
                textSpan.textContent = text;
                msgDiv.appendChild(nameSpan);
                msgDiv.appendChild(textSpan);
            }
            return msgDiv;
        }
    }
    if (!window.PONG)
        window.PONG = {};
    window.PONG.Chat = new Chat();
})();
//# sourceMappingURL=chat.js.map