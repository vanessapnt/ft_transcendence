#!/bin/bash
echo "🧪 Envoi de 40 logs de test vers votre stack ELK..."

# Vérifier que Logstash est accessible
if ! nc -z localhost 5001; then
    echo "❌ Logstash n'est pas accessible sur le port 5001"
    echo "Démarrez votre stack : docker-compose -f docker-compose.dev.yml up -d"
    exit 1
fi

echo "✅ Logstash accessible, envoi des logs..."

# Logs 1-10: Activité utilisateur
echo '{"message": "User login successful", "service": "backend", "status": 200, "user": "alice", "action": "login", "ip": "192.168.1.100"}' | nc localhost 5001
echo "📤 Log 1/40 envoyé"
sleep 0.5

echo '{"message": "User login successful", "service": "backend", "status": 200, "user": "bob", "action": "login", "ip": "192.168.1.101"}' | nc localhost 5001
echo "📤 Log 2/40 envoyé"
sleep 0.5

echo '{"message": "User registration", "service": "backend", "status": 201, "user": "charlie", "action": "register", "email": "charlie@42.fr"}' | nc localhost 5001
echo "📤 Log 3/40 envoyé"
sleep 0.5

echo '{"message": "Profile view", "service": "backend", "status": 200, "user": "alice", "action": "profile_view", "profile_owner": "bob"}' | nc localhost 5001
echo "📤 Log 4/40 envoyé"
sleep 0.5

echo '{"message": "Password change", "service": "backend", "status": 200, "user": "bob", "action": "password_change"}' | nc localhost 5001
echo "📤 Log 5/40 envoyé"
sleep 0.5

echo '{"message": "User logout", "service": "backend", "status": 200, "user": "charlie", "action": "logout", "session_duration": 1800}' | nc localhost 5001
echo "📤 Log 6/40 envoyé"
sleep 0.5

echo '{"message": "Login failed", "service": "backend", "status": 401, "user": "unknown", "action": "login_failed", "reason": "Invalid password", "ip": "192.168.1.200"}' | nc localhost 5001
echo "📤 Log 7/40 envoyé"
sleep 0.5

echo '{"message": "Account locked", "service": "backend", "status": 423, "user": "alice", "action": "account_locked", "reason": "Too many failed attempts"}' | nc localhost 5001
echo "📤 Log 8/40 envoyé"
sleep 0.5

echo '{"message": "User settings updated", "service": "backend", "status": 200, "user": "bob", "action": "settings_update", "changed_fields": ["theme", "language"]}' | nc localhost 5001
echo "📤 Log 9/40 envoyé"
sleep 0.5

echo '{"message": "Avatar upload", "service": "backend", "status": 200, "user": "alice", "action": "avatar_upload", "file_size": 2048}' | nc localhost 5001
echo "📤 Log 10/40 envoyé"
sleep 0.5

# Logs 11-20: Activité de jeu Pong
echo '{"message": "Game lobby joined", "service": "frontend", "status": 200, "user": "alice", "action": "lobby_join", "players_count": 3}' | nc localhost 5001
echo "📤 Log 11/40 envoyé"
sleep 0.5

echo '{"message": "Pong game created", "service": "backend", "status": 201, "action": "game_create", "game_id": "pong_001", "player1": "alice", "player2": "bob", "game_type": "pong"}' | nc localhost 5001
echo "📤 Log 12/40 envoyé"
sleep 0.5

echo '{"message": "Game started", "service": "backend", "status": 200, "action": "game_start", "game_id": "pong_001", "player1": "alice", "player2": "bob"}' | nc localhost 5001
echo "📤 Log 13/40 envoyé"
sleep 0.5

echo '{"message": "Score update", "service": "backend", "status": 200, "action": "score_update", "game_id": "pong_001", "score": "3-2", "scorer": "alice"}' | nc localhost 5001
echo "📤 Log 14/40 envoyé"
sleep 0.5

echo '{"message": "Game finished", "service": "backend", "status": 200, "action": "game_end", "game_id": "pong_001", "winner": "alice", "score": "11-7", "duration": 180}' | nc localhost 5001
echo "📤 Log 15/40 envoyé"
sleep 0.5

echo '{"message": "Tournament created", "service": "backend", "status": 201, "action": "tournament_create", "tournament_id": "tour_001", "creator": "bob", "participants": 8}' | nc localhost 5001
echo "📤 Log 16/40 envoyé"
sleep 0.5

echo '{"message": "Tournament join", "service": "backend", "status": 200, "action": "tournament_join", "tournament_id": "tour_001", "user": "alice"}' | nc localhost 5001
echo "📤 Log 17/40 envoyé"
sleep 0.5

echo '{"message": "Match scheduled", "service": "backend", "status": 200, "action": "match_schedule", "tournament_id": "tour_001", "match_id": "match_001", "player1": "alice", "player2": "charlie"}' | nc localhost 5001
echo "📤 Log 18/40 envoyé"
sleep 0.5

echo '{"message": "Leaderboard updated", "service": "backend", "status": 200, "action": "leaderboard_update", "user": "alice", "new_rank": 15, "points": 2400}' | nc localhost 5001
echo "📤 Log 19/40 envoyé"
sleep 0.5

echo '{"message": "Achievement unlocked", "service": "backend", "status": 200, "action": "achievement", "user": "alice", "achievement": "First Victory", "points": 100}' | nc localhost 5001
echo "📤 Log 20/40 envoyé"
sleep 0.5

# Logs 21-30: Activité Nginx
echo '{"message": "API request", "service": "nginx", "status": 200, "method": "GET", "path": "/api/user/profile", "response_time": 0.05, "user_agent": "Mozilla/5.0"}' | nc localhost 5001
echo "📤 Log 21/40 envoyé"
sleep 0.5

