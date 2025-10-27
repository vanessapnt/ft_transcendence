# Frontend Transcendence - TypeScript

## Commandes de développement

```bash
# Installer les dépendances
npm install

# Compiler TypeScript
npm run build

# Compiler en mode watch (auto-recompile)
npm run dev

# Nettoyer les fichiers compilés
npm run clean
```

## Docker

```bash
# Development (avec hot reload)
docker-compose -f docker-compose.dev.yml up frontend

# Production
docker-compose up frontend
```

## Utilisation

- **Jeu Pong existant** : Reste en JavaScript dans le dossier `pong/`
- **Nouveau code** : Écrire en TypeScript dans `src/`
- **Compilation** : TypeScript se compile automatiquement vers `dist/`