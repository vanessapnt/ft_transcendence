# Makefile pour le projet transcendence

.PHONY: dev prod stop build clean logs help

# Commandes par défaut
help:
	@echo "╔═══════════════════════════════════════════════════╗"
	@echo "║     🎮 Transcendence - Commandes disponibles 🎮  ║"
	@echo "╠═══════════════════════════════════════════════════╣"
	@echo "║  make dev         → Mode développement            ║"
	@echo "║  make dev-verbose → Mode dev avec logs détaillés  ║"
	@echo "║  make prod        → Lancer en mode production     ║"
	@echo "║  make stop        → Arrêter les services          ║"
	@echo "║  make build       → Rebuilder les images          ║"
	@echo "║  make clean       → Nettoyer tout (volumes inclus)║"
	@echo "║  make logs        → Afficher les logs             ║"
	@echo "║  make links       → Afficher tous les liens       ║"
	@echo "╚═══════════════════════════════════════════════════╝"

# Mode développement
dev-verbose: ## 🚀 Lance l'environnement de développement avec logs détaillés
	@echo "🔧 Démarrage de l'environnement de développement (mode verbose)..."
	@VERBOSE=1 docker-compose -f docker-compose.dev.yml up --build

dev: ## 🚀 Lance l'environnement de développement avec monitoring
	@echo "🔧 Démarrage de l'environnement de développement..."
	@docker-compose -f docker-compose.dev.yml up -d --build > /dev/null 2>&1
	@echo ""
	@echo "⏳ Initialisation en cours..."
	@./scripts/dev-startup.sh

# Mode production
prod:
	@echo "🚀 Démarrage en mode production..."
	docker-compose -f docker-compose.prod.yml up -d

# Arrêter les services
stop:
	@echo "🛑 Arrêt des services..."
	-docker-compose -f docker-compose.dev.yml down 2>/dev/null
	-docker-compose -f docker-compose.prod.yml down 2>/dev/null

# Rebuilder les images
build:
	@echo "🔨 Reconstruction des images..."
	docker-compose -f docker-compose.dev.yml build --no-cache

# Nettoyer tout
clean:
	@echo "🧹 Nettoyage complet..."
	-docker-compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null
	-docker-compose -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null
	docker system prune -f
	@echo "✨ Nettoyage terminé !"

# Afficher les logs
logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Afficher tous les liens disponibles
links:
	@echo "╔═══════════════════════════════════════════════════════════╗"
	@echo "║                   📊 SERVICES DISPONIBLES                ║"
	@echo "╠═══════════════════════════════════════════════════════════╣"
	@echo "║  🎮 Jeu Pong:      http://localhost:3000                 ║"
	@echo "║  📊 Dashboard:     http://localhost:3000/dashboard.html  ║"
	@echo "║  📈 Kibana (ELK):  http://localhost:5601                 ║"
	@echo "║  📈 Grafana:       http://localhost:3001                 ║"
	@echo "║  🔌 API Backend:   http://localhost:8000/api/health      ║"
	@echo "║  🔍 Elasticsearch: http://localhost:9200/_cat/health?v   ║"
	@echo "╚═══════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "💡 Tip: Cmd+Clic (macOS) ou Ctrl+Clic (Linux/Windows) pour ouvrir"

# Nettoyer les fichiers JS générés localement
clean-js:
	@echo "🧹 Nettoyage des fichiers JS compilés..."
	find ./frontend/pong -name "*.js" -not -name "first_pong.js" -delete
	find ./frontend/pong -name "*.js.map" -delete
	find ./frontend/pong -name "*.d.ts" -delete
	@echo "✨ Fichiers JS nettoyés !"