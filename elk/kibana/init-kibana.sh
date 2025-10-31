#!/bin/sh
set -x
# Script d'initialisation Kibana avancé pour ft_transcendence
# Crée une interface complète et optimisée pour l'analyse des logs Elasticsearch

# Mode silencieux par défaut, verbose si VERBOSE=1
VERBOSE=${VERBOSE:-0}

# Déterminer l'URL de Kibana (configurable par l'environnement)
KIBANA_URL="${KIBANA_URL:-kibana}"
echo "KIBANA_URL=$KIBANA_URL"

# Test de connexion explicite
curl -v http://$KIBANA_URL:5601/api/status

# Attendre que Kibana soit disponible
until curl -s http://$KIBANA_URL:5601/api/status | grep -q '"state":"green"'; do
  echo "⏳ Attente de Kibana..."
  sleep 5
done
echo "Kibana prêt !"

echo "[OK] Kibana disponible, création des composants avancés..."

# ==========================================
# 1. CRÉATION DE L'INDEX PATTERN PRINCIPAL
# ==========================================
echo "[INFO] 📊 Création de l'index pattern principal..."

RESPONSE=$(curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/index-pattern/transcendence-logs-*" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "transcendence-logs-*",
      "timeFieldName": "@timestamp",
      "fields": "[]",
      "sourceFilters": "[]",
      "fieldFormatMap": "{\"@timestamp\":{\"id\":\"date\"}}",
      "runtimeFieldMap": "{}",
      "fieldAttrs": "{}"
    }
  }' 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "[ERREUR] Échec création index pattern"
    exit 1
fi

# ==========================================
# 2. CRÉATION DES RECHERCHES SAUVEGARDÉES
# ==========================================
echo "[INFO] Création des recherches sauvegardées..."

# Recherche pour les erreurs
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/search/error-logs" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Erreurs et Warnings",
      "description": "Tous les logs d'\''erreur et de warning",
      "columns": ["@timestamp", "level", "service", "message", "status"],
      "sort": [["@timestamp", "desc"]],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"filter\":[],\"highlightAll\":true,\"version\":true,\"query\":{\"query\":\"level:(ERROR OR WARN)\",\"language\":\"kuery\"}}"
      }
    }
  }' >/dev/null

# Recherche pour les logs de performance
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/search/performance-logs" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Performance & Timing",
      "description": "Logs liés aux performances et temps de réponse",
      "columns": ["@timestamp", "service", "method", "url", "response_time", "status"],
      "sort": [["@timestamp", "desc"]],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"filter\":[],\"highlightAll\":true,\"version\":true,\"query\":{\"query\":\"response_time:* OR method:*\",\"language\":\"kuery\"}}"
      }
    }
  }' >/dev/null

# Recherche pour l'\''activité utilisateur
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/search/user-activity" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Activité Utilisateur",
      "description": "Logs d'\''activité des utilisateurs",
      "columns": ["@timestamp", "user_id", "action", "service", "ip", "user_agent"],
      "sort": [["@timestamp", "desc"]],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"filter\":[],\"highlightAll\":true,\"version\":true,\"query\":{\"query\":\"user_id:* OR action:*\",\"language\":\"kuery\"}}"
      }
    }
  }' >/dev/null

# ==========================================
# 3. CRÉATION DES VISUALISATIONS AVANCÉES
# ==========================================
echo "[INFO] 📈 Création des visualisations avancées..."

# 1. Distribution des niveaux de log (avec couleurs)
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/visualization/log-levels-pie" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Niveaux de Log",
      "description": "Distribution des niveaux de log (INFO, WARN, ERROR)",
      "visState": "{\"title\":\"Niveaux de Log\",\"type\":\"pie\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"level\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"params\":{\"addLegend\":true,\"isDonut\":false,\"labels\":{\"show\":true,\"values\":true,\"last_level\":true,\"truncate\":100}}}",
      "uiStateJSON": "{\"vis\":{\"colors\":{\"ERROR\":\"#BF1B00\",\"WARN\":\"#F39C12\",\"INFO\":\"#27AE60\"}}}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"query\":{\"match_all\":{}}}"
      }
    }
  }' >/dev/null

# 2. Timeline des erreurs avec stack
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/visualization/error-timeline" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Timeline des Erreurs",
      "description": "Évolution des erreurs dans le temps",
      "visState": "{\"title\":\"Timeline des Erreurs\",\"type\":\"area\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"min_doc_count\":0}},{\"id\":\"3\",\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"level\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"params\":{\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"area\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}]}}",
      "uiStateJSON": "{}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"query\":{\"query\":\"level:(ERROR OR WARN)\",\"language\":\"kuery\"}}"
      }
    }
  }' >/dev/null

