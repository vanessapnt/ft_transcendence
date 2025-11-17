# Image de base Node.js pour API backend (Debian au lieu d'Alpine pour better-sqlite3)
FROM node:18-slim

# Installer les outils de build pour les modules natifs
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances Node.js (sans lock pour forcer recompilation)
RUN npm install

# Copier le code source
COPY . .

# Créer le dossier des avatars
RUN mkdir -p avatars

# Exposer le port
EXPOSE 8000

# Commande de démarrage
CMD ["npm", "start"]