class ChatWebSocket {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 0; // Désactivé
    private reconnectDelay = 1000;
    private isIntentionalDisconnect = false;
    private isConnecting = false;
    private reconnectTimer: number | null = null;
    private onMessageCallback: ((data: ChatData) => void) | null = null;
    private onSystemMessageCallback: ((text: string) => void) | null = null;

    public setMessageCallback(callback: (data: ChatData) => void): void {
        this.onMessageCallback = callback;
    }

    public setSystemMessageCallback(callback: (text: string) => void): void {
        this.onSystemMessageCallback = callback;
    }

    public connect(username: string, language: string = 'en'): void {
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

    private createConnection(username: string, language: string): void {
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
            return;
        }

        // Helper pour le tournoi
        if (!(window as any).PONG) (window as any).PONG = {};
        (window as any).PONG.sendChatSystemMessage = (text: string) => {
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
                const data: ChatData = JSON.parse(event.data);
                console.log("📨 Message WebSocket reçu:", data);
                if (this.onMessageCallback) {
                    this.onMessageCallback(data);
                }
            } catch (e) {
                console.error("❌ Erreur parsing message WebSocket:", e);
            }
        };

        this.ws.onerror = (err) => {
            console.error("❌ Chat: WS ERROR", err);
            this.isConnecting = false;
            const i18n = (window as any).i18n;
            this.addSystemMessage(i18n ? i18n.t('chat_error_connection_failed') : "Erreur de connexion au chat.");
        };

        this.ws.onclose = (event) => {
            console.log("🔌 WebSocket fermée:", { code: event.code, reason: event.reason, intentional: this.isIntentionalDisconnect });
            this.isConnecting = false;
            const i18n = (window as any).i18n;
            this.addSystemMessage(i18n ? i18n.t('chat_connection_closed') : "Connexion au chat fermée.");
        };
    }

    public disconnect(): void {
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

    public send(data: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error("❌ WebSocket non connectée, impossible d'envoyer:", data);
        }
    }

    public isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    private addSystemMessage(text: string): void {
        if (this.onSystemMessageCallback) {
            this.onSystemMessageCallback(text);
        }
    }
}
