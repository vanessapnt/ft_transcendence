// Types et interfaces pour le système de chat

interface Message {
    from: string;
    text: string;
    mine: boolean;
    timestamp?: string;
    isHistory?: boolean;
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
    users?: string[];
    accepted?: boolean;
    isHistory?: boolean;
    timestamp?: string;
}

interface ChatElements {
    chatBox: HTMLElement | null;
    messageInput: HTMLInputElement | null;
    btnSend: HTMLButtonElement | null;
    conversationTabs: HTMLElement | null;
    currentChatLabel: HTMLElement | null;
    profileModal: HTMLElement | null;
    profileClose: HTMLElement | null;
    profileName: HTMLElement | null;
    profileUsername: HTMLElement | null;
    profileAvatar: HTMLImageElement | null;
}
