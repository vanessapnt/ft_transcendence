#!/bin/bash

# Script de configuration des Index Lifecycle Management (ILM) policies
# Gère la rétention, archivage et suppression automatique des logs

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://elasticsearch:9200}"

echo "⏳ Attente d'Elasticsearch... (max 120s)"
for i in {1..120}; do
  if curl -s "$ELASTICSEARCH_URL/_cluster/health" > /dev/null 2>&1; then
    echo "✅ Elasticsearch est disponible"
    break
  fi
  if [ $i -eq 120 ]; then
    echo "❌ Elasticsearch n'a pas répondu à temps"
    exit 1
  fi
  sleep 1
done

echo "🔧 Configuration des politiques de rétention..."

# Créer la policy ILM pour les logs (30 jours)
echo "📋 Création de la policy 'transcendence-logs-policy'..."
curl -s -X PUT "$ELASTICSEARCH_URL/_ilm/policy/transcendence-logs-policy" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": "transcendence-logs-policy",
    "phases": {
      "hot": {
        "min_age": "0d",
        "actions": {
          "rollover": {
            "max_primary_shard_size": "500mb",
            "max_age": "1d"
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "set_priority": {
            "priority": 50
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "cold": {
        "min_age": "14d",
        "actions": {
          "set_priority": {
            "priority": 0
          },
          "searchable_snapshot": {
            "snapshot_repository": "found-snapshots"
          }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }' 2>/dev/null

echo "✅ Politique de rétention créée"

# Créer un index template pour appliquer la policy automatiquement
echo "📋 Création du template pour appliquer la policy ILM..."
curl -s -X PUT "$ELASTICSEARCH_URL/_index_template/transcendence-logs-template" \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": ["transcendence-logs-*"],
    "template": {
      "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "index.lifecycle.name": "transcendence-logs-policy",
        "index.lifecycle.rollover_alias": "transcendence-logs-alias"
      },
      "mappings": {
        "properties": {
          "@timestamp": {
            "type": "date"
          },
          "service": {
            "type": "keyword"
          },
          "level": {
            "type": "keyword"
          },
          "message": {
            "type": "text"
          },
          "environment": {
            "type": "keyword"
          },
          "source_type": {
            "type": "keyword"
          }
        }
      }
    }
  }' 2>/dev/null

echo "✅ Template créé"
echo "📊 Configuration de rétention terminée"
echo "🔄 Les anciens logs seront supprimés automatiquement après 30 jours"
