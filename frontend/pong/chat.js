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
            this.username = null;
            this.blockedUsers = new Set();
            this.onlineUsers = new Set();
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
        get currentChatUser() {
            return this.conversationManager.currentChatUser;
        }
        init() {
            document.addEventListener('DOMContentLoaded', () => {
                this.elements.chatBox = document.getElementById("chatbox");
                this.elements.messageInput = document.getElementById("msg");
                this.elements.btnSend = document.getElementById("send");
                this.elements.conversationTabs = document.getElementById("conversation-tabs");
                this.elements.currentChatLabel = document.getElementById("current-chat");
                this.elements.profileModal = document.getElementById("profile-modal");
                this.elements.profileClose = document.getElementById("profile-modal-close");
                this.elements.profileName = document.getElementById("profile-modal-name");
                this.elements.profileUsername = document.getElementById("profile-modal-username");
                this.elements.profileAvatar = document.getElementById("profile-modal-avatar");
                this.setupEventListeners();
                const friendsToggle = document.getElementById("friends-only-toggle");
                if (friendsToggle) {
                    friendsToggle.addEventListener("change", () => {
                        this.friendsManager.setFriendsOnlyFilter(friendsToggle.checked);
                        this.renderConversationTabs();
                    });
                }
                console.log('✅ Chat DOM initialized');
            });
        }
        initializeChat() {
            return __awaiter(this, void 0, void 0, function* () {
                console.log("🎯 Initialisation du chat après login...");
                if (!this.elements.chatBox || !this.elements.messageInput || !this.elements.btnSend) {
                    console.error("❌ Éléments DOM du chat non chargés");
                    return;
                }
                try {
                    const res = yield fetch('/api/user/profile');
                    if (res.ok) {
                        const data = yield res.json();
                        if (data.user && data.user.username) {
                            this.username = data.user.username;
                            this.conversationManager.setUsername(this.username);
                            this.messageRenderer.setUsername(this.username);
                            this.gameInviteHandler.setUsername(this.username);
                            yield this.friendsManager.loadFriendsList();
                            this.conversationManager.loadFromStorage();
                            this.renderConversationTabs();
                            this.setupWebSocket();
                            console.log("✅ Chat complètement initialisé pour", this.username);
                        }
                    }
                }
                catch (e) {
                    console.warn("❌ Erreur lors de la récupération du profil:", e);
                }
            });
        }
        refreshFriendsList() {
            return __awaiter(this, void 0, void 0, function* () {
                yield this.friendsManager.loadFriendsList();
                this.renderConversationTabs();
                console.log("🔄 Liste d'amis rafraîchie");
            });
        }
        setupWebSocket() {
            const i18n = window.i18n;
            const currentLanguage = i18n ? i18n.getCurrentLanguage() : 'en';
            this.wsManager.setMessageCallback((data) => this.handleWebSocketMessage(data));
            this.wsManager.setSystemMessageCallback((text) => this.addSystemMessage(text));
            this.wsManager.connect(this.username || '', currentLanguage);
        }
        disconnect() {
            console.log("🔌 Déconnexion intentionnelle du chat");
            this.wsManager.disconnect();
            this.conversationManager.clearAllConversations();
            this.blockedUsers.clear();
            this.renderConversationTabs();
            this.updateAvatarNotification();
            this.updateBlockButton();
        }
        deleteConversation(user) {
            this.conversationManager.deleteConversation(user);
            this.renderConversationTabs();
            this.renderCurrentConversation();
            this.updateAvatarNotification();
        }
        clearAllConversations() {
            this.conversationManager.clearAllConversations();
            this.renderConversationTabs();
            this.renderCurrentConversation();
        }
        handleWebSocketMessage(data) {
            // Invitations de jeu
            if (data.type === "invite") {
                this.gameInviteHandler.handleInvite(data, this.wsManager.isConnected() ? this.wsManager : null);
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
                }
                else if (data.from === this.username) {
                    this.conversationManager.addMessage(data.to || "", data.from, data.text, true);
                }
                else {
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
        setupEventListeners() {
            if (this.elements.btnSend) {
                this.elements.btnSend.addEventListener("click", () => this.sendMessage());
            }
            if (this.elements.messageInput) {
                this.elements.messageInput.addEventListener("keyup", (e) => {
                    if (e.key === "Enter")
                        this.sendMessage();
                });
            }
            if (this.elements.profileClose && this.elements.profileModal) {
                this.elements.profileClose.addEventListener("click", () => {
                    if (this.elements.profileModal)
                        this.elements.profileModal.style.display = "none";
                });
                this.elements.profileModal.addEventListener("click", (e) => {
                    if (e.target === this.elements.profileModal && this.elements.profileModal) {
                        this.elements.profileModal.style.display = "none";
                    }
                });
            }
        }
        setCurrentChatUser(user) {
            this.conversationManager.setCurrentChatUser(user);
            this.messageRenderer.updateCurrentChatLabel(user);
            this.renderConversationTabs();
            this.renderCurrentConversation();
            this.updateBlockButton();
            this.updateAvatarNotification();
            if (user && window.checkAndUpdateFriendButton) {
                window.checkAndUpdateFriendButton(user);
            }
            if (user && this.wsManager.isConnected()) {
                this.loadConversationHistory(user);
            }
        }
        updateBlockButton() {
            const blockBtn = document.getElementById('block-btn');
            if (!blockBtn)
                return;
            const i18n = window.i18n;
            const user = this.conversationManager.currentChatUser;
            if (user && this.blockedUsers.has(user)) {
                blockBtn.textContent = i18n ? i18n.t('chat_btn_unblock') : 'Débloquer';
                blockBtn.title = i18n ? i18n.t('chat_btn_unblock_title') : 'Débloquer l\'utilisateur';
            }
            else {
                blockBtn.textContent = i18n ? i18n.t('chat_btn_block') : 'Bloquer';
                blockBtn.title = i18n ? i18n.t('chat_btn_block_title') : 'Bloquer l\'utilisateur';
            }
        }
        loadConversationHistory(user) {
            if (this.conversationManager.isHistoryLoaded(user))
                return;
            console.log(`📜 Chargement de l'historique avec ${user}...`);
            this.conversationManager.markHistoryLoaded(user);
            this.wsManager.send({ type: "getHistory", target: user });
        }
        renderConversationTabs() {
            this.messageRenderer.renderConversationTabs(this.conversationManager.getConversations(), this.conversationManager.getUnreadMessages(), this.conversationManager.currentChatUser, this.onlineUsers, this.friendsManager.getFriendsList(), this.friendsManager.friendsOnly, (user) => this.setCurrentChatUser(user), (user) => this.deleteConversation(user));
        }
        renderCurrentConversation() {
            this.messageRenderer.renderCurrentConversation(this.conversationManager.getCurrentMessages());
        }
        addSystemMessage(text) {
            this.messageRenderer.addSystemMessage(text);
        }
        updateAvatarNotification() {
            this.messageRenderer.updateAvatarNotification(this.conversationManager.getTotalUnread());
        }
        sendMessage() {
            if (!this.elements.messageInput)
                return;
            const text = this.elements.messageInput.value.trim();
            if (!text)
                return;
            if (text.startsWith("/block ")) {
                this.handleBlockCommand(text);
            }
            else if (text.startsWith("/unblock ")) {
                this.handleUnblockCommand(text);
            }
            else if (text.startsWith("/invite ")) {
                this.handleInviteCommand(text);
            }
            else if (text === "/list") {
                this.handleListCommand();
            }
            else if (text.startsWith("/history ")) {
                this.handleHistoryCommand(text);
            }
            else if (text.startsWith("/dm ")) {
                this.handleDMCommand(text);
            }
            else {
                this.sendDirectMessage(text);
            }
            this.elements.messageInput.value = "";
        }
        handleBlockCommand(text) {
            const target = this.commandParser.parseCommandTarget("/block ", text);
            if (target) {
                this.wsManager.send({ type: "block", target });
                this.blockedUsers.add(target);
                this.updateBlockButton();
            }
            else {
                const i18n = window.i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_format_block') : "Format : /block pseudo OU /block \"pseudo avec espaces\"");
            }
        }
        handleUnblockCommand(text) {
            const target = this.commandParser.parseCommandTarget("/unblock ", text);
            if (target) {
                this.wsManager.send({ type: "unblock", target });
                this.blockedUsers.delete(target);
                this.updateBlockButton();
            }
            else {
                const i18n = window.i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_format_unblock') : "Format : /unblock pseudo OU /unblock \"pseudo avec espaces\"");
            }
        }
        handleInviteCommand(text) {
            const target = this.commandParser.parseCommandTarget("/invite ", text);
            if (target) {
                this.wsManager.send({ type: "invite", target });
            }
            else {
                const i18n = window.i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_format_invite') : "Format : /invite pseudo OU /invite \"pseudo avec espaces\"");
            }
        }
        handleListCommand() {
            if (this.wsManager.isConnected()) {
                this.wsManager.send({ type: "listUsers" });
            }
            else {
                const i18n = window.i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_connection_closed_command') : "Connexion fermée, impossible d'envoyer la commande");
            }
        }
        handleHistoryCommand(text) {
            const target = this.commandParser.parseCommandTarget("/history ", text);
            if (target) {
                if (this.wsManager.isConnected()) {
                    this.wsManager.send({ type: "getHistory", target });
                }
                else {
                    const i18n = window.i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_connection_closed_command') : "Connexion fermée");
                }
            }
            else {
                const i18n = window.i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_format_history') : "Format : /history pseudo OU /history \"pseudo avec espaces\"");
            }
        }
        handleDMCommand(text) {
            const parsed = this.commandParser.parseDMCommand(text);
            if (parsed) {
                this.wsManager.send({ type: "dm", to: parsed.target, text: parsed.body });
            }
            else {
                const i18n = window.i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_format_dm') : "Format : /dm pseudo message OU /dm \"pseudo avec espaces\" message");
            }
        }
        sendDirectMessage(text) {
            const currentUser = this.conversationManager.currentChatUser;
            if (!currentUser) {
                const i18n = window.i18n;
                this.addSystemMessage(i18n ? i18n.t('chat_no_conversation_selected') : "Aucune conversation sélectionnée. Utilise /dm");
            }
            else {
                this.wsManager.send({ type: "dm", to: currentUser, text });
            }
        }
        openUserProfile(usernameToView) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const res = yield fetch(`/api/user/public/${encodeURIComponent(usernameToView)}`);
                    const i18n = window.i18n;
                    if (res.status === 404) {
                        this.addSystemMessage(i18n ? i18n.t('chat_profile_not_found', { username: usernameToView }) : `Ce joueur (${usernameToView}) n'a pas de profil enregistré.`);
                        return;
                    }
                    if (!res.ok) {
                        this.addSystemMessage(i18n ? i18n.t('chat_profile_error', { username: usernameToView }) : `Erreur en récupérant le profil de ${usernameToView}.`);
                        return;
                    }
                    const data = yield res.json();
                    const user = data.user || data;
                    if (this.elements.profileName && this.elements.profileUsername && this.elements.profileAvatar && this.elements.profileModal) {
                        this.elements.profileName.textContent = user.display_name || user.username || usernameToView;
                        this.elements.profileUsername.textContent = `@${user.username || usernameToView}`;
                        this.elements.profileAvatar.src = user.avatar_url || "/avatars/default_avatar.png";
                        this.elements.profileModal.style.display = "flex";
                    }
                    this.conversationManager.ensureConversation(usernameToView);
                    this.setCurrentChatUser(usernameToView);
                }
                catch (e) {
                    console.error("Erreur chargement profil:", e);
                    const i18n = window.i18n;
                    this.addSystemMessage(i18n ? i18n.t('chat_profile_load_error', { username: usernameToView }) : `Erreur lors du chargement du profil de ${usernameToView}.`);
                }
            });
        }
    }
    if (!window.PONG)
        window.PONG = {};
    window.PONG.Chat = new Chat();
})();
//# sourceMappingURL=chat.js.map