#!/bin/bash
# Script d'initialisation Kibana pour ft_transcendence

echo "🔄 Initialisation des dashboards Kibana..."

# Attendre que Kibana soit disponible (sans jq)
until curl -s http://kibana:5601/api/status | grep -q '"state":"green"'; do
  echo "⏳ Attente de Kibana..."
  sleep 5
done

echo "✅ Kibana disponible, création des index patterns..."

# Créer l'index pattern pour les logs de transcendence
curl -X POST "kibana:5601/api/saved_objects/index-pattern/transcendence-logs" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "transcendence-logs-*",
      "timeFieldName": "@timestamp"
    }
  }'

echo ""
echo "📊 Création des visualisations..."

# 1. Créer une visualisation pour les statuts de logs
curl -X POST "kibana:5601/api/saved_objects/visualization/status-pie-chart" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Status Codes Distribution",
      "description": "Distribution des codes de statut",
      "visState": "{\"title\":\"Status Codes Distribution\",\"type\":\"pie\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"status\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
      "uiStateJSON": "{}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs\",\"query\":{\"match_all\":{}}}"
      }
    }
  }'

echo ""
echo "📈 Création visualisation services..."

# 2. Créer une visualisation pour les services
curl -X POST "kibana:5601/api/saved_objects/visualization/services-bar-chart" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Logs par Service",
      "description": "Nombre de logs par service",
      "visState": "{\"title\":\"Logs par Service\",\"type\":\"histogram\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"service.keyword\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
      "uiStateJSON": "{}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs\",\"query\":{\"match_all\":{}}}"
      }
    }
  }'

echo ""
echo "⏰ Création timeline des logs..."

# 3. Créer une timeline des logs
curl -X POST "kibana:5601/api/saved_objects/visualization/logs-timeline" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "Timeline des Logs",
      "description": "Évolution temporelle des logs",
      "visState": "{\"title\":\"Timeline des Logs\",\"type\":\"histogram\",\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"min_doc_count\":1}}]}",
      "uiStateJSON": "{}",
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"transcendence-logs\",\"query\":{\"match_all\":{}}}"
      }
    }
  }'

echo ""
echo "📊 Mise à jour du dashboard avec les visualisations..."

# 4. Mettre à jour le dashboard avec les visualisations
curl -X PUT "kibana:5601/api/saved_objects/dashboard/transcendence-dashboard" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "attributes": {
      "title": "ft_transcendence Dashboard",
      "description": "Dashboard principal pour le monitoring de transcendence",
      "panelsJSON": "[{\"version\":\"7.15.0\",\"gridData\":{\"x\":0,\"y\":0,\"w\":24,\"h\":15,\"i\":\"1\"},\"panelIndex\":\"1\",\"embeddableConfig\":{},\"panelRefName\":\"panel_1\"},{\"version\":\"7.15.0\",\"gridData\":{\"x\":24,\"y\":0,\"w\":24,\"h\":15,\"i\":\"2\"},\"panelIndex\":\"2\",\"embeddableConfig\":{},\"panelRefName\":\"panel_2\"},{\"version\":\"7.15.0\",\"gridData\":{\"x\":0,\"y\":15,\"w\":48,\"h\":15,\"i\":\"3\"},\"panelIndex\":\"3\",\"embeddableConfig\":{},\"panelRefName\":\"panel_3\"}]",
      "optionsJSON": "{\"useMargins\":true,\"syncColors\":false,\"hidePanelTitles\":false}",
      "version": 2,
      "timeRestore": false,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[]}"
      }
    },
    "references": [
      {
        "name": "panel_1",
        "type": "visualization",
        "id": "status-pie-chart"
      },
      {
        "name": "panel_2", 
        "type": "visualization",
        "id": "services-bar-chart"
      },
      {
        "name": "panel_3",
        "type": "visualization", 
        "id": "logs-timeline"
      }
    ]
  }'

echo ""
echo "✅ Configuration Kibana terminée !"
echo "🌐 Accédez à Kibana : http://localhost:5601"
echo "📊 Dashboard : http://localhost:5601/app/dashboards#/view/transcendence-dashboard"