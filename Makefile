# Makefile pour le projet transcendence

.PHONY: dev prod stop build clean logs logs-prod help
.ONESHELL:

# Commandes par défaut
help:
	@echo "╔════════════════════════════════════════════════════════════╗"
	@echo "║        🎮 Transcendence - Commandes disponibles 🎮          ║"
	@echo "╠════════════════════════════════════════════════════════════╣"
	@echo "║  make dev              → Mode développement              ║"
	@echo "║  make prod             → Lancer en mode production       ║"
	@echo "║  make stop             → Arrêter les services            ║"
	@echo "║  make clean            → Nettoyer tout (BD + volumes)    ║"
	@echo "║  make logs             → Afficher les logs               ║"
	@echo "╚════════════════════════════════════════════════════════════╝"

# Mode développement
dev-verbose: ## 🚀 Lance l'environnement de développement avec logs détaillés
	@echo "🔧 Démarrage de l'environnement de développement (mode verbose)..."
	@VERBOSE=1 docker compose -f docker-compose.dev.yml up --build

dev: ## 🚀 Lance l'environnement de développement avec monitoring
	@echo "🔧 Démarrage de l'environnement de développement..."
	@sh -lc '\
	docker compose -f docker-compose.dev.yml up -d --build &\
DC_PID=$$!;\
i=0;\
echo "";\
echo "⏳ Démarrage des services...";\
while kill -0 $$DC_PID 2>/dev/null; do\
  case $$((i % 3)) in\
    0) c="|" ;;\
    1) c="/" ;;\
    2) c="-" ;;\
  esac;\
  printf "\\r  %s " "$$c" 2>/dev/null || true;\
  i=$$((i+1));\
  sleep 0.2;\
done;\
wait $$DC_PID || true'
	@echo ""
	@./scripts/dev-startup.sh

# Mode production
prod:
	@echo "🚀 Démarrage en mode production..."
	@bash ./scripts/fix-elk-perms.sh
	@bash ./scripts/ensure-ssl.sh
	@docker compose -f docker-compose.prod.yml up -d --build
	@echo ""
	@bash ./scripts/prod-startup.sh

# # Logs production
# logs-prod:
# 	docker compose -f docker-compose.prod.yml logs -f

# Build production
build-prod:
	@echo "🔨 Reconstruction des images (prod)..."
	docker compose -f docker-compose.prod.yml build --no-cache

# Arrêter les services (dev et prod)
stop:
	@echo "🛑 Arrêt des services..."
	-docker compose -f docker-compose.dev.yml down 2>/dev/null
	-docker compose -f docker-compose.prod.yml down 2>/dev/null

