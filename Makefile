# Makefile pour le projet transcendence

.PHONY: dev prod stop build clean logs help

# Commandes par défaut
help:
	@echo "╔═══════════════════════════════════════════════════╗"
	@echo "║     🎮 Transcendence - Commandes disponibles 🎮  ║"
	@echo "╠═══════════════════════════════════════════════════╣"
	@echo "║  make dev    → Lancer en mode développement      ║"
	@echo "║  make prod   → Lancer en mode production         ║"
	@echo "║  make stop   → Arrêter les services              ║"
	@echo "║  make build  → Rebuilder les images              ║"
	@echo "║  make clean  → Nettoyer tout (volumes inclus)    ║"
	@echo "║  make logs   → Afficher les logs                 ║"
	@echo "╚═══════════════════════════════════════════════════╝"

# Mode développement
dev:
	@echo "🚀 Démarrage en mode développement..."
	docker-compose -f docker-compose.dev.yml up

# Mode développement avec initialisation Kibana
dev-init:
	@echo "🚀 Démarrage en mode développement avec init Kibana..."
	@echo "🛑 Arrêt des services existants..."
	-docker-compose -f docker-compose.dev.yml down 2>/dev/null
	@echo "🔄 Démarrage de l'environnement complet..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "✅ Environnement prêt ! Dashboard Kibana en cours d'initialisation..."
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "🌐 Backend: http://localhost:5000"
	@echo "📊 Kibana: http://localhost:5601"

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

# Nettoyer les fichiers JS générés localement
clean-js:
	@echo "🧹 Nettoyage des fichiers JS compilés..."
	find ./frontend/pong -name "*.js" -not -name "first_pong.js" -delete
	find ./frontend/pong -name "*.js.map" -delete
	find ./frontend/pong -name "*.d.ts" -delete
	@echo "✨ Fichiers JS nettoyés !"