# 3. Top 10 des erreurs par message
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/visualization/top-errors-table" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Top 10 Erreurs",
      "description": "Messages d'\''erreur les plus fréquents",
      "visState": "{\"title\":\"Top 10 Erreurs\",\"type\":\"table\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"message.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"params\":{\"perPage\":10,\"showPartialRows\":false,\"showMetricsAtAllLevels\":false,\"sort\":{\"columnIndex\":null,\"direction\":null},\"showTotal\":false,\"totalFunc\":\"sum\"}}",
      "uiStateJSON": "{}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"query\":{\"query\":\"level:ERROR\",\"language\":\"kuery\"}}"
      }
    }
  }' >/dev/null

# 4. Métriques de performance (temps de réponse)
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/visualization/response-time-metrics" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Métriques Performance",
      "description": "Statistiques des temps de réponse",
      "visState": "{\"title\":\"Métriques Performance\",\"type\":\"metric\",\"aggs\":[{\"id\":\"1\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"response_time\"}},{\"id\":\"2\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"response_time\"}},{\"id\":\"3\",\"type\":\"min\",\"schema\":\"metric\",\"params\":{\"field\":\"response_time\"}},{\"id\":\"4\",\"type\":\"percentiles\",\"schema\":\"metric\",\"params\":{\"field\":\"response_time\",\"percents\":[95,99]}}],\"params\":{\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"None\",\"colorsRange\":[],\"labels\":{\"show\":true,\"overrides\":[]},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"\",\"fontSize\":60}}}}",
      "uiStateJSON": "{}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"query\":{\"query\":\"response_time:*\",\"language\":\"kuery\"}}"
      }
    }
  }' >/dev/null

# 5. Activité par service (bar chart)
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/visualization/service-activity" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Activité par Service",
      "description": "Nombre de logs par service",
      "visState": "{\"title\":\"Activité par Service\",\"type\":\"histogram\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"service.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"params\":{\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"normal\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}]}}",
      "uiStateJSON": "{}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"query\":{\"match_all\":{}}}"
      }
    }
  }' >/dev/null

# 6. Codes de statut HTTP
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/visualization/http-status-codes" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Codes HTTP",
      "description": "Distribution des codes de statut HTTP",
      "visState": "{\"title\":\"Codes HTTP\",\"type\":\"pie\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"status\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"params\":{\"addLegend\":true,\"isDonut\":true,\"labels\":{\"show\":true,\"values\":true,\"last_level\":true,\"truncate\":100}}}",
      "uiStateJSON": "{\"vis\":{\"colors\":{\"200\":\"#27AE60\",\"201\":\"#27AE60\",\"400\":\"#F39C12\",\"401\":\"#E74C3C\",\"403\":\"#E74C3C\",\"404\":\"#F39C12\",\"500\":\"#BF1B00\"}}}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"query\":{\"query\":\"status:*\",\"language\":\"kuery\"}}"
      }
    }
  }' >/dev/null

# 7. Timeline générale des logs
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/visualization/logs-timeline" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Timeline Générale",
      "description": "Évolution temporelle de tous les logs",
      "visState": "{\"title\":\"Timeline Générale\",\"type\":\"histogram\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"min_doc_count\":0}}],\"params\":{\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"normal\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}]}}",
      "uiStateJSON": "{}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"query\":{\"match_all\":{}}}"
      }
    }
  }' >/dev/null

# 9. Activité de jeu Pong (spécifique Transcendence)
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/visualization/game-activity" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Activité de Jeu",
      "description": "Actions de jeu les plus fréquentes (start, score, end)",
      "visState": "{\"title\":\"Activité de Jeu\",\"type\":\"pie\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"action.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"params\":{\"addLegend\":true,\"isDonut\":false,\"labels\":{\"show\":true,\"values\":true,\"last_level\":true,\"truncate\":100}}}",
      "uiStateJSON": "{\"vis\":{\"colors\":{\"game_start\":\"#3498DB\",\"score_update\":\"#E74C3C\",\"game_end\":\"#27AE60\",\"lobby_join\":\"#F39C12\",\"tournament_create\":\"#9B59B6\"}}}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"query\":{\"query\":\"action:(game_start OR score_update OR game_end OR lobby_join OR tournament_create)\",\"language\":\"kuery\"}}"
      }
    }
  }' >/dev/null

