const promClient = require('prom-client');

/**
 * Métriques Prometheus pour le backend
 * Exposées sur GET /metrics
 */

// Métriques par défaut de Node.js
promClient.collectDefaultMetrics({
    prefix: 'transcendence_',
    gcDurationBuckets: [0.1, 1, 2, 5]
});

// Compteurs personnalisés
const httpRequestCounter = new promClient.Counter({
    name: 'transcendence_http_requests_total',
    help: 'Total des requêtes HTTP',
    labelNames: ['method', 'route', 'status', 'environment']
});

const httpRequestDuration = new promClient.Histogram({
    name: 'transcendence_http_request_duration_seconds',
    help: 'Durée des requêtes HTTP en secondes',
    labelNames: ['method', 'route', 'status', 'environment'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const activeConnections = new promClient.Gauge({
    name: 'transcendence_websocket_connections_active',
    help: 'Connexions WebSocket actives',
});

const dbQueryCounter = new promClient.Counter({
    name: 'transcendence_db_queries_total',
    help: 'Total des requêtes base de données',
    labelNames: ['query_type', 'status']
});

const dbQueryDuration = new promClient.Histogram({
    name: 'transcendence_db_query_duration_seconds',
    help: 'Durée des requêtes base de données en secondes',
    labelNames: ['query_type'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 2]
});

const authAttempts = new promClient.Counter({
    name: 'transcendence_auth_attempts_total',
    help: 'Total des tentatives d\'authentification',
    labelNames: ['provider', 'status']
});

const gameMetrics = new promClient.Counter({
    name: 'transcendence_games_total',
    help: 'Total des matchs joués',
    labelNames: ['type', 'outcome']
});

// Middleware pour capturer les métriques HTTP
function metricsMiddleware(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        const environment = process.env.NODE_ENV || 'development';

        httpRequestCounter.labels(
            req.method,
            route,
            res.statusCode,
            environment
        ).inc();

        httpRequestDuration.labels(
            req.method,
            route,
            res.statusCode,
            environment
        ).observe(duration);
    });

    next();
}

module.exports = {
    metricsMiddleware,
    httpRequestCounter,
    httpRequestDuration,
    activeConnections,
    dbQueryCounter,
    dbQueryDuration,
    authAttempts,
    gameMetrics,
    register: promClient.register
};
