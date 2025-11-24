class ChatWebSocket {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 0; // Désactivé
        this.reconnectDelay = 1000;
        this.isIntentionalDisconnect = false;
        this.isConnecting = false;
        this.reconnectTimer = null;
        this.onMessageCallback = null;
        this.onSystemMessageCallback = null;
    }
    setMessageCallback(callback) {
        this.onMessageCallback = callback;
    }
    setSystemMessageCallback(callback) {
        this.onSystemMessageCallback = callback;
    }
    connect(username, language = 'en') {
        if (this.isConnecting) {
            console.log("⚠️ Connexion déjà en cours, ignore...");
            return;
        }
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
            console.log("🔌 Fermeture de la connexion WebSocket existante");
            this.isIntentionalDisconnect = true;
            this.ws.close();
            this.ws = null;
        }
        this.createConnection(username, language);
    }
    createConnection(username, language) {
        this.isConnecting = true;
        const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
        const wsUrl = `${wsProtocol}://${window.location.host}/chat`;
        console.log("🔗 Tentative de connexion WebSocket:", wsUrl);
        try {
            this.ws = new WebSocket(wsUrl);
        }
        catch (error) {
            console.error("❌ Erreur création WebSocket:", error);
            this.isConnecting = false;
            const i18n = window.i18n;
            this.addSystemMessage(i18n ? i18n.t('chat_error_connection') : "❌ Erreur de connexion au chat. Veuillez rafraîchir la page.");
            return;
        }
        // Helper pour le tournoi
        if (!window.PONG)
            window.PONG = {};
        window.PONG.sendChatSystemMessage = (text) => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ from: "Tournoi", text }));
            }
        };
        this.ws.onopen = () => {
            console.log("✅ WebSocket connexion établie");
            this.isConnecting = false;
            this.isIntentionalDisconnect = false;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
            if (this.ws) {
                console.log("🔐 Envoi du login:", username, "langue:", language);
                this.ws.send(JSON.stringify({
                    type: "login",
                    username: username,
                    language: language
                }));
            }
        };
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("📨 Message WebSocket reçu:", data);
                if (this.onMessageCallback) {
                    this.onMessageCallback(data);
                }
            }
            catch (e) {
                console.error("❌ Erreur parsing message WebSocket:", e);
            }
        };
        this.ws.onerror = (err) => {
            console.error("❌ Chat: WS ERROR", err);
            this.isConnecting = false;
            const i18n = window.i18n;
            this.addSystemMessage(i18n ? i18n.t('chat_error_connection_failed') : "Erreur de connexion au chat.");
        };
        this.ws.onclose = (event) => {
            console.log("🔌 WebSocket fermée:", { code: event.code, reason: event.reason, intentional: this.isIntentionalDisconnect });
            this.isConnecting = false;
            const i18n = window.i18n;
            this.addSystemMessage(i18n ? i18n.t('chat_connection_closed') : "Connexion au chat fermée.");
        };
    }
    disconnect() {
        console.log("🔌 Déconnexion intentionnelle du chat");
        this.isIntentionalDisconnect = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
            this.ws.close();
        }
        this.ws = null;
        this.isConnecting = false;
    }
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
        else {
            console.error("❌ WebSocket non connectée, impossible d'envoyer:", data);
        }
    }
    isConnected() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
    addSystemMessage(text) {
        if (this.onSystemMessageCallback) {
            this.onSystemMessageCallback(text);
        }
    }
}
//# sourceMappingURL=ChatWebSocket.js.map