# Makefile pour le projet transcendence

.PHONY: dev dev-front dev-frontend-only stop build clean prod help

# Commandes par défaut
help:
	@echo "Commandes disponibles:"
	@echo "  make dev               # Lancer en mode développement"
	@echo "  make dev-front         # Lancer seulement frontend + nginx"
	@echo "  make dev-frontend-only # Lancer seulement le frontend"
	@echo "  make prod              # Lancer en mode production"
	@echo "  make stop              # Arrêter tous les services"
	@echo "  make build             # Rebuilder les images"
	@echo "  make clean             # Nettoyer tout"

# Mode développement
dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Frontend + nginx seulement
dev-front:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up frontend nginx

# Frontend seulement (sans nginx)
dev-frontend-only:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up frontend

# Mode production
prod:
	docker-compose up -d

# Arrêter les services
stop:
	docker-compose down

# Rebuilder les images
build:
	docker-compose build --no-cache

# Nettoyer tout (images, containers, volumes)
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f