const winston = require('winston');
const net = require('net');

/**
 * Logger avec support TCP vers Logstash
 * Envoie les logs JSON en TCP au port 5000 de Logstash
 */

// Transport TCP personnalisé pour Logstash
class LogstashTCPTransport extends winston.Transport {
    constructor(options = {}) {
        super(options);
        console.log('[LogstashTCPTransport] Initialisation du transport TCP personnalisé pour Logstash');
        this.host = options.host || 'logstash';
        this.port = options.port || 5000;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.connect();
    }

    connect() {
        try {
            this.socket = net.createConnection({
                host: this.host,
                port: this.port
            });

            this.socket.on('connect', () => {
                console.log(`✅ Logger connecté à Logstash sur ${this.host}:${this.port}`);
                this.reconnectAttempts = 0;
            });

            this.socket.on('error', (err) => {
                console.error(`❌ Erreur de connexion Logstash: ${err.message}`);
                this.handleReconnect();
            });

            this.socket.on('close', () => {
                console.log('⚠️  Connexion Logstash fermée');
                this.handleReconnect();
            });
        } catch (error) {
            console.error(`Erreur lors de la connexion Logstash: ${error.message}`);
            this.handleReconnect();
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Tentative de reconnexion Logstash ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
            setTimeout(() => this.connect(), this.reconnectDelay);
        }
    }

    log(info, callback) {
        if (this.socket && this.socket.writable) {
            const logData = JSON.stringify({
                '@timestamp': info.timestamp || new Date().toISOString(),
                service: 'transcendence-backend',
                level: info.level.toUpperCase(),
                message: typeof info.message === 'string' ? info.message : JSON.stringify(info.message),
                ...info
            });

            this.socket.write(logData + '\n', () => {
                if (callback) callback();
            });
        } else {
            if (callback) callback();
        }
    }
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.json()
    ),
    transports: [
        // Console JSON (Docker log driver JSON-file)
        new winston.transports.Console({
            format: winston.format.printf(({ timestamp, level, message, ...meta }) => {
                return JSON.stringify({
                    '@timestamp': timestamp,
                    service: 'transcendence-backend',
                    level: level.toUpperCase(),
                    message: typeof message === 'string' ? message : JSON.stringify(message),
                    ...meta
                });
            })
        }),
        // TCP vers Logstash
        new LogstashTCPTransport({
            host: 'logstash',
            port: 5000
        })
    ]
});

module.exports = logger;
