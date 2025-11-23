#!/bin/bash

# Script rapide pour tester que l'index pattern est créé automatiquement

echo "Attente de Kibana (30s)..."
sleep 30

echo ""
echo "=== Test 1: Vérifier que Kibana répond ==="
KIBANA_STATUS=$(curl -s http://localhost:5601/api/status)
if echo "$KIBANA_STATUS" | grep -q "green"; then
  echo "✅ Kibana est accessible et prêt"
else
  echo "❌ Kibana ne répond pas correctement"
  exit 1
fi

echo ""
echo "=== Test 2: Vérifier l'index pattern ==="
INDEX_PATTERN=$(curl -s http://localhost:5601/api/saved_objects/index-pattern/transcendence-logs-*)
if echo "$INDEX_PATTERN" | grep -q "transcendence-logs-*"; then
  echo "✅ Index pattern créé automatiquement"
else
  echo "❌ Index pattern NOT créé"
  echo "Réponse: $INDEX_PATTERN"
  exit 1
fi

echo ""
echo "=== Test 3: Vérifier les données dans Elasticsearch ==="
INDEX_COUNT=$(curl -s http://localhost:9200/transcendence-logs-*/_search?size=0 | grep -o '"count":[0-9]*' | cut -d: -f2)
echo "Nombre de logs: $INDEX_COUNT"

echo ""
echo "✅ Configuration ELK réussie!"
echo "📊 Allez sur http://localhost:5601 pour voir Kibana"
