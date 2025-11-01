# Image de base Node.js pour API backend
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances Node.js
RUN npm ci

# Copier le code source
COPY . .

# Créer le dossier des avatars
RUN mkdir -p avatars

# Exposer le port
EXPOSE 8000

# Commande de démarrage
CMD ["npm", "start"]