echo '{"message": "Static file served", "service": "nginx", "status": 200, "method": "GET", "path": "/assets/pong.js", "response_time": 0.02, "file_size": 45620}' | nc localhost 5001
echo "📤 Log 22/40 envoyé"
sleep 0.5

echo '{"message": "CSS file served", "service": "nginx", "status": 200, "method": "GET", "path": "/assets/style.css", "response_time": 0.01, "file_size": 12800}' | nc localhost 5001
echo "📤 Log 23/40 envoyé"
sleep 0.5

echo '{"message": "Image served", "service": "nginx", "status": 200, "method": "GET", "path": "/images/avatar/alice.jpg", "response_time": 0.03, "file_size": 8192}' | nc localhost 5001
echo "📤 Log 24/40 envoyé"
sleep 0.5

echo '{"message": "API POST request", "service": "nginx", "status": 201, "method": "POST", "path": "/api/game/create", "response_time": 0.15, "content_length": 256}' | nc localhost 5001
echo "📤 Log 25/40 envoyé"
sleep 0.5

echo '{"message": "WebSocket upgrade", "service": "nginx", "status": 101, "method": "GET", "path": "/ws/game", "response_time": 0.001, "connection": "upgrade"}' | nc localhost 5001
echo "📤 Log 26/40 envoyé"
sleep 0.5

echo '{"message": "File not found", "service": "nginx", "status": 404, "method": "GET", "path": "/missing.html", "response_time": 0.001}' | nc localhost 5001
echo "📤 Log 27/40 envoyé"
sleep 0.5

echo '{"message": "Slow request", "service": "nginx", "status": 200, "method": "GET", "path": "/api/leaderboard", "response_time": 2.5, "slow": true}' | nc localhost 5001
echo "📤 Log 28/40 envoyé"
sleep 0.5

echo '{"message": "Rate limit exceeded", "service": "nginx", "status": 429, "method": "POST", "path": "/api/login", "response_time": 0.001, "client_ip": "192.168.1.200"}' | nc localhost 5001
echo "📤 Log 29/40 envoyé"
sleep 0.5

echo '{"message": "Health check", "service": "nginx", "status": 200, "method": "GET", "path": "/health", "response_time": 0.001, "uptime": 86400}' | nc localhost 5001
echo "📤 Log 30/40 envoyé"
sleep 0.5

# Logs 31-40: Erreurs et événements système
echo '{"message": "Database connection error", "service": "backend", "status": 500, "error": "Connection timeout", "action": "db_connect", "database": "transcendence_db"}' | nc localhost 5001
echo "📤 Log 31/40 envoyé"
sleep 0.5

echo '{"message": "Redis cache miss", "service": "backend", "status": 200, "action": "cache_miss", "key": "user_profile_alice", "fallback": "database"}' | nc localhost 5001
echo "📤 Log 32/40 envoyé"
sleep 0.5

echo '{"message": "API rate limit warning", "service": "backend", "status": 429, "user": "bob", "action": "rate_limit", "requests_per_minute": 120}' | nc localhost 5001
echo "📤 Log 33/40 envoyé"
sleep 0.5

echo '{"message": "Memory usage high", "service": "backend", "status": 200, "action": "monitoring", "memory_usage": "85%", "alert": "warning"}' | nc localhost 5001
echo "📤 Log 34/40 envoyé"
sleep 0.5

echo '{"message": "SSL certificate check", "service": "nginx", "status": 200, "action": "ssl_check", "expires_in_days": 45, "domain": "transcendence.42.fr"}' | nc localhost 5001
echo "📤 Log 35/40 envoyé"
sleep 0.5

echo '{"message": "Backup completed", "service": "backend", "status": 200, "action": "backup", "type": "database", "size": "512MB", "duration": 45}' | nc localhost 5001
echo "📤 Log 36/40 envoyé"
sleep 0.5

echo '{"message": "Security scan", "service": "backend", "status": 200, "action": "security_scan", "vulnerabilities": 0, "scan_duration": 120}' | nc localhost 5001
echo "📤 Log 37/40 envoyé"
sleep 0.5

echo '{"message": "Frontend build", "service": "frontend", "status": 200, "action": "build", "build_time": 35, "bundle_size": "2.4MB", "chunks": 15}' | nc localhost 5001
echo "📤 Log 38/40 envoyé"
sleep 0.5

echo '{"message": "WebSocket disconnection", "service": "frontend", "status": 500, "action": "websocket_error", "user": "alice", "error": "Connection lost", "reconnect_attempts": 3}' | nc localhost 5001
echo "📤 Log 39/40 envoyé"
sleep 0.5

echo '{"message": "System health check", "service": "transcendence", "status": 200, "action": "health_check", "cpu_usage": "45%", "memory_usage": "60%", "disk_usage": "30%", "active_users": 15}' | nc localhost 5001
echo "📤 Log 40/40 envoyé"

echo ""
echo "🎉 40 logs de test envoyés avec succès !"
echo ""
echo "📊 Vérification dans Elasticsearch :"
echo "curl \"localhost:9200/transcendence-logs-*/_count?pretty\""
echo ""
echo "🌐 Vérification dans Kibana :"
echo "http://localhost:5601"
echo ""
echo "💡 Types de logs envoyés :"
echo "  • 10 logs d'activité utilisateur (login, registration, profile)"
echo "  • 10 logs de jeu Pong (games, tournaments, scores)"
echo "  • 10 logs Nginx (requests, static files, errors)"
echo "  • 10 logs système (erreurs, monitoring, maintenance)"
echo ""
echo "🔍 Attendez 10 secondes puis vérifiez dans Kibana !"