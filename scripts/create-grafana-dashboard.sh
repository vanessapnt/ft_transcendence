#!/bin/bash

echo "🎨 Création du dashboard Transcendence System Monitoring..."

# Attendre que Grafana soit prêt
echo "⏳ Vérification de Grafana..."
while ! curl -f http://localhost:3001/api/health >/dev/null 2>&1; do
    echo "Attente de Grafana..."
    sleep 5
done

echo "✅ Grafana prêt, création du dashboard..."

# Créer le dashboard via API
curl -X POST http://admin:transcendence123@localhost:3001/api/dashboards/db \
-H "Content-Type: application/json" \
-d '{
  "dashboard": {
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
}'

if [ $? -eq 0 ]; then
    echo "✅ Dashboard créé avec succès !"
    echo ""
    echo "🌐 Accès au dashboard :"
    echo "   URL: http://localhost:3001"
    echo "   Login: admin / transcendence123"
    echo "   Dashboard: 🎮 Transcendence System Monitoring"
    echo ""
    echo "📊 Panels créés :"
    echo "   • Services Status (4 services)"
    echo "   • CPU Usage % (gauge)"
    echo "   • Memory Usage % (gauge)" 
    echo "   • System Info (RAM + CPU cores)"
    echo "   • CPU Timeline (graphique temps réel)"
else
    echo "❌ Erreur lors de la création du dashboard"
fi