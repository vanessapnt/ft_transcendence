# Makefile pour le projet transcendence

.PHONY: dev dev-front dev-frontend-only stop build clean prod help logs

# Commandes par défaut
help:
	@echo "╔═══════════════════════════════════════════════════════════╗"
	@echo "║        🎮 Transcendence - Commandes disponibles 🎮       ║"
	@echo "╠═══════════════════════════════════════════════════════════╣"
	@echo "║  make dev               → Mode développement (tout)       ║"
	@echo "║  make dev-front         → Frontend + nginx seulement      ║"
	@echo "║  make dev-frontend-only → Frontend uniquement (port 3000) ║"
	@echo "║  make prod              → Mode production                 ║"
	@echo "║  make stop              → Arrêter tous les services       ║"
	@echo "║  make build             → Rebuilder les images            ║"
	@echo "║  make clean             → Nettoyer tout                   ║"
	@echo "║  make logs              → Afficher les logs               ║"
	@echo "╚═══════════════════════════════════════════════════════════╝"

# Mode développement (avec hot-reload TypeScript)
dev:
	@echo "🚀 Démarrage en mode développement..."
	@echo "📝 TypeScript sera compilé automatiquement"
	@echo "🌐 Frontend disponible sur http://localhost:3000"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Frontend + nginx seulement
dev-front:
	@echo "🎨 Démarrage du frontend + nginx..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up frontend nginx

# Frontend seulement (sans nginx) - accès direct sur port 3000
dev-frontend-only:
	@echo "🎮 Démarrage du frontend uniquement..."
	@echo "🌐 Accès direct : http://localhost:3000"
	@echo "📝 TypeScript auto-compile activé"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up frontend

# Mode production
prod:
	@echo "🚀 Démarrage en mode production..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Arrêter les services
stop:
	@echo "🛑 Arrêt des services..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# Rebuilder les images
build:
	@echo "🔨 Reconstruction des images..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache

# Nettoyer tout (images, containers, volumes)
clean:
	@echo "🧹 Nettoyage complet..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v --remove-orphans
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml down -v --remove-orphans
	docker system prune -f
	@echo "✨ Nettoyage terminé !"

# Afficher les logs
logs:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Nettoyer les fichiers JS générés localement
clean-js:
	@echo "🧹 Nettoyage des fichiers JS compilés..."
	find ./frontend/pong -name "*.js" -not -name "first_pong.js" -delete
	find ./frontend/pong -name "*.js.map" -delete
	find ./frontend/pong -name "*.d.ts" -delete
	@echo "✨ Fichiers JS nettoyés !"