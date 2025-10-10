#!/bin/bash

echo "📊 Création des dashboards Kibana pour Elasticsearch..."
echo ""

# Attendre que Kibana soit prêt
echo "⏳ Vérification de Kibana..."
timeout=120
while [ $timeout -gt 0 ]; do
    if curl -f http://localhost:5601/api/status >/dev/null 2>&1; then
        echo "✅ Kibana prêt !"
        break
    fi
    echo "Attente de Kibana... ($timeout secondes restantes)"
    sleep 5
    timeout=$((timeout-5))
done

if [ $timeout -eq 0 ]; then
    echo "❌ Timeout : Kibana ne répond pas"
    exit 1
fi

# Vérifier qu'Elasticsearch a des données
echo ""
echo "🔍 Vérification des données Elasticsearch..."
doc_count=$(curl -s http://localhost:9200/_cat/indices?format=json | jq '[.[] | select(.index | startswith("transcendence-logs-") or startswith("nginx-logs-")) | .["docs.count"] | tonumber] | add // 0')

if [ "$doc_count" -eq 0 ]; then
    echo "⚠️  Aucun log trouvé dans Elasticsearch"
    echo "💡 Génération de logs de test..."
    
    # Générer des logs de test
    for i in {1..50}; do
        timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
        cat << EOF | nc localhost 5000 2>/dev/null || true
{"message": "Test log $i", "service": "test-service", "level": "info", "status": 200, "timestamp": "$timestamp", "user": "test-user-$((i % 5))", "action": "test-action-$((i % 3))"}
EOF
        if [ $((i % 10)) -eq 0 ]; then
            echo "Logs générés : $i/50"
        fi
    done
    
    echo "✅ Logs de test générés, attente 10s pour indexation..."
    sleep 10
fi

# Créer l'index pattern
echo ""
echo "📋 Création de l'index pattern..."
curl -X POST "http://localhost:5601/api/saved_objects/index-pattern/transcendence-logs" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "transcendence-logs-*",
      "timeFieldName": "@timestamp"
    }
  }' 2>/dev/null

curl -X POST "http://localhost:5601/api/saved_objects/index-pattern/nginx-logs" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "nginx-logs-*",
      "timeFieldName": "@timestamp"
    }
  }' 2>/dev/null

echo ""
echo "✅ Index patterns créés"

# Définir l'index pattern par défaut
curl -X POST "http://localhost:5601/api/kibana/settings/defaultIndex" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "transcendence-logs"
  }' 2>/dev/null

echo ""
echo "📊 Création des visualisations..."

# Visualisation 1 : Logs par niveau (Pie chart)
curl -X POST "http://localhost:5601/api/saved_objects/visualization/logs-by-level" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "Logs par niveau",
      "visState": "{\"title\":\"Logs par niveau\",\"type\":\"pie\",\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":true},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"level.keyword\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs\",\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
      }
    }
  }' >/dev/null 2>&1

# Visualisation 2 : Timeline des logs
curl -X POST "http://localhost:5601/api/saved_objects/visualization/logs-timeline" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "Timeline des logs",
      "visState": "{\"title\":\"Timeline des logs\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"min_doc_count\":1,\"extended_bounds\":{}}}]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs\",\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
      }
    }
  }' >/dev/null 2>&1

# Visualisation 3 : Top services
curl -X POST "http://localhost:5601/api/saved_objects/visualization/top-services" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "Top services",
      "visState": "{\"title\":\"Top services\",\"type\":\"horizontal_bar\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":true,\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"lineWidth\":2,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"service.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs\",\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
      }
    }
  }' >/dev/null 2>&1

# Visualisation 4 : Status codes (pour nginx)
curl -X POST "http://localhost:5601/api/saved_objects/visualization/status-codes" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "HTTP Status Codes",
      "visState": "{\"title\":\"HTTP Status Codes\",\"type\":\"pie\",\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"status\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs\",\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
      }
    }
  }' >/dev/null 2>&1

echo "✅ Visualisations créées"

# Créer le dashboard
echo ""
echo "🎨 Création du dashboard principal..."
curl -X POST "http://localhost:5601/api/saved_objects/dashboard/transcendence-main-dashboard" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "🎮 Transcendence - Logs Dashboard",
      "hits": 0,
      "description": "Dashboard principal pour les logs Transcendence",
      "panelsJSON": "[{\"version\":\"7.15.0\",\"gridData\":{\"x\":0,\"y\":0,\"w\":24,\"h\":12,\"i\":\"1\"},\"panelIndex\":\"1\",\"embeddableConfig\":{},\"panelRefName\":\"panel_0\"},{\"version\":\"7.15.0\",\"gridData\":{\"x\":24,\"y\":0,\"w\":24,\"h\":12,\"i\":\"2\"},\"panelIndex\":\"2\",\"embeddableConfig\":{},\"panelRefName\":\"panel_1\"},{\"version\":\"7.15.0\",\"gridData\":{\"x\":0,\"y\":12,\"w\":24,\"h\":12,\"i\":\"3\"},\"panelIndex\":\"3\",\"embeddableConfig\":{},\"panelRefName\":\"panel_2\"},{\"version\":\"7.15.0\",\"gridData\":{\"x\":24,\"y\":12,\"w\":24,\"h\":12,\"i\":\"4\"},\"panelIndex\":\"4\",\"embeddableConfig\":{},\"panelRefName\":\"panel_3\"}]",
      "optionsJSON": "{\"hidePanelTitles\":false,\"useMargins\":true}",
      "version": 1,
      "timeRestore": false,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
      }
    },
    "references": [
      {
        "name": "panel_0",
        "type": "visualization",
        "id": "logs-timeline"
      },
      {
        "name": "panel_1",
        "type": "visualization",
        "id": "logs-by-level"
      },
      {
        "name": "panel_2",
        "type": "visualization",
        "id": "top-services"
      },
      {
        "name": "panel_3",
        "type": "visualization",
        "id": "status-codes"
      }
    ]
  }' >/dev/null 2>&1

echo "✅ Dashboard créé !"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🎉 Dashboards Kibana créés avec succès !"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🌐 Accès Kibana : http://localhost:5601"
echo ""
echo "📊 Dashboards disponibles :"
echo "   • 🎮 Transcendence - Logs Dashboard (principal)"
echo ""
echo "📈 Visualisations créées :"
echo "   • Timeline des logs (graphique temporel)"
echo "   • Logs par niveau (pie chart)"
echo "   • Top services (bar chart)"
echo "   • HTTP Status Codes (pie chart)"
echo ""
echo "🔍 Navigation Kibana :"
echo "   1. Ouvrir http://localhost:5601"
echo "   2. Menu hamburger (☰) → Analytics → Dashboard"
echo "   3. Cliquer sur '🎮 Transcendence - Logs Dashboard'"
echo ""
echo "💡 Pour voir les logs bruts :"
echo "   Menu → Analytics → Discover"
echo "   Index pattern : transcendence-logs-*"
echo ""
echo "🔧 Recherches utiles dans Discover :"
echo "   • level:error                    → Voir uniquement les erreurs"
echo "   • service:backend                → Logs du backend"
echo "   • status:200                     → Requêtes réussies"
echo "   • message:*game*                 → Messages contenant 'game'"
echo ""
echo "═══════════════════════════════════════════════════════════"
