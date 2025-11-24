class ConversationManager {
    constructor(username) {
        this.conversations = {};
        this.unreadMessages = {};
        this.historyLoaded = new Set();
        this.currentChatUser = null;
        this.username = null;
        this.username = username;
    }
    setUsername(username) {
        this.username = username;
    }
    ensureConversation(user) {
        if (!this.conversations[user]) {
            this.conversations[user] = [];
        }
    }
    addMessage(otherUser, from, text, mine = false) {
        this.ensureConversation(otherUser);
        this.conversations[otherUser].push({ from, text, mine });
        this.saveToStorage();
        // Incrémenter messages non lus si pas notre message et pas la conversation active
        if (!mine && otherUser !== this.currentChatUser) {
            this.unreadMessages[otherUser] = (this.unreadMessages[otherUser] || 0) + 1;
        }
    }
    addHistoryMessage(otherUser, from, text, mine = false, timestamp) {
        this.ensureConversation(otherUser);
        // Éviter les doublons
        const exists = this.conversations[otherUser].some(msg => msg.from === from && msg.text === text && msg.mine === mine);
        if (exists) {
            console.log("⚠️ Message d'historique déjà présent, ignoré:", { from, text });
            return;
        }
        this.conversations[otherUser].unshift({ from, text, mine, timestamp, isHistory: true });
        this.saveToStorage();
    }
    deleteConversation(user) {
        if (this.conversations[user]) {
            delete this.conversations[user];
            if (this.unreadMessages[user]) {
                delete this.unreadMessages[user];
            }
            if (this.historyLoaded.has(user)) {
                this.historyLoaded.delete(user);
            }
            if (this.currentChatUser === user) {
                this.currentChatUser = null;
            }
            this.saveToStorage();
            console.log(`🗑️ Conversation avec ${user} supprimée`);
        }
    }
    clearAllConversations() {
        this.conversations = {};
        this.currentChatUser = null;
        this.unreadMessages = {};
        this.historyLoaded.clear();
        this.clearStorage();
        console.log("🗑️ Toutes les conversations ont été effacées");
    }
    setCurrentChatUser(user) {
        this.currentChatUser = user;
        // Réinitialiser les messages non lus
        if (user && this.unreadMessages[user]) {
            this.unreadMessages[user] = 0;
        }
    }
    getConversations() {
        return this.conversations;
    }
    getUnreadMessages() {
        return this.unreadMessages;
    }
    getCurrentMessages() {
        if (!this.currentChatUser)
            return [];
        return this.conversations[this.currentChatUser] || [];
    }
    isHistoryLoaded(user) {
        return this.historyLoaded.has(user);
    }
    markHistoryLoaded(user) {
        this.historyLoaded.add(user);
    }
    clearHistoryLoaded() {
        this.historyLoaded.clear();
    }
    getTotalUnread() {
        let total = 0;
        for (const user in this.unreadMessages) {
            total += this.unreadMessages[user];
        }
        return total;
    }
    saveToStorage() {
        try {
            if (!this.username)
                return;
            const key = `chat_conversations_${this.username}`;
            localStorage.setItem(key, JSON.stringify(this.conversations));
            console.log("💾 Conversations sauvegardées dans localStorage");
        }
        catch (e) {
            console.warn("❌ Erreur lors de la sauvegarde des conversations:", e);
        }
    }
    loadFromStorage() {
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
            }
            else {
                console.log("📂 Aucune conversation sauvegardée pour", this.username);
                this.conversations = {};
            }
        }
        catch (e) {
            console.warn("❌ Erreur lors du chargement des conversations:", e);
            this.conversations = {};
        }
    }
    clearStorage() {
        try {
            if (!this.username)
                return;
            const key = `chat_conversations_${this.username}`;
            localStorage.removeItem(key);
            console.log("🗑️ Conversations supprimées du localStorage");
        }
        catch (e) {
            console.warn("❌ Erreur lors de la suppression des conversations:", e);
        }
    }
}
//# sourceMappingURL=ConversationManager.js.map