# Supprimer la base de données (dev)
reset-db: ## 🗑️ Supprime la base de données et relance le dev
	@echo "🗑️ Suppression de la base de données..."
	@docker compose -f docker-compose.dev.yml down -v
	@rm -f backend/data/transcendence.db
	@rm -rf backend/data/*
	@mkdir -p backend/avatars
	@if [ -f backend/avatars/default_avatar.png ]; then mv backend/avatars/default_avatar.png /tmp/default_avatar_backup.png; fi
	@rm -f backend/avatars/*
	@if [ -f /tmp/default_avatar_backup.png ]; then mv /tmp/default_avatar_backup.png backend/avatars/default_avatar.png; fi
	@echo "🔄 Relance du mode développement..."
	@make dev

# Rebuilder les images (dev)
build:
	@echo "🔨 Reconstruction des images (dev)..."
	docker compose -f docker-compose.dev.yml build --no-cache

# Nettoyer tout (dev et prod)
clean:
	@echo "🧹 Nettoyage complet..."
	@echo "🛑 Arrêt forcé de tous les conteneurs du projet..."
	-docker compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null
	-docker compose -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null
	@echo "🗑️ Suppression des conteneurs spécifiques du projet..."
	-docker rm -f elasticsearch-prod elasticsearch-dev kibana-prod kibana-dev logstash-prod logstash-dev filebeat-prod filebeat-dev prometheus-prod prometheus-dev grafana-prod grafana-dev nginx-prod nginx-dev backend-prod backend-dev frontend-prod frontend-dev node-exporter-prod node-exporter-dev 2>/dev/null || true
	@echo "🗑️ Suppression de tous les conteneurs restants du projet..."
	-docker ps -aq --filter "name=elasticsearch" --filter "name=kibana" --filter "name=logstash" --filter "name=filebeat" --filter "name=prometheus" --filter "name=grafana" --filter "name=nginx" --filter "name=backend" --filter "name=frontend" --filter "name=node-exporter" --filter "name=testtrans" | xargs -r docker rm -f 2>/dev/null || true
	@echo "🗑️ Suppression de la base de données et des données stockées..."
	@rm -f backend/data/transcendence.db
	@rm -rf backend/data/*
	@echo "🗑️ Suppression des avatars (sauf default)..."
	@if [ -f backend/avatars/default_avatar.png ]; then mv backend/avatars/default_avatar.png /tmp/default_avatar_backup.png; fi
	@rm -f backend/avatars/*
	@if [ -f /tmp/default_avatar_backup.png ]; then mv /tmp/default_avatar_backup.png backend/avatars/default_avatar.png; fi
	@echo "🧹 Nettoyage du système Docker..."
	docker system prune -f
	@echo "✨ Nettoyage terminé !"

# Afficher les logs (dev)
logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Serve the `frontend/pong` folder directly so index is available at /
.PHONY: serve-pong
serve-pong: ## 🕹️ Serve `frontend/pong` on port 3000 (open http://localhost:3000/)
	@echo "🟢 Serving frontend/pong at http://localhost:3000 (Ctrl+C to stop)"
	@cd frontend/pong && python3 -m http.server 3000

.PHONY: serve-pong-dev
serve-pong-dev:
	@echo "🟢 Starting TypeScript watcher and live-reload server on http://localhost:3000"
	@sh -c '\
	cd frontend; \
	# install dependencies if missing (first run)\
	if [ ! -d node_modules ]; then \
		echo "⬇️  node_modules not found — running npm install in frontend..."; \
		npm install; \
	fi; \
	npx tsc > /dev/null 2>&1; \
	# start tsc in background, then start live-server in foreground; when live-server exits we kill tsc\
	npx tsc -w > /dev/null 2>&1 & TSC_PID=$$!; \
	sleep 1; \
	npx live-server pong --port=3000 --quiet || true; \
	kill $$TSC_PID 2>/dev/null || true'

# Afficher tous les liens disponibles
links:
	@echo "╔═══════════════════════════════════════════════════════════╗"
	@echo "║                   📊 SERVICES DISPONIBLES                ║"
	@echo "╠═══════════════════════════════════════════════════════════╣"
	@echo "║  🎮 Jeu Pong:      http://localhost:8080                 ║"
	@echo "║  📊 Dashboard:     http://localhost:3000/dashboard.html  ║"
	@echo "║  📈 Kibana (ELK):  http://localhost:5601                 ║"
	@echo "║  📈 Grafana:       http://localhost:3001                 ║"
	@echo "║  🔌 API Backend:   http://localhost:8000/api/health      ║"
	@echo "║  🔍 Elasticsearch: http://localhost:9200/_cat/health?v   ║"
	@echo "╚═════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "💡 Tip: Cmd+Clic (macOS) ou Ctrl+Clic (Linux/Windows) pour ouvrir"

# Nettoyer les fichiers JS générés localement
clean-js:
	@echo "🧹 Nettoyage des fichiers JS compilés..."
	find ./frontend/pong -name "*.js" -not -name "first_pong.js" -delete
	find ./frontend/pong -name "*.js.map" -delete
	find ./frontend/pong -name "*.d.ts" -delete
	@echo "✨ Fichiers JS nettoyés !"