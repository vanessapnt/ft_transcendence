#!/bin/bash

echo "🎮 Démonstration ELK - Transcendence"
echo "=================================="

echo "📊 1. Vérification des services ELK..."
curl -s http://localhost:9200 | jq .cluster_name
curl -s http://localhost:9600 | jq .status
curl -I http://localhost:5601

echo ""
echo "📝 2. Envoi de logs de démonstration..."

echo '{"message": "Démonstration ELK démarrée", "service": "transcendence", "action": "demo_start", "evaluator": "correcteur_42"}' | nc localhost 5001

echo '{"message": "Utilisateur connecté", "service": "backend", "action": "login", "user": "alice", "status": 200}' | nc localhost 5001

echo '{"message": "Partie de Pong lancée", "service": "backend", "action": "game_start", "game_id": "demo_123", "player1": "alice", "player2": "bob", "status": 200}' | nc localhost 5001

echo '{"message": "Requête API", "service": "nginx", "method": "GET", "path": "/api/leaderboard", "status": 200, "response_time": 0.15}' | nc localhost 5001

echo '{"message": "Erreur de connexion DB", "service": "backend", "action": "db_error", "error": "Connection timeout", "status": 500}' | nc localhost 5001

echo ""
echo "⏳ Attente de l'indexation..."
sleep 5

echo ""
echo "🔍 3. Vérification dans Elasticsearch..."
curl -s "localhost:9200/transcendence-logs-*/_count" | jq .count

echo ""
echo "✅ Démonstration terminée !"
echo "🌐 Accédez à Kibana : http://localhost:5601"
echo "📊 Index pattern à créer : transcendence-logs-*"