# 10. Statistiques des parties (spécifique Transcendence)
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/visualization/game-stats" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Statistiques Parties",
      "description": "Métriques des parties de Pong",
      "visState": "{\"title\":\"Statistiques Parties\",\"type\":\"metric\",\"aggs\":[{\"id\":\"1\",\"type\":\"cardinality\",\"schema\":\"metric\",\"params\":{\"field\":\"game_id.keyword\"}},{\"id\":\"2\",\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"duration\"}},{\"id\":\"3\",\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"duration\"}},{\"id\":\"4\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Actions Jeu\"}}],\"params\":{\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"None\",\"colorsRange\":[],\"labels\":{\"show\":true,\"overrides\":[]},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"\",\"fontSize\":36}}}}",
      "uiStateJSON": "{}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"query\":{\"query\":\"game_id:* OR action:(game_start OR game_end)\",\"language\":\"kuery\"}}"
      }
    }
  }' >/dev/null

# 11. Timeline des parties (spécifique Transcendence)
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/visualization/games-timeline" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Timeline des Parties",
      "description": "Évolution des parties de Pong dans le temps",
      "visState": "{\"title\":\"Timeline des Parties\",\"type\":\"histogram\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"min_doc_count\":0}},{\"id\":\"3\",\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"action.keyword\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"params\":{\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}]}}",
      "uiStateJSON": "{}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"query\":{\"query\":\"action:(game_start OR game_end OR tournament_create)\",\"language\":\"kuery\"}}"
      }
    }
  }' >/dev/null

# 12. Authentification 42 (spécifique Transcendence)
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/visualization/auth-activity" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Authentification 42",
      "description": "Activité d'\''authentification via 42",
      "visState": "{\"title\":\"Authentification 42\",\"type\":\"table\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"action.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"params\":{\"perPage\":10,\"showPartialRows\":false,\"showMetricsAtAllLevels\":false,\"sort\":{\"columnIndex\":null,\"direction\":null},\"showTotal\":false,\"totalFunc\":\"sum\"}}",
      "uiStateJSON": "{}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs-*\",\"query\":{\"query\":\"action:(login OR register OR logout OR login_failed)\",\"language\":\"kuery\"}}"
      }
    }
  }' >/dev/null

# ==========================================
# 4. CRÉATION DU DASHBOARD PRINCIPAL
# ==========================================
echo "[INFO] 📊 Création du dashboard principal avancé..."

# Nettoyer les anciens dashboards
DASHBOARD_TITLE="Transcendence Monitoring Dashboard"
ALL_IDS=$(curl -s -X GET "$KIBANA_URL:5601/api/saved_objects/_find?type=dashboard&fields=title&per_page=1000" -H "kbn-xsrf: true" | jq -r --arg title "$DASHBOARD_TITLE" '.saved_objects[] | select(.attributes.title == $title) | .id' 2>/dev/null)
for id in $ALL_IDS; do
  curl -s -X DELETE "$KIBANA_URL:5601/api/saved_objects/dashboard/$id" -H "kbn-xsrf: true" >/dev/null
done

# Créer le dashboard avancé
# Dashboard principal Transcendence (monitoring général + jeu)
curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/dashboard/transcendence-main" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Transcendence - Monitoring Principal",
      "description": "Dashboard principal pour le monitoring du jeu Pong Transcendence",
      "hits": 0,
    "references": [
      { "name": "panel_0", "type": "visualization", "id": "log-levels" },
      { "name": "panel_1", "type": "visualization", "id": "http-status-codes" },
      { "name": "panel_2", "type": "visualization", "id": "game-activity" },
      { "name": "panel_3", "type": "visualization", "id": "game-stats" },
      { "name": "panel_4", "type": "visualization", "id": "games-timeline" },
      { "name": "panel_5", "type": "visualization", "id": "service-activity" },
      { "name": "panel_6", "type": "visualization", "id": "auth-activity" }
    ]
      "optionsJSON": "{\"useMargins\":true,\"syncColors\":false,\"syncCursor\":true,\"syncTooltips\":false}",
      "timeRestore": false,
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[]}"
      }
    }
  }' >/dev/null

# ==========================================
# 5. CRÉATION DU DASHBOARD ERREURS
# ==========================================
echo "[INFO] 🚨 Création du dashboard d'analyse d'erreurs..."

curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/dashboard/transcendence-errors-dashboard" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Transcendence - Analyse d'\''Erreurs",
      "description": "Dashboard spécialisé pour l'\''analyse des erreurs et problèmes",
      "panelsJSON": "[{\"version\":\"7.15.0\",\"gridData\":{\"x\":0,\"y\":0,\"w\":24,\"h\":12,\"i\":\"1\"},\"panelIndex\":\"1\",\"embeddableConfig\":{},\"panelRefName\":\"panel_1\"},{\"version\":\"7.15.0\",\"gridData\":{\"x\":24,\"y\":0,\"w\":24,\"h\":12,\"i\":\"2\"},\"panelIndex\":\"2\",\"embeddableConfig\":{},\"panelRefName\":\"panel_2\"},{\"version\":\"7.15.0\",\"gridData\":{\"x\":0,\"y\":12,\"w\":48,\"h\":15,\"i\":\"3\"},\"panelIndex\":\"3\",\"embeddableConfig\":{},\"panelRefName\":\"panel_3\"}]",
      "optionsJSON": "{\"useMargins\":true,\"syncColors\":false,\"hidePanelTitles\":false}",
      "version": 2,
      "timeRestore": true,
      "timeFrom": "now-24h",
      "timeTo": "now",
      "refreshInterval": {
        "pause": false,
        "value": 60000
      },
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"query\":\"level:(ERROR OR WARN)\",\"language\":\"kuery\"},\"filter\":[]}"
      }
    },
    "references": [
      { "name": "panel_1", "type": "visualization", "id": "error-timeline" },
      { "name": "panel_2", "type": "visualization", "id": "top-errors-table" },
      { "name": "panel_3", "type": "search", "id": "error-logs" }
    ]
  }' >/dev/null

# ==========================================
# 6. CRÉATION DU DASHBOARD PERFORMANCE
# ==========================================
echo "[INFO] ⚡ Création du dashboard de performance..."

curl -s -X POST "$KIBANA_URL:5601/api/saved_objects/dashboard/transcendence-performance-dashboard" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Transcendence - Performance",
      "description": "Dashboard de monitoring des performances",
      "panelsJSON": "[{\"version\":\"7.15.0\",\"gridData\":{\"x\":0,\"y\":0,\"w\":24,\"h\":8,\"i\":\"1\"},\"panelIndex\":\"1\",\"embeddableConfig\":{},\"panelRefName\":\"panel_1\"},{\"version\":\"7.15.0\",\"gridData\":{\"x\":24,\"y\":0,\"w\":24,\"h\":8,\"i\":\"2\"},\"panelIndex\":\"2\",\"embeddableConfig\":{},\"panelRefName\":\"panel_2\"},{\"version\":\"7.15.0\",\"gridData\":{\"x\":0,\"y\":8,\"w\":48,\"h\":12,\"i\":\"3\"},\"panelIndex\":\"3\",\"embeddableConfig\":{},\"panelRefName\":\"panel_3\"}]",
      "optionsJSON": "{\"useMargins\":true,\"syncColors\":false,\"hidePanelTitles\":false}",
      "version": 2,
      "timeRestore": true,
      "timeFrom": "now-1h",
      "timeTo": "now",
      "refreshInterval": {
        "pause": false,
        "value": 30000
      },
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"query\":\"response_time:*\",\"language\":\"kuery\"},\"filter\":[]}"
      }
    },
    "references": [
      { "name": "panel_1", "type": "visualization", "id": "response-time-metrics" },
      { "name": "panel_2", "type": "visualization", "id": "http-status-codes" },
      { "name": "panel_3", "type": "search", "id": "performance-logs" }
    ]
  }' >/dev/null

echo "[OK] Configuration Kibana avancée terminée !"

# Afficher les liens d'accès
if [ "$VERBOSE" = "1" ]; then
    echo ""
    echo "🌐 Accès Kibana :"
    echo "   • Interface principale : http://localhost:5601"
    echo "   • Dashboard principal : http://localhost:5601/app/dashboards#/view/transcendence-main-dashboard"
    echo "   • Analyse d'erreurs : http://localhost:5601/app/dashboards#/view/transcendence-errors-dashboard"
    echo "   • Performance : http://localhost:5601/app/dashboards#/view/transcendence-performance-dashboard"
    echo ""
    echo "🔍 Recherches sauvegardées disponibles :"
    echo "   • Erreurs et Warnings"
    echo "   • Performance & Timing"
    echo "   • Activité Utilisateur"
    echo ""
    echo "📊 Fonctionnalités avancées :"
    echo "   • Visualisations interactives avec drill-down"
    echo "   • Filtres temporels automatiques"
    echo "   • Actualisation en temps réel (30s-60s)"
    echo "   • Couleurs codées par sévérité"
    echo "   • Tables triables et filtrables"
fi

exit 0
