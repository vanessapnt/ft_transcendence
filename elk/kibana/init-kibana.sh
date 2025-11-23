#!/bin/bash

# Script d'initialisation Kibana - Crée l'index pattern

KIBANA_URL="${KIBANA_URL:-http://kibana:5601}"
INDEX_PATTERN="transcendence-logs-*"
PATTERN_ID="transcendence-logs"

echo "⏳ Attente de Kibana... (max 60s)"
RETRY=0
while [ $RETRY -lt 60 ]; do
  STATUS=$(curl -s "$KIBANA_URL/api/status" 2>/dev/null)
  if echo "$STATUS" | grep -q "green"; then
    echo "✅ Kibana est prêt"
    break
  fi
  RETRY=$((RETRY + 1))
  sleep 1
done

if [ $RETRY -eq 60 ]; then
  echo "❌ Kibana timeout"
  exit 1
fi

echo "🔧 Création de l'index pattern..."

# Créer l'index pattern
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$KIBANA_URL/api/saved_objects/index-pattern/$PATTERN_ID" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "'$INDEX_PATTERN'",
      "timeFieldName": "@timestamp"
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Index pattern créé avec succès"
  
  # Définir comme default
  echo "⚙️  Configuration comme index pattern par défaut..."
  curl -s -X POST "$KIBANA_URL/api/kibana/settings" \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    -d '{"changes": {"defaultIndex": "'$PATTERN_ID'"}}' > /dev/null
  echo "✅ Index pattern défini par défaut"
else
  echo "⚠️  Code HTTP: $HTTP_CODE"
  echo "   Réponse: $BODY"
fi

echo "✅ Initialisation Kibana terminée!"
echo "🎯 Définition comme pattern par défaut..."
curl -s -X POST "$KIBANA_URL/api/kibana/settings" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{"changes":{"defaultIndex":"'$INDEX_PATTERN'"}}' > /dev/null 2>&1 && echo "✅ Pattern par défaut défini"

echo ""
echo "✅ Initialisation terminée !"
echo "📊 Kibana: $KIBANA_URL"
echo "🔍 Pattern: $INDEX_PATTERN"

