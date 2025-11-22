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
        text?: string;
        to?: string;
        username?: string;
        target?: string;
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
                console.log('✅ Chat DOM initialized');
                
                // NE PAS initialiser automatiquement - attendre le login/signup
                // this.initializeChat();
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
                    console.log("🔐 Envoi du login:", this.username);
                    this.ws.send(JSON.stringify({ type: "login", username: this.username }));
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
                this.currentChatLabel.textContent = user
                    ? (i18n ? i18n.t('chat_conversation_with', { user }) : `Conversation avec ${user}`)
                    : (i18n ? i18n.t('chat_no_conversation') : "Aucune conversation sélectionnée");
            }
            this.renderConversationTabs();
            this.renderCurrentConversation();
            this.updateBlockButton();

            // Charger automatiquement l'historique si disponible
            if (user && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.loadConversationHistory(user);
            }
        }

        public updateBlockButton(): void {
            const blockBtn = document.getElementById('block-btn') as HTMLButtonElement;
            if (!blockBtn) return;

            if (this.currentChatUser && this.blockedUsers.has(this.currentChatUser)) {
                blockBtn.textContent = '/unblock';
                blockBtn.title = 'Débloquer l\'utilisateur';
            } else {
                blockBtn.textContent = '/block';
                blockBtn.title = 'Bloquer l\'utilisateur';
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
            Object.keys(this.conversations).forEach((user) => {
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
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_blocked', { target }) : `Tu bloques ${target}`);
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
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_unblocked', { target }) : `Tu débloques ${target}`);
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
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_invite_sent', { target }) : `Invitation envoyée à ${target}`);
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
            const from = data.from;
            if (!from || !this.ws) {
                console.log("❌ Données manquantes pour l'invitation:", { from, ws: !!this.ws });
                return;
            }

            console.log(`📩 Invitation de ${from} - affichage du confirm...`);
            const accept = window.confirm(
                `${from} t'invite à jouer à Pong.\nVeux-tu accepter ?`
            );

            console.log(`✅ Réponse à l'invitation: ${accept ? 'acceptée' : 'refusée'}`);

            this.ws.send(
                JSON.stringify({
                    type: "inviteResponse",
                    to: from,
                    accepted: accept,
                })
            );

            if (accept) {
                // Afficher un message avant la redirection
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_launching_game') : "🎮 Lancement du jeu Pong...");

                // Redirection vers la page Pong avec les noms des joueurs
                setTimeout(() => {
                    window.location.href = `/pong/?player1=${encodeURIComponent(from)}&player2=${encodeURIComponent(this.username || 'Player')}`;
                }, 500); // Petit délai pour voir le message
            } else {
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_invite_declined', { from }) : `Invitation de ${from} refusée.`);
            }
        }

        private handleInviteResponse(data: ChatData): void {
            const from = data.from;
            if (!from) return;

            const i18n = (window as any).i18n;
            if (data.accepted) {
                // Créer un lien cliquable pour rejoindre le jeu
                const gameUrl = `/pong/?player1=${encodeURIComponent(this.username || 'Player')}&player2=${encodeURIComponent(from)}`;

                // Créer un message avec un lien cliquable
                const msgDiv = document.createElement("div");
                msgDiv.classList.add("message", "system");
                msgDiv.innerHTML = `
                    <span>${i18n ? i18n.t('chat_invite_accepted', { from }) : `${from} a accepté ton invitation ! La partie se déroule sur l'autre onglet.`}</span>
                `;

                if (this.chatBox) {
                    this.chatBox.appendChild(msgDiv);
                    this.chatBox.scrollTop = this.chatBox.scrollHeight;
                }
            } else {
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
                nameSpan.textContent = from + ": ";

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
            
            // Chercher ou créer le badge sur l'avatar
            let badge = document.getElementById('avatar-notification-badge');
            
            if (totalUnread > 0) {
                if (!badge) {
                    // Créer le badge s'il n'existe pas
                    badge = document.createElement('span');
                    badge.id = 'avatar-notification-badge';
                    badge.classList.add('notification-badge');
                    const avatarWrapper = document.getElementById('avatar-wrapper');
                    if (avatarWrapper) {
                        avatarWrapper.appendChild(badge);
                    }
                }
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread.toString();
                badge.style.display = 'flex';
            } else if (badge) {
                // Cacher le badge s'il n'y a plus de messages non lus
                badge.style.display = 'none';
            }
        }
    }

    if (!(window as any).PONG)
        (window as any).PONG = {};

    (window as any).PONG.Chat = new Chat();

})();
