(function () {

    interface Message {
        from: string;
        text: string;
        mine: boolean;
        timestamp?: string; // Pour les messages d'historique
        isHistory?: boolean; // Pour distinguer les messages d'historique
    }

    interface Conversations {
        [username: string]: Message[];
    }

    interface ChatData {
        type?: string;
        from?: string;
        fromDisplayName?: string;
        text?: string;
        to?: string;
        username?: string;
        target?: string;
        users?: string[]; // Liste d'utilisateurs (ex. onlineUsersList)
        accepted?: boolean;
        isHistory?: boolean; // Pour les messages d'historique
        timestamp?: string; // Pour les messages d'historique
    }

    class Chat {
        private chatBox: HTMLElement | null = null;
        private messageInput: HTMLInputElement | null = null;
        private btnSend: HTMLButtonElement | null = null;
        private conversationTabs: HTMLElement | null = null;
        private currentChatLabel: HTMLElement | null = null;
        private profileModal: HTMLElement | null = null;
        private profileClose: HTMLElement | null = null;
        private profileName: HTMLElement | null = null;
        private profileUsername: HTMLElement | null = null;
        private profileAvatar: HTMLImageElement | null = null;

        private conversations: Conversations = {};
        private unreadMessages: { [username: string]: number } = {}; // Compteur de messages non lus
        public currentChatUser: string | null = null;
        private username: string | null = null;
        private ws: WebSocket | null = null;
        private historyLoaded: Set<string> = new Set(); // Suivi des historiques chargés
        public blockedUsers: Set<string> = new Set(); // Liste des utilisateurs bloqués
        private friendsOnly: boolean = false; // Filtrage par amis
        private friendsList: Set<string> = new Set(); // Liste des amis
        private onlineUsers: Set<string> = new Set(); // Liste des utilisateurs en ligne

        constructor() {
            this.init();
        }

        private init(): void {
            document.addEventListener('DOMContentLoaded', () => {
                // Initialiser les éléments DOM
                this.chatBox = document.getElementById("chatbox");
                this.messageInput = document.getElementById("msg") as HTMLInputElement;
                this.btnSend = document.getElementById("send") as HTMLButtonElement;
                this.conversationTabs = document.getElementById("conversation-tabs");
                this.currentChatLabel = document.getElementById("current-chat");
                this.profileModal = document.getElementById("profile-modal");
                this.profileClose = document.getElementById("profile-modal-close");
                this.profileName = document.getElementById("profile-modal-name");
                this.profileUsername = document.getElementById("profile-modal-username");
                this.profileAvatar = document.getElementById("profile-modal-avatar") as HTMLImageElement;

                this.setupEventListeners();



                // Ajouter l'event listener pour le switch Friends Only
                const friendsToggle = document.getElementById("friends-only-toggle") as HTMLInputElement;
                if (friendsToggle) {
                    friendsToggle.addEventListener("change", () => {
                        this.friendsOnly = friendsToggle.checked;
                        console.log("🔄 Filtre amis:", this.friendsOnly ? "activé" : "désactivé");
                        this.renderConversationTabs();
                    });
                }

                console.log('✅ Chat DOM initialized');
            });
        }

        // Méthode publique pour initialiser le chat après login
        public async initializeChat(): Promise<void> {
            console.log("🎯 Initialisation du chat après login...");

            if (!this.chatBox || !this.messageInput || !this.btnSend) {
                console.error("❌ Éléments DOM du chat non chargés");
                return;
            }

            // Récupérer le username de l'utilisateur connecté
            try {
                console.log("🔍 Récupération du profil utilisateur...");
                const res = await fetch('/api/user/profile');
                console.log("📡 Réponse /api/user/profile:", res.status, res.ok);
                if (res.ok) {
                    const data = await res.json();
                    console.log("📋 Données utilisateur:", data);
                    if (data.user && data.user.username) {
                        this.username = data.user.username;
                        console.log("✅ Username récupéré:", this.username);
                        // Charger la liste des amis
                        await this.loadFriendsList();
                        // Charger les conversations maintenant qu'on a le username
                        this.loadConversationsFromStorage();
                        // Connecter le WebSocket
                        this.setupWebSocket();
                        console.log("✅ Chat complètement initialisé pour", this.username);
                    } else {
                        console.log("❌ Pas d'username dans la réponse");
                    }
                } else {
                    console.log("❌ Erreur API:", res.status);
                }
            } catch (e) {
                console.warn("❌ Erreur lors de la récupération du profil:", e);
            }
        }

        private async loadFriendsList(): Promise<void> {
            try {
                const response = await fetch('/api/friends/list', {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    this.friendsList = new Set(data.friends.map((f: any) => f.username));
                    console.log("✅ Liste d'amis chargée:", this.friendsList.size, "amis");
                }
            } catch (error) {
                console.error("❌ Erreur lors du chargement de la liste d'amis:", error);
            }
        }


        // Méthode publique pour rafraîchir la liste des amis
        public async refreshFriendsList(): Promise<void> {
            await this.loadFriendsList();
            this.renderConversationTabs();
            console.log("🔄 Liste d'amis rafraîchie");
        }

        private reconnectAttempts = 0;
        private maxReconnectAttempts = 0; // Désactivé - pas de reconnexion automatique
        private reconnectDelay = 1000; // 1 seconde au début
        private isIntentionalDisconnect = false;
        private isConnecting = false; // Empêche les connexions multiples
        private reconnectTimer: number | null = null; // Pour annuler les reconnexions en attente

        private setupWebSocket(): void {
            // Empêcher les connexions multiples
            if (this.isConnecting) {
                console.log("⚠️ Connexion déjà en cours, ignore...");
                return;
            }

            // Fermer la connexion existante si elle existe
            if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
                console.log("🔌 Fermeture de la connexion WebSocket existante");
                this.isIntentionalDisconnect = true;
                this.ws.close();
                this.ws = null;
            }

            this.createNewWebSocket();
        }

        private createNewWebSocket(): void {
            this.isConnecting = true;
            const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
            const wsUrl = `${wsProtocol}://${window.location.host}/chat`;
            console.log("🔗 Tentative de connexion WebSocket:", wsUrl);

            try {
                this.ws = new WebSocket(wsUrl);
            } catch (error) {
                console.error("❌ Erreur création WebSocket:", error);
                this.isConnecting = false;
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_error_connection') : "❌ Erreur de connexion au chat. Veuillez rafraîchir la page.");
                // Plus de reconnexion automatique
                return;
            }

            // Helper pour le tournoi : envoie un message système dans le chat
            if (!(window as any).PONG)
                (window as any).PONG = {};

            (window as any).PONG.sendChatSystemMessage = (text: string) => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ from: "Tournoi", text }));
                }
            };

            this.ws.onopen = () => {
                console.log("✅ WebSocket connexion établie");
                this.isConnecting = false; // Connexion réussie
                this.isIntentionalDisconnect = false; // Reset pour les futures déconnexions
                this.reconnectAttempts = 0; // Reset compteur de reconnexion
                this.reconnectDelay = 1000; // Reset délai

                if (this.ws) {
                    const i18n = (window as any).i18n;
                    const currentLanguage = i18n ? i18n.getCurrentLanguage() : 'en';
                    console.log("🔐 Envoi du login:", this.username, "langue:", currentLanguage);
                    this.ws.send(JSON.stringify({
                        type: "login",
                        username: this.username,
                        language: currentLanguage
                    }));
                    // Message de bienvenue désactivé
                }
            };

            this.ws.onmessage = (event) => {
                this.handleWebSocketMessage(event);
            };

            this.ws.onerror = (err) => {
                console.error("❌ Chat: WS ERROR", err);
                this.isConnecting = false; // Erreur de connexion
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_error_connection_failed') : "Erreur de connexion au chat.");
            };

            this.ws.onclose = (event) => {
                console.log("🔌 WebSocket fermée:", { code: event.code, reason: event.reason, intentional: this.isIntentionalDisconnect });
                this.isConnecting = false; // Connexion fermée
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_connection_closed') : "Connexion au chat fermée.");

                // Pas de reconnexion automatique - l'utilisateur doit rafraîchir la page
                // if (!this.isIntentionalDisconnect) {
                //     this.scheduleReconnect();
                // }
            };
        }

        private scheduleReconnect(): void {
            // Système de reconnexion automatique désactivé
            console.log("🚫 Reconnexion automatique désactivée");
            const i18n = (window as any).i18n;
            this.addSystemMessage(i18n ? i18n.t('chat_connection_closed_refresh') : "❌ Connexion fermée. Veuillez rafraîchir la page pour vous reconnecter.");
            return;

            /* Code de reconnexion désactivé
            // Annuler toute reconnexion en attente
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                this.addSystemMessage("❌ Impossible de se reconnecter au chat après plusieurs tentatives.");
                return;
            }

            // Ne pas reconnecter si on est déjà en train de se connecter ou connecté
            if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
                console.log("⚠️ Reconnexion ignorée: déjà connecté ou en cours de connexion");
                return;
            }

            this.reconnectAttempts++;
            console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${this.reconnectDelay}ms`);

            this.reconnectTimer = window.setTimeout(() => {
                if (this.username && !this.isConnecting) {
                    this.addSystemMessage(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
                    this.setupWebSocket();
                }
                this.reconnectTimer = null;
            }, this.reconnectDelay);

            // Augmentation progressive du délai (backoff exponentiel)
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 secondes
            */
        }

        public disconnect(): void {
            console.log("🔌 Déconnexion intentionnelle du chat");
            this.isIntentionalDisconnect = true;

            // Annuler les reconnexions en attente
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

            // Réinitialiser l'état de l'historique chargé et EFFACER les conversations
            this.historyLoaded.clear();
            this.conversations = {}; // Vider les conversations en mémoire
            this.unreadMessages = {}; // Vider les messages non lus
            this.blockedUsers.clear(); // Vider la liste des utilisateurs bloqués
            this.currentChatUser = null;

            // Mettre à jour l'interface
            this.renderConversationTabs();
            this.updateAvatarNotification();
            this.updateBlockButton();

            // Fermer la connexion WebSocket
            if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
                this.ws.close();
            }
            this.ws = null;
            this.isConnecting = false;
        }

        // === Méthodes de persistance des conversations ===
        private saveConversationsToStorage(): void {
            try {
                if (!this.username) return;
                const key = `chat_conversations_${this.username}`;
                localStorage.setItem(key, JSON.stringify(this.conversations));
                console.log("💾 Conversations sauvegardées dans localStorage");
            } catch (e) {
                console.warn("❌ Erreur lors de la sauvegarde des conversations:", e);
            }
        }

        private loadConversationsFromStorage(): void {
            try {
                if (!this.username) {
                    console.log("⚠️ Impossible de charger les conversations: username non défini");
                    return;
                }
                const key = `chat_conversations_${this.username}`;
                const saved = localStorage.getItem(key);
                if (saved) {
                    this.conversations = JSON.parse(saved);
                    console.log("📂 Conversations chargées depuis localStorage pour", this.username, ":", Object.keys(this.conversations));
                    this.renderConversationTabs();
                } else {
                    console.log("📂 Aucune conversation sauvegardée pour", this.username);
                    this.conversations = {};
                }
            } catch (e) {
                console.warn("❌ Erreur lors du chargement des conversations:", e);
                this.conversations = {};
            }
        }

        private clearStoredConversations(): void {
            try {
                if (!this.username) return;
                const key = `chat_conversations_${this.username}`;
                localStorage.removeItem(key);
                console.log("🗑️ Conversations supprimées du localStorage");
            } catch (e) {
                console.warn("❌ Erreur lors de la suppression des conversations:", e);
            }
        }

        // Méthode publique pour effacer toutes les conversations
        public clearAllConversations(): void {
            this.conversations = {};
            this.currentChatUser = null;
            this.historyLoaded.clear();
            this.clearStoredConversations();
            this.renderConversationTabs();
            this.renderCurrentConversation();
            console.log("🗑️ Toutes les conversations ont été effacées");
        }

        private handleWebSocketMessage(event: MessageEvent): void {
            let data: ChatData;
            try {
                data = JSON.parse(event.data);
                console.log("📨 Message WebSocket reçu:", data);
            } catch {
                return;
            }

            // Invitations
            if (data.type === "invite") {
                console.log("🎮 Type invite détecté, appel handleInvite...");
                this.handleInvite(data);
                return;
            }
            if (data.type === "inviteResponse") {
                console.log("📤 Type inviteResponse détecté...");
                this.handleInviteResponse(data);
                return;
            }
            if (data.type === "gameEnded") {
                console.log("🏁 Type gameEnded détecté...");
                this.handleGameEnded(data);
                return;
            }

            // Gestion du statut en ligne des utilisateurs
            if (data.type === "userOnline") {
                if (data.username) {
                    this.onlineUsers.add(data.username);
                    console.log(`🟢 ${data.username} est maintenant en ligne`);
                    this.renderConversationTabs();
                }
                return;
            }
            if (data.type === "userOffline") {
                if (data.username) {
                    this.onlineUsers.delete(data.username);
                    console.log(`🔴 ${data.username} est maintenant hors ligne`);
                    this.renderConversationTabs();
                }
                return;
            }
            // Liste des utilisateurs en ligne
            if (data.type === "onlineUsersList") {
                if (data.users && Array.isArray(data.users)) {
                    this.onlineUsers = new Set(data.users);
                    console.log(`📅 Liste des utilisateurs en ligne reçue:`, data.users);
                    this.renderConversationTabs();
                }
                return;
            }

            const from = data.from;
            const text = data.text;

            if (!from || !text) return;

            // DM reçu
            if (data.type === "dm") {
                console.log("📨 DM reçu:", { from, to: data.to, text, isMyMessage: from === this.username, isHistory: data.isHistory });

                if (data.isHistory) {
                    // Message d'historique - l'ajouter au début de la conversation
                    const otherUser = from === this.username ? data.to : from;
                    if (otherUser) {
                        this.addHistoryMessageToConversation(otherUser, from, text, from === this.username, data.timestamp);
                    }
                } else if (from === this.username) {
                    // C'est l'écho de notre propre message - l'ajouter à la conversation
                    this.addMessageToConversation(data.to || "", from, text, true);
                } else {
                    // Message reçu d'un autre utilisateur
                    const otherUser = from; // celui qui nous écrit
                    this.addMessageToConversation(otherUser, from, text, false);
                }
                return;
            }

            // Messages système (Serveur / Tournoi)
            if (from === "Serveur" || from === "Tournoi") {
                this.addSystemMessage(text);
            }
        }

        private setupEventListeners(): void {
            if (this.btnSend) {
                this.btnSend.addEventListener("click", () => {
                    console.log("🔘 Bouton Send cliqué");
                    this.sendMessage();
                });
            }

            if (this.messageInput) {
                this.messageInput.addEventListener("keyup", (e) => {
                    console.log("⌨️ Touche pressée:", e.key);
                    if (e.key === "Enter") {
                        console.log("✅ Entrée détectée, appel sendMessage");
                        this.sendMessage();
                    }
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

        private ensureConversation(user: string): void {
            if (!this.conversations[user]) {
                this.conversations[user] = [];
            }
        }

        private setCurrentChatUser(user: string | null): void {
            this.currentChatUser = user;

            // Réinitialiser les messages non lus pour cet utilisateur
            if (user && this.unreadMessages[user]) {
                this.unreadMessages[user] = 0;
                this.updateAvatarNotification();
            }

            if (this.currentChatLabel) {
                const i18n = (window as any).i18n;
                this.currentChatLabel.innerHTML = user
                    ? (i18n ? i18n.t('chat_conversation_with', { user }) : `Conversation avec ${user}`)
                    : (i18n ? i18n.t('chat_no_conversation') : "Aucune conversation sélectionnée");
                
                // Ajouter un click handler sur le label pour afficher le profil
                if (user && this.currentChatLabel) {
                    this.currentChatLabel.style.cursor = 'pointer';
                    this.currentChatLabel.addEventListener('click', () => {
                        if ((window as any).showUserProfile) {
                            (window as any).showUserProfile(user);
                        }
                    });
                }
            }
            this.renderConversationTabs();
            this.renderCurrentConversation();
            this.updateBlockButton();


            // Vérifier le statut d'ami et mettre à jour le bouton
            if (user && (window as any).checkAndUpdateFriendButton) {
                (window as any).checkAndUpdateFriendButton(user);
            }

            // Charger automatiquement l'historique si disponible
            if (user && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.loadConversationHistory(user);
            }
        }

        public updateBlockButton(): void {
            const blockBtn = document.getElementById('block-btn') as HTMLButtonElement;
            if (!blockBtn) return;

            const i18n = (window as any).i18n;

            if (this.currentChatUser && this.blockedUsers.has(this.currentChatUser)) {
                blockBtn.textContent = i18n ? i18n.t('chat_btn_unblock') : 'Débloquer';
                blockBtn.title = i18n ? i18n.t('chat_btn_unblock_title') : 'Débloquer l\'utilisateur';
            } else {
                blockBtn.textContent = i18n ? i18n.t('chat_btn_block') : 'Bloquer';
                blockBtn.title = i18n ? i18n.t('chat_btn_block_title') : 'Bloquer l\'utilisateur';
            }
        }

        private loadConversationHistory(user: string): void {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

            // Éviter de charger l'historique plusieurs fois pour le même utilisateur
            if (this.historyLoaded.has(user)) {
                console.log(`📜 Historique déjà chargé pour ${user}`);
                return;
            }

            console.log(`📜 Chargement de l'historique avec ${user}...`);
            this.historyLoaded.add(user);
            this.ws.send(JSON.stringify({ type: "getHistory", target: user }));
        }

        private renderConversationTabs(): void {
            if (!this.conversationTabs) return;
            this.conversationTabs.innerHTML = "";


            // Filtrer les conversations selon le switch
            let users = Object.keys(this.conversations);
            if (this.friendsOnly) {
                users = users.filter(user => this.friendsList.has(user));
            }

            users.forEach((user) => {
                const tab = document.createElement("button");
                tab.classList.add("conversation-tab");
                if (user === this.currentChatUser) tab.classList.add("active");

                // Ajouter l'avatar de l'utilisateur
                const avatar = document.createElement("img");
                avatar.classList.add("conversation-tab-avatar");
                avatar.src = `/api/user/avatar/${user}`;
                avatar.alt = user;
                avatar.onerror = () => {
                    avatar.src = '/api/user/avatar/default';
                };

                tab.appendChild(avatar);


                // Créer un conteneur pour l'avatar et l'indicateur de statut
                const avatarContainer = document.createElement("div");
                avatarContainer.classList.add("conversation-tab-avatar-container");
                avatarContainer.style.position = "relative";
                avatarContainer.style.display = "inline-block";

                // Ajouter la pastille de statut
                const statusIndicator = document.createElement("div");
                statusIndicator.classList.add("status-indicator");

                // Déterminer le statut en ligne
                const isOnline = this.onlineUsers && this.onlineUsers.has(user);
                statusIndicator.classList.add(isOnline ? 'online' : 'offline');

                avatarContainer.appendChild(avatar);
                avatarContainer.appendChild(statusIndicator);

                tab.appendChild(avatarContainer);

                // Créer un conteneur pour le nom et le badge
                const contentDiv = document.createElement("div");
                contentDiv.classList.add("conversation-tab-content");

                const username = document.createElement("span");
                username.classList.add("conversation-tab-username");
                username.textContent = user;
                contentDiv.appendChild(username);

                tab.appendChild(contentDiv);

                // Ajouter le badge de notification si des messages non lus
                const unreadCount = this.unreadMessages[user] || 0;
                if (unreadCount > 0) {
                    const badge = document.createElement("span");
                    badge.classList.add("unread-badge");
                    badge.textContent = unreadCount > 99 ? "99+" : unreadCount.toString();
                    tab.appendChild(badge);
                }

                tab.addEventListener("click", () => {
                    this.setCurrentChatUser(user);
                });
                if (this.conversationTabs) {
                    this.conversationTabs.appendChild(tab);
                }
            });
        }

        private renderCurrentConversation(): void {
            if (!this.chatBox) return;
            this.chatBox.innerHTML = "";
            if (!this.currentChatUser) return;

            const msgs = this.conversations[this.currentChatUser] || [];
            msgs.forEach((m) => {
                const type = m.mine ? "me" : "other";
                const fromLabel = m.mine ? this.username || "" : m.from;
                const node = this.createMessageBubble(fromLabel, m.text, type, m.isHistory, m.timestamp);
                if (this.chatBox) {
                    this.chatBox.appendChild(node);
                }
            });
            if (this.chatBox) {
                this.chatBox.scrollTop = this.chatBox.scrollHeight;
            }
        }

        private addMessageToConversation(otherUser: string, from: string, text: string, mine: boolean = false): void {
            this.ensureConversation(otherUser);
            this.conversations[otherUser].push({ from, text, mine });
            this.saveConversationsToStorage(); // Sauvegarder après chaque nouveau message

            // Incrémenter les messages non lus si ce n'est pas notre message et pas la conversation active
            if (!mine && otherUser !== this.currentChatUser) {
                this.unreadMessages[otherUser] = (this.unreadMessages[otherUser] || 0) + 1;
                this.updateAvatarNotification();
            }

            // Ne sélectionner automatiquement que si c'est déjà la conversation active ou si le chat est visible
            const chatPanel = document.getElementById('chat-panel');
            const isChatVisible = chatPanel && chatPanel.style.display !== 'none';

            if (!this.currentChatUser && isChatVisible) {
                // Première conversation ET chat visible → on la sélectionne automatiquement
                this.setCurrentChatUser(otherUser);
            } else if (otherUser === this.currentChatUser) {
                this.renderCurrentConversation();
            } else {
                // juste mettre à jour les tabs (nouvelle conversation)
                this.renderConversationTabs();
            }
        }

        private addHistoryMessageToConversation(otherUser: string, from: string, text: string, mine: boolean = false, timestamp?: string): void {
            this.ensureConversation(otherUser);

            // Vérifier si ce message existe déjà pour éviter les doublons
            const exists = this.conversations[otherUser].some(msg =>
                msg.from === from &&
                msg.text === text &&
                msg.mine === mine
            );

            if (exists) {
                console.log("⚠️ Message d'historique déjà présent, ignoré:", { from, text });
                return;
            }

            // Ajouter le message d'historique au début de la conversation (plus ancien d'abord)
            this.conversations[otherUser].unshift({ from, text, mine, timestamp, isHistory: true });
            this.saveConversationsToStorage(); // Sauvegarder après ajout de l'historique

            // Si c'est la conversation active, re-rendre
            if (otherUser === this.currentChatUser) {
                this.renderCurrentConversation();
            } else {
                // Mettre à jour les tabs pour indiquer qu'il y a une nouvelle conversation
                this.renderConversationTabs();
            }
        }

        private addSystemMessage(text: string): void {
            if (!this.chatBox) return;
            const msgDiv = document.createElement("div");
            msgDiv.classList.add("message", "system");
            msgDiv.textContent = text;
            this.chatBox.appendChild(msgDiv);
            this.chatBox.scrollTop = this.chatBox.scrollHeight;
        }

        private parseCommandTarget(command: string, fullText: string): string | null {
            const content = fullText.substring(command.length).trim();

            if (content.startsWith('"')) {
                // Username entre guillemets
                const closingQuoteIndex = content.indexOf('"', 1);
                if (closingQuoteIndex === -1) {
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_format_quotes_missing', { command }) : `Guillemet fermant manquant. Format : ${command} "pseudo avec espaces" OU ${command} pseudo_sans_espaces`);
                    return null;
                }
                return content.substring(1, closingQuoteIndex);
            } else {
                // Username sans guillemets
                const spaceIndex = content.indexOf(" ");
                if (spaceIndex === -1) {
                    // Pas d'espace, retourner tout le contenu
                    return content || null;
                }
                // Prendre seulement le premier mot
                return content.substring(0, spaceIndex);
            }
        }

        private sendMessage(): void {
            console.log("🚀 sendMessage() appelée");
            if (!this.messageInput || !this.ws) {
                console.log("❌ messageInput ou ws manquant:", {
                    messageInput: !!this.messageInput,
                    ws: !!this.ws,
                    wsState: this.ws?.readyState
                });
                return;
            }

            const text = this.messageInput.value.trim();
            console.log("📝 Texte à envoyer:", text);
            if (!text) return;

            if (text.startsWith("/block ")) {
                const target = this.parseCommandTarget("/block ", text);
                if (target) {
                    this.ws.send(JSON.stringify({ type: "block", target }));
                    this.blockedUsers.add(target);
                    this.updateBlockButton();
                    // Message envoyé par le serveur, pas besoin de l'afficher ici
                } else {
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_format_block') : "Format : /block pseudo OU /block \"pseudo avec espaces\"");
                }
            } else if (text.startsWith("/unblock ")) {
                const target = this.parseCommandTarget("/unblock ", text);
                if (target) {
                    this.ws.send(JSON.stringify({ type: "unblock", target }));
                    this.blockedUsers.delete(target);
                    this.updateBlockButton();
                    // Message envoyé par le serveur, pas besoin de l'afficher ici
                } else {
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_format_unblock') : "Format : /unblock pseudo OU /unblock \"pseudo avec espaces\"");
                }
            } else if (text.startsWith("/invite ")) {
                const target = this.parseCommandTarget("/invite ", text);
                console.log("🎯 Target parsé pour /invite:", target);
                if (target) {
                    console.log("📤 Envoi de l'invitation au serveur:", { type: "invite", target });
                    this.ws.send(JSON.stringify({ type: "invite", target }));
                    // Message envoyé par le serveur, pas besoin de l'afficher ici
                } else {
                    console.log("❌ Target invalide pour /invite");
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_format_invite') : "Format : /invite pseudo OU /invite \"pseudo avec espaces\"");
                }
            } else if (text === "/list") {
                // Lister tous les utilisateurs disponibles
                console.log("📋 Commande /list détectée, envoi...");
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ type: "listUsers" }));
                    console.log("✅ Commande /list envoyée au serveur");
                } else {
                    console.log("❌ WebSocket pas ouverte:", this.ws?.readyState);
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_connection_closed_command') : "Connexion fermée, impossible d'envoyer la commande");
                }
                this.messageInput.value = ""; // Vider le champ après /list
            } else if (text.startsWith("/history ")) {
                // Voir l'historique d'une conversation
                const target = this.parseCommandTarget("/history ", text);
                if (target) {
                    console.log("📜 Demande d'historique pour:", target);
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({ type: "getHistory", target }));
                        console.log("✅ Commande /history envoyée");
                    } else {
                        const i18n = (window as any).i18n;
                        this.addSystemMessage(i18n ? i18n.t('chat_connection_closed_command') : "Connexion fermée, impossible d'envoyer la commande");
                    }
                } else {
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_format_history') : "Format : /history pseudo OU /history \"pseudo avec espaces\"");
                }
                this.messageInput.value = ""; // Vider le champ
            } else if (text.startsWith("/dm ")) {
                // Démarrer une nouvelle conversation via commande
                // Support des guillemets pour usernames avec espaces : /dm "John Doe" message
                const dmContent = text.substring(4).trim(); // Enlever "/dm "
                console.log("🔍 Parsing DM:", { originalText: text, dmContent });

                let target, body;

                if (dmContent.startsWith('"')) {
                    // Username entre guillemets
                    const closingQuoteIndex = dmContent.indexOf('"', 1);
                    if (closingQuoteIndex === -1) {
                        const i18n = (window as any).i18n;
                        this.addSystemMessage(i18n ? i18n.t('chat_format_dm_quotes_missing') : "Guillemet fermant manquant. Format : /dm \"pseudo avec espaces\" message OU /dm pseudo_sans_espaces message");
                        return;
                    }
                    target = dmContent.substring(1, closingQuoteIndex);
                    body = dmContent.substring(closingQuoteIndex + 1).trim();
                    console.log("📝 Parsing avec guillemets:", { target, body });
                } else {
                    // Username sans guillemets (pas d'espaces)
                    const firstSpaceIndex = dmContent.indexOf(" ");
                    if (firstSpaceIndex === -1) {
                        const i18n = (window as any).i18n;
                        this.addSystemMessage(i18n ? i18n.t('chat_format_dm') : "Format attendu : /dm pseudo message OU /dm \"pseudo avec espaces\" message");
                        return;
                    }
                    target = dmContent.substring(0, firstSpaceIndex);
                    body = dmContent.substring(firstSpaceIndex + 1);
                    console.log("📝 Parsing sans guillemets:", { target, body });
                }

                if (!target || !body) {
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_format_dm') : "Format attendu : /dm pseudo message OU /dm \"pseudo avec espaces\" message");
                } else {
                    console.log("📤 Envoi DM:", { target, body });
                    this.ws.send(
                        JSON.stringify({
                            type: "dm",
                            to: target,
                            text: body,
                        })
                    );
                    // Ne pas ajouter le message localement - attendre l'écho du serveur
                }
            } else {
                // Message simple → envoyé à la conversation actuellement sélectionnée
                if (!this.currentChatUser) {
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(
                        i18n ? i18n.t('chat_no_conversation_selected') : "Aucune conversation sélectionnée. Utilise : /dm pseudo message OU /dm \"pseudo avec espaces\" message pour démarrer une nouvelle conversation."
                    );
                } else {
                    this.ws.send(
                        JSON.stringify({
                            type: "dm",
                            to: this.currentChatUser,
                            text,
                        })
                    );
                    // Ne pas ajouter le message localement - attendre l'écho du serveur
                }
            }

            this.messageInput.value = "";
        }

        private handleInvite(data: ChatData): void {
            console.log("🎮 Invitation reçue:", data);
            const from = data.from; // username de l'inviteur
            const fromDisplayName = data.fromDisplayName || from;

            if (!from || !this.ws) {
                console.log("❌ Données manquantes pour l'invitation:", { from, ws: !!this.ws });
                return;
            }

            console.log(`📩 Invitation de ${fromDisplayName} (username: ${from}) - affichage du confirm...`);
            const accept = window.confirm(
                `${fromDisplayName} t'invite à jouer à Pong.\nVeux-tu accepter ?`
            );

            console.log(`✅ Réponse à l'invitation: ${accept ? 'acceptée' : 'refusée'}, envoi vers username: ${from}`);

            this.ws.send(
                JSON.stringify({
                    type: "inviteResponse",
                    to: from, // username de l'inviteur
                    accepted: accept,
                })
            );

            if (accept) {
                // Afficher un message
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_launching_game') : "🎮 Lancement du jeu Pong...");

                // Fermer le chat panel
                const chatPanel = document.getElementById('chat-panel');
                if (chatPanel) {
                    chatPanel.style.display = 'none';
                }

                // Lancer le jeu directement (comme dans le tournoi)
                setTimeout(() => {
                    this.launchInvitedGame(from, this.username || 'Player');

                    // Donner le focus au document pour que les touches fonctionnent
                    setTimeout(() => {
                        const board = document.getElementById('board') as HTMLCanvasElement;
                        if (board) {
                            board.focus();
                        }
                        // Fallback: focus sur le document
                        window.focus();
                    }, 100);
                }, 300);
            } else {
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_invite_declined', { from }) : `Invitation de ${from} refusée.`);
            }
        }

        private launchInvitedGame(player1: string, player2: string): void {
            console.log('🎮 launchInvitedGame appelé:', { player1, player2 });
            const gameView = document.getElementById('game-view');

            // Désactiver tous les écrans
            const screens = document.querySelectorAll('.screen');
            screens.forEach(screen => {
                (screen as HTMLElement).classList.remove('active');
            });

            // Activer la vue de jeu
            if (gameView) {
                gameView.classList.add('active');
                console.log('✅ game-view activé');
            } else {
                console.error('❌ game-view introuvable !');
            }

            // Cacher les éléments d'interface utilisateur (avatar, boutons de langue, info utilisateur)
            const avatarContainer = document.getElementById('avatar-container');
            const langSelector = document.getElementById('lang-selector-container');
            const userInfo = document.getElementById('user-info');

            if (avatarContainer) avatarContainer.style.display = 'none';
            if (langSelector) langSelector.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';

            // Cacher le chat s'il est ouvert
            const chatPanel = document.getElementById('chat-panel');
            if (chatPanel) {
                chatPanel.style.display = 'none';
            }

            // Cacher tous les overlays/modals SAUF game-in-progress-overlay
            const overlays = document.querySelectorAll('.overlay');
            overlays.forEach(overlay => {
                if (overlay.id !== 'game-in-progress-overlay') {
                    (overlay as HTMLElement).style.display = 'none';
                }
            });

            // Cacher tous les formulaires qui pourraient être ouverts
            const signupForm = document.getElementById('signup-form') as HTMLElement;
            const loginForm = document.getElementById('login-form') as HTMLElement;
            const editProfileForm = document.getElementById('edit-profile-form') as HTMLElement;
            if (signupForm) signupForm.style.display = 'none';
            if (loginForm) loginForm.style.display = 'none';
            if (editProfileForm) editProfileForm.style.display = 'none';

            const pong = (window as any).PONG;
            if (pong?.PongGame) {
                // Configurer les noms des joueurs
                pong.PongGame.setPlayerNames(player1, player2);

                // Définir un callback pour la fin du match (retour au menu)
                pong.PongGame.setCallback((winner: string) => {
                    console.log('🏆 Winner:', winner);
                    
                    // Sauvegarder le match dans la base de données
                    const opponentUsername = player1 === this.username ? player2 : player1;
                    fetch('/api/matches/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            player2_username: opponentUsername,
                            winner_username: winner,
                            player1_score: 1,
                            player2_score: 0,
                            match_type: 'invitation'
                        })
                    })
                        .then(res => res.json())
                        .then(data => console.log('✅ Match sauvegardé:', data))
                        .catch(err => console.error('❌ Erreur sauvegarde match:', err));
                    
                    // Arrêter le jeu
                    if (pong.PongGame) {
                        pong.PongGame.stop();
                    }

                    // Notifier l'autre joueur que la partie est terminée
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        // player1 est celui qui a envoyé l'invitation (celui qui attend)
                        const waitingPlayer = player1 === this.username ? player2 : player1;
                        this.ws.send(JSON.stringify({
                            type: "gameEnded",
                            to: waitingPlayer
                        }));
                    }

                    // Réafficher les éléments d'interface utilisateur
                    const avatarContainer = document.getElementById('avatar-container');
                    const langSelector = document.getElementById('lang-selector-container');
                    const userInfo = document.getElementById('user-info');
                    const dropdownMenu = document.getElementById('user-dropdown-menu');

                    if (avatarContainer) avatarContainer.style.display = '';
                    if (langSelector) langSelector.style.display = '';
                    if (userInfo) userInfo.style.display = '';
                    if (dropdownMenu) {
                        dropdownMenu.style.display = '';
                        dropdownMenu.classList.remove('show'); // Fermer le dropdown s'il était ouvert
                    }

                    // Retourner au menu principal
                    if (pong.Nav) {
                        pong.Nav.showHome();
                    }

                    // Fermer le profile panel et le vider
                    const profilePanel = document.getElementById('profile-panel') as HTMLElement;
                    if (profilePanel) {
                        profilePanel.classList.remove('active');
                    }
                    if ((window as any).clearProfilePanel) {
                        (window as any).clearProfilePanel();
                    }
                });

                // Démarrer le jeu
                pong.PongGame.start();

                // Donner le focus pour que les touches fonctionnent
                setTimeout(() => {
                    const board = document.getElementById('board') as HTMLCanvasElement;
                    if (board) {
                        board.focus();
                    }
                    window.focus();
                }, 100);
            } else {
                console.error('❌ PongGame not found');
            }
        }

        private handleGameEnded(data: ChatData): void {
            console.log("🏁 Partie terminée, retour au chat");
            // Cacher complètement l'overlay "Partie en cours"
            const gameInProgressOverlay = document.getElementById('game-in-progress-overlay') as HTMLElement;
            if (gameInProgressOverlay) {
                gameInProgressOverlay.classList.remove('active');
                console.log('✅ Overlay caché');
            }

            // Réafficher le chat
            const chatPanel = document.getElementById('chat-panel') as HTMLElement;
            if (chatPanel) {
                chatPanel.classList.add('active');
                console.log('✅ Chat réaffiché');
            }
        }

        private showGameInProgress(opponentName: string): void {
            console.log('🎮 Affichage overlay "Partie en cours" pour', opponentName);

            // Cacher tous les screens
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });

            // Cacher le chat
            const chatPanel = document.getElementById('chat-panel');
            if (chatPanel) {
                chatPanel.classList.remove('active');
            }

            // Afficher l'overlay "Partie en cours"
            const gameInProgressOverlay = document.getElementById('game-in-progress-overlay') as HTMLElement;
            const opponentNameSpan = document.getElementById('opponent-name');

            if (gameInProgressOverlay && opponentNameSpan) {
                opponentNameSpan.textContent = opponentName;
                gameInProgressOverlay.classList.add('active');
                console.log('✅ Overlay "Partie en cours" affiché');
            } else {
                console.error('❌ Éléments overlay introuvables');
            }
        }

        private handleInviteResponse(data: ChatData): void {
            console.log('📥 handleInviteResponse appelé:', data);
            const from = data.from;
            if (!from) {
                console.log('❌ Pas de from dans data');
                return;
            }

            const i18n = (window as any).i18n;
            console.log('🔍 data.accepted =', data.accepted);
            if (data.accepted) {
                console.log('✅ Invitation acceptée');
                this.showGameInProgress(from);
            } else {
                console.log('❌ Invitation refusée');
                this.addSystemMessage(
                    i18n ? i18n.t('chat_invite_declined_by', { from }) : `${from} a refusé ton invitation.`
                );
            }
        }

        private async openUserProfile(usernameToView: string): Promise<void> {
            try {
                const res = await fetch(
                    `/api/user/public/${encodeURIComponent(usernameToView)}`
                );
                const i18n = (window as any).i18n;
                if (res.status === 404) {
                    this.addSystemMessage(
                        i18n ? i18n.t('chat_profile_not_found', { username: usernameToView }) : `Ce joueur (${usernameToView}) n'a pas de profil enregistré (invité ou non inscrit).`
                    );
                    return;
                }
                if (!res.ok) {
                    this.addSystemMessage(
                        i18n ? i18n.t('chat_profile_error', { username: usernameToView }) : `Erreur en récupérant le profil de ${usernameToView}.`
                    );
                    return;
                }
                const data = await res.json();
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
            } catch (e) {
                console.error("Erreur chargement profil:", e);
                const i18n = (window as any).i18n;
                this.addSystemMessage(
                    i18n ? i18n.t('chat_profile_load_error', { username: usernameToView }) : `Erreur lors du chargement du profil de ${usernameToView}.`
                );
            }
        }

        private createMessageBubble(from: string, text: string, type: string, isHistory?: boolean, timestamp?: string): HTMLElement {
            const msgDiv = document.createElement("div");
            msgDiv.classList.add("message", type);

            // Ajouter une classe spéciale pour les messages d'historique
            if (isHistory) {
                msgDiv.classList.add("history");
            }

            if (!from || type === "system") {
                msgDiv.textContent = text;
            } else {
                const nameSpan = document.createElement("span");
                nameSpan.classList.add("chat-username");
                nameSpan.style.cursor = 'pointer';
                nameSpan.style.textDecoration = 'underline';
                nameSpan.textContent = from + ": ";
                
                // Ajouter un click handler pour afficher le profil
                nameSpan.addEventListener('click', () => {
                    if ((window as any).showUserProfile) {
                        (window as any).showUserProfile(from);
                    }
                });

                const textSpan = document.createElement("span");
                textSpan.textContent = text;

                msgDiv.appendChild(nameSpan);
                msgDiv.appendChild(textSpan);

                // Ajouter timestamp pour les messages d'historique
                if (isHistory && timestamp) {
                    const timestampSpan = document.createElement("span");
                    timestampSpan.classList.add("timestamp");
                    const date = new Date(timestamp);
                    timestampSpan.textContent = ` (${date.toLocaleDateString()} ${date.toLocaleTimeString()})`;
                    msgDiv.appendChild(timestampSpan);
                }
            }

            return msgDiv;
        }

        // Mettre à jour le badge de notification sur l'avatar
        private updateAvatarNotification(): void {
            // Calculer le nombre total de messages non lus
            let totalUnread = 0;
            for (const user in this.unreadMessages) {
                totalUnread += this.unreadMessages[user];
            }

            // Utiliser le badge statique
            const badge = document.getElementById('avatar-notification-badge');
            if (!badge) return;

            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread.toString();
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    if (!(window as any).PONG)
        (window as any).PONG = {};

    (window as any).PONG.Chat = new Chat();

})();
