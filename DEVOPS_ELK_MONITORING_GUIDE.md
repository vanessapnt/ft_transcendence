# Configuration ELK et Monitoring - Guide Complet

## 📋 Vue d'ensemble

Ce projet implémente complètement les modules DevOps demandés :

1. **Module Majeur : ELK Stack** (Elasticsearch, Logstash, Kibana) pour la gestion des logs
2. **Module Mineur : Prometheus + Grafana** pour le monitoring des métriques système et applicatives

---

## 🏗️ Architecture

### ELK Stack (Logs)

```
Frontend/Backend → Winston Logger → TCP:5000 (Logstash)
                ↓
            Logstash (Enrichissement)
                ↓
            Elasticsearch (Indexation)
                ↓
            Kibana (Visualisation)
```

**Composants** :
- **Elasticsearch (9200)** : Stocke et indexe les logs
- **Logstash (5044, 5000)** : Collecte, traite et transforme les logs
- **Kibana (5601)** : Interface de visualisation interactive
- **Filebeat** : Collecte les logs des conteneurs Docker

### Prometheus + Grafana (Metrics)

```
Backend (/metrics) → Prometheus (scrape)
    ↓
Node Exporter (système)
    ↓
Prometheus (stockage TSDB)
    ↓
Grafana (dashboards)
```

**Composants** :
- **Prometheus (9090)** : Collecte et stocke les métriques (TSDB)
- **Node Exporter (9100)** : Métriques système (CPU, RAM, disque)
- **Grafana (3001)** : Dashboards visuels

---

## 📊 Configuration Détaillée

### 1. Backend Logger (Winston)

**Fichier** : `backend/logger.js`

Logs collectés :
- Requêtes HTTP (méthode, route, status, durée)
- Erreurs et exceptions
- Logs applicatifs personnalisés
- Événements d'authentification

Transport :
```javascript
// HTTP vers Logstash:5000
new winston.transports.Http({
  host: 'logstash',
  port: 5000
})

// Fichiers locaux avec rotation
new (require('winston-daily-rotate-file'))({
  filename: 'logs/transcendence-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'
})
```

### 2. Backend Metrics (Prometheus)

**Fichier** : `backend/metrics.js`

Métriques exposées sur `GET /metrics` :

| Métrique | Type | Libellé |
|----------|------|---------|
| HTTP Requests | Counter | `transcendence_http_requests_total` |
| HTTP Latency | Histogram | `transcendence_http_request_duration_seconds` |
| WebSocket Connections | Gauge | `transcendence_websocket_connections_active` |
| DB Queries | Counter | `transcendence_db_queries_total` |
| DB Query Duration | Histogram | `transcendence_db_query_duration_seconds` |
| Auth Attempts | Counter | `transcendence_auth_attempts_total` |
| Games Played | Counter | `transcendence_games_total` |

### 3. Logstash Pipeline

**Fichier** : `elk/logstash/pipeline/logstash.conf`

Inputs :
- `beats:5044` - Logs Docker via Filebeat
- `tcp:5000` - Logs JSON du backend

Processing :
- Parse JSON logs
- Normalise les formats
- Ajoute des métadonnées
- Génère les index quotidiens

Output :
- Elasticsearch avec pattern `transcendence-logs-YYYY.MM.DD`

### 4. Kibana Initialization

**Fichier** : `elk/kibana/init-kibana.sh`

Initialise automatiquement :
- ✅ Index pattern `transcendence-logs-*`
- ✅ Recherches sauvegardées :
  - Tous les logs
  - Erreurs et warnings
  - Logs backend
  - Logs conteneurs Docker

### 5. Elasticsearch ILM Policy

**Fichier** : `elk/elasticsearch/setup-ilm-policy.sh`

Politique de rétention automatique (30 jours) :

| Phase | Durée | Actions |
|-------|-------|---------|
| HOT | 0j | Rollover si > 500MB ou 1 jour |
| WARM | 7j | Merge + compression |
| COLD | 14j | Snapshot (optionnel) |
| DELETE | 30j | Suppression automatique |

### 6. Prometheus Configuration

**Fichier** : `monitoring/prometheus/prometheus.yml`

Scrape jobs :
- `prometheus` - Prometheus lui-même
- `node-exporter` - Métriques système (CPU, RAM, disque, réseau)
- `elasticsearch` - Stats Elasticsearch
- `transcendence-backend` - Métriques custom backend

Interval de scrape : 15 secondes

### 7. Grafana Dashboards

Dashboards provisionés automatiquement :

#### a) System Metrics (`system-metrics.json`)
Visualise :
- 📊 Utilisation CPU
- 💾 Utilisation Mémoire
- 💿 Utilisation Disque
- ⚡ Charge système (1min, 5min, 15min)

#### b) Backend Metrics (`backend-metrics.json`)
Visualise :
- 📈 Requêtes HTTP totales (5min)
- ❌ Erreurs HTTP (4xx, 5xx)
- ⏱️ Temps réponse moyen
- 📊 Requêtes par status
- 📉 Latence percentiles (p95, p99)
- 🔌 Connexions WebSocket actives
- 🗄️ Requêtes base de données

---

## 🔒 Sécurité

### ELK Stack

