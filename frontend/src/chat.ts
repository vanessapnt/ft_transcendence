(function () {

    class Chat {
        private elements: ChatElements;
        private username: string | null = null;
        private wsManager: ChatWebSocket;
        private conversationManager: ConversationManager;
        private messageRenderer: MessageRenderer;
        private commandParser: CommandParser;
        private friendsManager: FriendsManager;
        private gameInviteHandler: GameInviteHandler;
        public blockedUsers: Set<string> = new Set();
        private onlineUsers: Set<string> = new Set();

        constructor() {
            this.elements = {
                chatBox: null,
                messageInput: null,
                btnSend: null,
                conversationTabs: null,
                currentChatLabel: null,
                profileModal: null,
                profileClose: null,
                profileName: null,
                profileUsername: null,
                profileAvatar: null
            };

            this.wsManager = new ChatWebSocket();
            this.conversationManager = new ConversationManager(null);
            this.messageRenderer = new MessageRenderer(this.elements, null);
            this.commandParser = new CommandParser();
            this.friendsManager = new FriendsManager();
            this.gameInviteHandler = new GameInviteHandler(null, (text) => this.addSystemMessage(text));

            this.init();
        }

        public get currentChatUser(): string | null {
            return this.conversationManager.currentChatUser;
        }

        private init(): void {
            document.addEventListener('DOMContentLoaded', () => {
                this.elements.chatBox = document.getElementById("chatbox");
                this.elements.messageInput = document.getElementById("msg") as HTMLInputElement;
                this.elements.btnSend = document.getElementById("send") as HTMLButtonElement;
                this.elements.conversationTabs = document.getElementById("conversation-tabs");
                this.elements.currentChatLabel = document.getElementById("current-chat");
                this.elements.profileModal = document.getElementById("profile-modal");
                this.elements.profileClose = document.getElementById("profile-modal-close");
                this.elements.profileName = document.getElementById("profile-modal-name");
                this.elements.profileUsername = document.getElementById("profile-modal-username");
                this.elements.profileAvatar = document.getElementById("profile-modal-avatar") as HTMLImageElement;

                this.setupEventListeners();

                const friendsToggle = document.getElementById("friends-only-toggle") as HTMLInputElement;
                if (friendsToggle) {
                    friendsToggle.addEventListener("change", () => {
                        this.friendsManager.setFriendsOnlyFilter(friendsToggle.checked);
                        this.renderConversationTabs();
                    });
                }

                console.log('✅ Chat DOM initialized');
            });
        }

        public async initializeChat(): Promise<void> {

            console.log("🎯 Initialisation du chat après login...");

            // Envoi d'un log technique pour initialiser l'index ELK
            fetch('/api/log/technical', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Chat initialized', timestamp: new Date().toISOString() })
            }).catch(() => { });

            if (!this.elements.chatBox || !this.elements.messageInput || !this.elements.btnSend) {
                console.error("❌ Éléments DOM du chat non chargés");
                return;
            }

            try {
                const res = await fetch('/api/user/profile');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user && data.user.username) {
                        this.username = data.user.username;

                        this.conversationManager.setUsername(this.username);
                        this.messageRenderer.setUsername(this.username);
                        this.gameInviteHandler.setUsername(this.username);

                        await this.friendsManager.loadFriendsList();
                        this.conversationManager.loadFromStorage();
                        this.renderConversationTabs();
                        this.setupWebSocket();

                        console.log("✅ Chat complètement initialisé pour", this.username);
                    }
                }
            } catch (e) {
                console.warn("❌ Erreur lors de la récupération du profil:", e);
            }
        }

        public async refreshFriendsList(): Promise<void> {
            await this.friendsManager.loadFriendsList();
            this.renderConversationTabs();
            console.log("🔄 Liste d'amis rafraîchie");
        }

        private setupWebSocket(): void {
            const i18n = (window as any).i18n;
            const currentLanguage = i18n ? i18n.getCurrentLanguage() : 'en';

            this.wsManager.setMessageCallback((data) => this.handleWebSocketMessage(data));
            this.wsManager.setSystemMessageCallback((text) => this.addSystemMessage(text));
            this.wsManager.connect(this.username || '', currentLanguage);
        }

        public disconnect(): void {
            console.log("🔌 Déconnexion intentionnelle du chat");
            this.wsManager.disconnect();
            this.conversationManager.clearAllConversations();
            this.blockedUsers.clear();
            this.renderConversationTabs();
            this.updateAvatarNotification();
            this.updateBlockButton();
        }

        public deleteConversation(user: string): void {
            this.conversationManager.deleteConversation(user);
            this.renderConversationTabs();
            this.renderCurrentConversation();
            this.updateAvatarNotification();
        }

        public clearAllConversations(): void {
            this.conversationManager.clearAllConversations();
            this.renderConversationTabs();
            this.renderCurrentConversation();
        }

        private handleWebSocketMessage(data: ChatData): void {
            // Invitations de jeu
            if (data.type === "invite") {
                this.gameInviteHandler.handleInvite(data, this.wsManager.isConnected() ? this.wsManager as any : null);
                return;
            }
            if (data.type === "inviteResponse") {
                this.gameInviteHandler.handleInviteResponse(data);
                return;
            }
            if (data.type === "gameEnded") {
                this.gameInviteHandler.handleGameEnded(data);
                return;
            }

            // Statut en ligne
            if (data.type === "userOnline" && data.username) {
                this.onlineUsers.add(data.username);
                this.renderConversationTabs();
                return;
            }
            if (data.type === "userOffline" && data.username) {
                this.onlineUsers.delete(data.username);
                this.renderConversationTabs();
                return;
            }
            if (data.type === "onlineUsersList" && data.users) {
                this.onlineUsers = new Set(data.users);
                this.renderConversationTabs();
                return;
            }

            // Messages
            if (data.type === "dm" && data.from && data.text) {
                if (data.isHistory) {
                    const otherUser = data.from === this.username ? data.to : data.from;
                    if (otherUser) {
                        this.conversationManager.addHistoryMessage(otherUser, data.from, data.text, data.from === this.username, data.timestamp);
                    }
                } else if (data.from === this.username) {
                    this.conversationManager.addMessage(data.to || "", data.from, data.text, true);
                } else {
                    this.conversationManager.addMessage(data.from, data.from, data.text, false);
                }
                this.renderConversationTabs();
                this.renderCurrentConversation();
                this.updateAvatarNotification();
                return;
            }

            // Messages système
            if (data.from && data.text && (data.from === "Serveur" || data.from === "Tournoi")) {
                this.addSystemMessage(data.text);
            }
        }

        private setupEventListeners(): void {
            if (this.elements.btnSend) {
                this.elements.btnSend.addEventListener("click", () => this.sendMessage());
            }

            if (this.elements.messageInput) {
                this.elements.messageInput.addEventListener("keyup", (e) => {
                    if (e.key === "Enter") this.sendMessage();
                });
            }

            if (this.elements.profileClose && this.elements.profileModal) {
                this.elements.profileClose.addEventListener("click", () => {
                    if (this.elements.profileModal) this.elements.profileModal.style.display = "none";
                });
                this.elements.profileModal.addEventListener("click", (e) => {
                    if (e.target === this.elements.profileModal && this.elements.profileModal) {
                        this.elements.profileModal.style.display = "none";
                    }
                });
            }
        }

        private setCurrentChatUser(user: string | null): void {
            this.conversationManager.setCurrentChatUser(user);
            this.messageRenderer.updateCurrentChatLabel(user);
            this.renderConversationTabs();
            this.renderCurrentConversation();
            this.updateBlockButton();
            this.updateAvatarNotification();

            if (user && (window as any).checkAndUpdateFriendButton) {
                (window as any).checkAndUpdateFriendButton(user);
            }

            if (user && this.wsManager.isConnected()) {
                this.loadConversationHistory(user);
            }
        }

        public updateBlockButton(): void {
            const blockBtn = document.getElementById('block-btn') as HTMLButtonElement;
            if (!blockBtn) return;

            const i18n = (window as any).i18n;
            const user = this.conversationManager.currentChatUser;

            if (user && this.blockedUsers.has(user)) {
                blockBtn.textContent = i18n ? i18n.t('chat_btn_unblock') : 'Débloquer';
                blockBtn.title = i18n ? i18n.t('chat_btn_unblock_title') : 'Débloquer l\'utilisateur';
            } else {
                blockBtn.textContent = i18n ? i18n.t('chat_btn_block') : 'Bloquer';
                blockBtn.title = i18n ? i18n.t('chat_btn_block_title') : 'Bloquer l\'utilisateur';
            }
        }

        private loadConversationHistory(user: string): void {
            if (this.conversationManager.isHistoryLoaded(user)) return;

            console.log(`📜 Chargement de l'historique avec ${user}...`);
            this.conversationManager.markHistoryLoaded(user);
            this.wsManager.send({ type: "getHistory", target: user });
        }

        private renderConversationTabs(): void {
            this.messageRenderer.renderConversationTabs(
                this.conversationManager.getConversations(),
                this.conversationManager.getUnreadMessages(),
                this.conversationManager.currentChatUser,
                this.onlineUsers,
                this.friendsManager.getFriendsList(),
                this.friendsManager.friendsOnly,
                (user) => this.setCurrentChatUser(user),
                (user) => this.deleteConversation(user)
            );
        }

        private renderCurrentConversation(): void {
            this.messageRenderer.renderCurrentConversation(this.conversationManager.getCurrentMessages());
        }

        private addSystemMessage(text: string): void {
            this.messageRenderer.addSystemMessage(text);
        }

        private updateAvatarNotification(): void {
            this.messageRenderer.updateAvatarNotification(this.conversationManager.getTotalUnread());
        }

        private sendMessage(): void {
            if (!this.elements.messageInput) return;

            const text = this.elements.messageInput.value.trim();
            if (!text) return;

            if (text.startsWith("/block ")) {
                this.handleBlockCommand(text);
            } else if (text.startsWith("/unblock ")) {
                this.handleUnblockCommand(text);
            } else if (text.startsWith("/invite ")) {
                this.handleInviteCommand(text);
            } else if (text === "/list") {
                this.handleListCommand();
            } else if (text.startsWith("/history ")) {
                this.handleHistoryCommand(text);
            } else if (text.startsWith("/dm ")) {
                this.handleDMCommand(text);
            } else {
                this.sendDirectMessage(text);
            }

            this.elements.messageInput.value = "";
        }

        private handleBlockCommand(text: string): void {
            const target = this.commandParser.parseCommandTarget("/block ", text);
            if (target) {
                this.wsManager.send({ type: "block", target });
                this.blockedUsers.add(target);
                this.updateBlockButton();
            } else {
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_format_block') : "Format : /block pseudo OU /block \"pseudo avec espaces\"");
            }
        }

        private handleUnblockCommand(text: string): void {
            const target = this.commandParser.parseCommandTarget("/unblock ", text);
            if (target) {
                this.wsManager.send({ type: "unblock", target });
                this.blockedUsers.delete(target);
                this.updateBlockButton();
            } else {
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_format_unblock') : "Format : /unblock pseudo OU /unblock \"pseudo avec espaces\"");
            }
        }

        private handleInviteCommand(text: string): void {
            const target = this.commandParser.parseCommandTarget("/invite ", text);
            if (target) {
                this.wsManager.send({ type: "invite", target });
            } else {
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_format_invite') : "Format : /invite pseudo OU /invite \"pseudo avec espaces\"");
            }
        }

        private handleListCommand(): void {
            if (this.wsManager.isConnected()) {
                this.wsManager.send({ type: "listUsers" });
            } else {
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_connection_closed_command') : "Connexion fermée, impossible d'envoyer la commande");
            }
        }

        private handleHistoryCommand(text: string): void {
            const target = this.commandParser.parseCommandTarget("/history ", text);
            if (target) {
                if (this.wsManager.isConnected()) {
                    this.wsManager.send({ type: "getHistory", target });
                } else {
                    const i18n = (window as any).i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_connection_closed_command') : "Connexion fermée");
                }
            } else {
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_format_history') : "Format : /history pseudo OU /history \"pseudo avec espaces\"");
            }
        }

        private handleDMCommand(text: string): void {
            const parsed = this.commandParser.parseDMCommand(text);
            if (parsed) {
                this.wsManager.send({ type: "dm", to: parsed.target, text: parsed.body });
            } else {
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_format_dm') : "Format : /dm pseudo message OU /dm \"pseudo avec espaces\" message");
            }
        }

        private sendDirectMessage(text: string): void {
            const currentUser = this.conversationManager.currentChatUser;
            if (!currentUser) {
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_no_conversation_selected') : "Aucune conversation sélectionnée. Utilise /dm");
            } else {
                this.wsManager.send({ type: "dm", to: currentUser, text });
            }
        }

        private async openUserProfile(usernameToView: string): Promise<void> {
            try {
                const res = await fetch(`/api/user/public/${encodeURIComponent(usernameToView)}`);
                const i18n = (window as any).i18n;

                if (res.status === 404) {
                    this.addSystemMessage(i18n ? i18n.t('chat_profile_not_found', { username: usernameToView }) : `Ce joueur (${usernameToView}) n'a pas de profil enregistré.`);
                    return;
                }
                if (!res.ok) {
                    this.addSystemMessage(i18n ? i18n.t('chat_profile_error', { username: usernameToView }) : `Erreur en récupérant le profil de ${usernameToView}.`);
                    return;
                }

                const data = await res.json();
                const user = data.user || data;

                if (this.elements.profileName && this.elements.profileUsername && this.elements.profileAvatar && this.elements.profileModal) {
                    this.elements.profileName.textContent = user.display_name || user.username || usernameToView;
                    this.elements.profileUsername.textContent = `@${user.username || usernameToView}`;
                    this.elements.profileAvatar.src = user.avatar_url || "/avatars/default_avatar.png";
                    this.elements.profileModal.style.display = "flex";
                }

                this.conversationManager.ensureConversation(usernameToView);
                this.setCurrentChatUser(usernameToView);
            } catch (e) {
                console.error("Erreur chargement profil:", e);
                const i18n = (window as any).i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_profile_load_error', { username: usernameToView }) : `Erreur lors du chargement du profil de ${usernameToView}.`);
            }
        }
    }

    if (!(window as any).PONG) (window as any).PONG = {};
    (window as any).PONG.Chat = new Chat();

})();
