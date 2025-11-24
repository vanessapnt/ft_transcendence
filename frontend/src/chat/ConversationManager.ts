class ConversationManager {
    private conversations: Conversations = {};
    private unreadMessages: { [username: string]: number } = {};
    private historyLoaded: Set<string> = new Set();
    public currentChatUser: string | null = null;
    private username: string | null = null;

    constructor(username: string | null) {
        this.username = username;
    }

    public setUsername(username: string): void {
        this.username = username;
    }

    public ensureConversation(user: string): void {
        if (!this.conversations[user]) {
            this.conversations[user] = [];
        }
    }

    public addMessage(otherUser: string, from: string, text: string, mine: boolean = false): void {
        this.ensureConversation(otherUser);
        this.conversations[otherUser].push({ from, text, mine });
        this.saveToStorage();

        // Incrémenter messages non lus si pas notre message et pas la conversation active
        if (!mine && otherUser !== this.currentChatUser) {
            this.unreadMessages[otherUser] = (this.unreadMessages[otherUser] || 0) + 1;
        }
    }

    public addHistoryMessage(otherUser: string, from: string, text: string, mine: boolean = false, timestamp?: string): void {
        this.ensureConversation(otherUser);

        // Éviter les doublons
        const exists = this.conversations[otherUser].some(msg =>
            msg.from === from && msg.text === text && msg.mine === mine
        );

        if (exists) {
            console.log("⚠️ Message d'historique déjà présent, ignoré:", { from, text });
            return;
        }

        this.conversations[otherUser].unshift({ from, text, mine, timestamp, isHistory: true });
        this.saveToStorage();
    }

    public deleteConversation(user: string): void {
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

    public clearAllConversations(): void {
        this.conversations = {};
        this.currentChatUser = null;
        this.unreadMessages = {};
        this.historyLoaded.clear();
        this.clearStorage();
        console.log("🗑️ Toutes les conversations ont été effacées");
    }

    public setCurrentChatUser(user: string | null): void {
        this.currentChatUser = user;
        
        // Réinitialiser les messages non lus
        if (user && this.unreadMessages[user]) {
            this.unreadMessages[user] = 0;
        }
    }

    public getConversations(): Conversations {
        return this.conversations;
    }

    public getUnreadMessages(): { [username: string]: number } {
        return this.unreadMessages;
    }

    public getCurrentMessages(): Message[] {
        if (!this.currentChatUser) return [];
        return this.conversations[this.currentChatUser] || [];
    }

    public isHistoryLoaded(user: string): boolean {
        return this.historyLoaded.has(user);
    }

    public markHistoryLoaded(user: string): void {
        this.historyLoaded.add(user);
    }

    public clearHistoryLoaded(): void {
        this.historyLoaded.clear();
    }

    public getTotalUnread(): number {
        let total = 0;
        for (const user in this.unreadMessages) {
            total += this.unreadMessages[user];
        }
        return total;
    }

    private saveToStorage(): void {
        try {
            if (!this.username) return;
            const key = `chat_conversations_${this.username}`;
            localStorage.setItem(key, JSON.stringify(this.conversations));
            console.log("💾 Conversations sauvegardées dans localStorage");
        } catch (e) {
            console.warn("❌ Erreur lors de la sauvegarde des conversations:", e);
        }
    }

    public loadFromStorage(): void {
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
            } else {
                console.log("📂 Aucune conversation sauvegardée pour", this.username);
                this.conversations = {};
            }
        } catch (e) {
            console.warn("❌ Erreur lors du chargement des conversations:", e);
            this.conversations = {};
        }
    }

    private clearStorage(): void {
        try {
            if (!this.username) return;
            const key = `chat_conversations_${this.username}`;
            localStorage.removeItem(key);
            console.log("🗑️ Conversations supprimées du localStorage");
        } catch (e) {
            console.warn("❌ Erreur lors de la suppression des conversations:", e);
        }
    }
}
