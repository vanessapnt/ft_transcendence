#!/bin/bash

echo "🎨 Création du dashboard Transcendence System Monitoring..."

# Attendre que Grafana soit prêt
echo "⏳ Vérification de Grafana..."
# Attendre que Grafana soit prêt
while ! curl -f http://localhost:3001/api/health >/dev/null 2>&1; do
    sleep 2
done
# UID fixe pour le dashboard
DASHBOARD_TITLE="🎮 Transcendence System Monitoring"
DASHBOARD_UID="transcendence-system-monitoring"
# Supprimer tous les dashboards du même titre (pour nettoyage)
EXISTING_UIDS=$(curl -s -u admin:transcendence123 "http://localhost:3001/api/search?query=$(echo $DASHBOARD_TITLE | jq -sRr @uri)" | jq -r --arg title "$DASHBOARD_TITLE" '.[] | select(.title == $title) | .uid')
for uid in $EXISTING_UIDS; do
  if [ "$uid" != "$DASHBOARD_UID" ]; then
    curl -s -X DELETE -u admin:transcendence123 "http://localhost:3001/api/dashboards/uid/$uid" >/dev/null
  fi
done
curl -s -X POST http://admin:transcendence123@localhost:3001/api/dashboards/db \
-H "Content-Type: application/json" \
-d '{
  "dashboard": {
    "uid": "transcendence-system-monitoring",
    "id": null,
    "title": "🎮 Transcendence System Monitoring",
    "tags": ["transcendence", "system", "production"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Services Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up",
            "legendFormat": "{{job}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "mappings": [
              {
                "options": {
                  "0": {
                    "text": "DOWN",
                    "color": "red"
                  },
                  "1": {
                    "text": "UP", 
                    "color": "green"
                  }
                },
                "type": "value"
              }
            ]
          }
        },
        "gridPos": {"h": 6, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "CPU Usage %",
        "type": "gauge",
        "targets": [
          {
            "expr": "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "steps": [
                {"color": "green", "value": 0},
                {"color": "yellow", "value": 70},
                {"color": "red", "value": 90}
              ]
            }
          }
        },
        "gridPos": {"h": 6, "w": 6, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Memory Usage %",
        "type": "gauge",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "Memory Usage"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "steps": [
                {"color": "green", "value": 0},
                {"color": "yellow", "value": 70},
                {"color": "red", "value": 90}
              ]
            }
          }
        },
        "gridPos": {"h": 6, "w": 6, "x": 18, "y": 0}
      },
      {
        "id": 4,
        "title": "System Info",
        "type": "stat",
        "targets": [
          {
            "expr": "node_memory_MemTotal_bytes / 1024 / 1024 / 1024",
            "legendFormat": "RAM (GB)"
          },
          {
            "expr": "count by (instance) (node_cpu_seconds_total{mode=\"idle\"})",
            "legendFormat": "CPU Cores"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "decimals": 1
          }
        },
        "gridPos": {"h": 6, "w": 12, "x": 0, "y": 6}
      },
      {
        "id": 5,
        "title": "CPU Usage Timeline",
        "type": "timeseries",
        "targets": [
          {
            "expr": "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        },
        "gridPos": {"h": 6, "w": 12, "x": 12, "y": 6}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  },
  "overwrite": true
}' >/dev/null