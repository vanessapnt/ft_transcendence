class MessageRenderer {
    private elements: ChatElements;
    private username: string | null;

    constructor(elements: ChatElements, username: string | null) {
        this.elements = elements;
        this.username = username;
    }

    public setUsername(username: string): void {
        this.username = username;
    }

    public renderConversationTabs(
        conversations: Conversations,
        unreadMessages: { [username: string]: number },
        currentChatUser: string | null,
        onlineUsers: Set<string>,
        friendsList: Set<string>,
        friendsOnly: boolean,
        onTabClick: (user: string) => void,
        onDeleteClick: (user: string) => void
    ): void {
        if (!this.elements.conversationTabs) return;
        this.elements.conversationTabs.innerHTML = "";

        let users = Object.keys(conversations);
        if (friendsOnly) {
            users = users.filter(user => friendsList.has(user));
        }

        users.forEach((user) => {
            const tab = this.createConversationTab(
                user,
                currentChatUser === user,
                unreadMessages[user] || 0,
                onlineUsers.has(user),
                onTabClick,
                onDeleteClick
            );
            if (this.elements.conversationTabs) {
                this.elements.conversationTabs.appendChild(tab);
            }
        });
    }

    private createConversationTab(
        user: string,
        isActive: boolean,
        unreadCount: number,
        isOnline: boolean,
        onTabClick: (user: string) => void,
        onDeleteClick: (user: string) => void
    ): HTMLElement {
        const tab = document.createElement("button");
        tab.classList.add("conversation-tab");
        if (isActive) tab.classList.add("active");

        // Avatar avec statut
        const avatarContainer = this.createAvatarWithStatus(user, isOnline);
        tab.appendChild(avatarContainer);

        // Nom d'utilisateur
        const contentDiv = document.createElement("div");
        contentDiv.classList.add("conversation-tab-content");
        const username = document.createElement("span");
        username.classList.add("conversation-tab-username");
        username.textContent = user;
        contentDiv.appendChild(username);
        tab.appendChild(contentDiv);

        // Badge de messages non lus
        if (unreadCount > 0) {
            const badge = document.createElement("span");
            badge.classList.add("unread-badge");
            badge.textContent = unreadCount > 99 ? "99+" : unreadCount.toString();
            tab.appendChild(badge);
        }

        // Bouton supprimer
        const deleteBtn = document.createElement("button");
        deleteBtn.classList.add("conversation-delete-btn");
        deleteBtn.innerHTML = "✕";
        deleteBtn.title = `Supprimer la conversation avec ${user}`;
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            onDeleteClick(user);
        });
        tab.appendChild(deleteBtn);

        // Click handler
        tab.addEventListener("click", () => onTabClick(user));

        return tab;
    }

    private createAvatarWithStatus(user: string, isOnline: boolean): HTMLElement {
        const avatarContainer = document.createElement("div");
        avatarContainer.classList.add("conversation-tab-avatar-container");
        avatarContainer.style.position = "relative";
        avatarContainer.style.display = "inline-block";

        const avatar = document.createElement("img");
        avatar.classList.add("conversation-tab-avatar");
        avatar.src = `/api/user/avatar/${user}`;
        avatar.alt = user;
        avatar.onerror = () => {
            avatar.src = '/api/user/avatar/default';
        };

        const statusIndicator = document.createElement("div");
        statusIndicator.classList.add("status-indicator");
        statusIndicator.classList.add(isOnline ? 'online' : 'offline');

        avatarContainer.appendChild(avatar);
        avatarContainer.appendChild(statusIndicator);

        return avatarContainer;
    }

    public renderCurrentConversation(messages: Message[]): void {
        if (!this.elements.chatBox) return;
        this.elements.chatBox.innerHTML = "";

        messages.forEach((m) => {
            const type = m.mine ? "me" : "other";
            const fromLabel = m.mine ? this.username || "" : m.from;
            const node = this.createMessageBubble(fromLabel, m.text, type, m.isHistory, m.timestamp);
            if (this.elements.chatBox) {
                this.elements.chatBox.appendChild(node);
            }
        });

        if (this.elements.chatBox) {
            this.elements.chatBox.scrollTop = this.elements.chatBox.scrollHeight;
        }
    }

    public addSystemMessage(text: string): void {
        if (!this.elements.chatBox) return;
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message", "system");
        msgDiv.textContent = text;
        this.elements.chatBox.appendChild(msgDiv);
        this.elements.chatBox.scrollTop = this.elements.chatBox.scrollHeight;
    }

    public createMessageBubble(from: string, text: string, type: string, isHistory?: boolean, timestamp?: string): HTMLElement {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message", type);

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

            nameSpan.addEventListener('click', () => {
                if ((window as any).showUserProfile) {
                    (window as any).showUserProfile(from);
                }
            });

            const textSpan = document.createElement("span");
            textSpan.textContent = text;

            msgDiv.appendChild(nameSpan);
            msgDiv.appendChild(textSpan);

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

    public updateCurrentChatLabel(user: string | null): void {
        if (!this.elements.currentChatLabel) return;

        const i18n = (window as any).i18n;
        this.elements.currentChatLabel.innerHTML = user
            ? (i18n ? i18n.t('chat_conversation_with', { user }) : `Conversation avec ${user}`)
            : (i18n ? i18n.t('chat_no_conversation') : "Aucune conversation sélectionnée");

        if (user && this.elements.currentChatLabel) {
            this.elements.currentChatLabel.style.cursor = 'pointer';
            this.elements.currentChatLabel.addEventListener('click', () => {
                if ((window as any).showUserProfile) {
                    (window as any).showUserProfile(user);
                }
            });
        }
    }

    public updateAvatarNotification(totalUnread: number): void {
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