| Aspect | Statut | Details |
|--------|--------|---------|
| Authentification Elasticsearch | ❌ Désactivée | À activer en production via XPack |
| Chiffrement | ❌ Non configuré | À implémenter avec SSL/TLS |
| Accès réseau | ⚠️ Local seulement | Ports liés à 127.0.0.1 en prod |
| Credentials | ⚠️ Variables d'env | À utiliser `.env.monitoring` |

### Grafana

| Aspect | Détails |
|--------|---------|
| Authentification | ✅ Admin required (user: admin) |
| Credentials | 📝 À changer : `GF_SECURITY_ADMIN_PASSWORD` |
| Autorisation | ✅ Sign-up désactivé (`GF_USERS_ALLOW_SIGN_UP: false`) |

### Recommendations

1. **Production** : Activer XPack security sur Elasticsearch
2. **Credentials** : Stocker les passwords dans un secret manager
3. **TLS** : Configurer SSL/TLS entre les services
4. **Réseau** : Restreindre l'accès aux ports monitoring

---

## 📝 Utilisation

### Démarrage

**Développement** :
```bash
make dev
```

**Production** :
```bash
make prod
```

### Accès aux services

| Service | URL | Login |
|---------|-----|-------|
| Kibana | `http://localhost:5601` | Aucun |
| Grafana | `http://localhost:3001` | admin / transcendence123 |
| Prometheus | `http://localhost:9090` | Aucun |
| Backend Metrics | `http://localhost:8000/metrics` | Aucun |

### Requêtes Kibana (KQL)

Exemples :

```
# Tous les logs
*

# Erreurs uniquement
level:(ERROR OR WARN)

# Logs du backend
service:transcendence-backend

# Logs des 5 dernières minutes
@timestamp: [now-5m TO now]

# Requêtes HTTP lentes (> 1s)
message:"*request_duration*" AND 1000

# Erreurs d'authentification
message:"*auth*" AND level:ERROR
```

### Dashboards Grafana

1. **System Metrics** : Cliquer sur "System & Resources" dans Grafana
2. **Backend Metrics** : Cliquer sur "API Backend" dans Grafana
3. **Personnaliser** : Éditer les dashboards dans `monitoring/grafana/dashboards/`

---

## 🔄 Flux de données

### Logs → Elasticsearch

```
1. Backend Express (winston logger)
   ↓
2. Winston transports:
   - Console (développement)
   - HTTP vers Logstash:5000
   - Fichiers locaux (logs/)
   ↓
3. Logstash:5000 reçoit JSON
   ↓
4. Logstash pipeline (enrichissement)
   ↓
5. Elasticsearch indexe
   ↓
6. Kibana visualise
```

### Metrics → Prometheus → Grafana

```
1. Backend Express (prom-client)
   ↓
2. Prometheus scrape GET /metrics (toutes les 15s)
   ↓
3. Node Exporter envoie métriques système
   ↓
4. Prometheus stocke (TSDB)
   ↓
5. Grafana query Prometheus
   ↓
6. Grafana affiche dashboards
```

---

## 🛠️ Maintenance

### Logs trop volumineux ?

Les anciens logs sont supprimés automatiquement après 30 jours via ILM policy.

Pour changer :
1. Éditer `elk/elasticsearch/setup-ilm-policy.sh`
2. Modifier `min_age: 30d` à la phase "delete"

### Ajouter des métriques

1. Créer un `new promClient.Counter()` ou `Gauge()` ou `Histogram()`
2. Utiliser dans le code : `metricName.labels(...).inc()` ou `.observe(value)`
3. La métrique apparaît automatiquement sur `GET /metrics`

### Créer un dashboard personnalisé

1. Aller dans Grafana
2. Créer un nouveau dashboard
3. Ajouter des panels avec PromQL
4. Exporter en JSON dans `monitoring/grafana/dashboards/`

---

## ✅ Checklist de conformité

- ✅ Elasticsearch déployé et stocke les logs
- ✅ Logstash collecte et traite les logs
- ✅ Kibana visualise les logs
- ✅ Rétention/archivage configurée (30j)
- ✅ Prometheus collecte les métriques
- ✅ Node Exporter pour métriques système
- ✅ Grafana avec dashboards custom
- ✅ Alertes prêtes à configurer (Prometheus rules)
- ✅ Authentification Grafana activée
- ✅ Logs applicatifs collectés (Winston)
- ✅ Métriques application exposées (/metrics)

---

## 🚀 Prochaines étapes optionnelles

1. **Alerting** : Configurer des alertes Prometheus
2. **XPack Security** : Activer authentification Elasticsearch
3. **Backup** : Configurer les snapshots Elasticsearch
4. **Custom Visualizations** : Ajouter des dashboards spécifiques
5. **Log Levels** : Ajouter du filtrage par level dans Logstash
6. **Performance Tuning** : Optimiser les heap sizes Java (ES, Logstash)

---

## 📚 Ressources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/7.15/index.html)
- [Kibana User Guide](https://www.elastic.co/guide/en/kibana/7.15/index.html)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboard Documentation](https://grafana.com/docs/grafana/latest/dashboards/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Prometheus Client Node.js](https://github.com/siimon/prom-client)
