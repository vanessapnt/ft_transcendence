# Multi-stage build : TypeScript compilation puis nginx
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de configuration TypeScript
COPY package*.json tsconfig.json ./

# Installer les dépendances (seulement si package.json existe)
RUN if [ -f package.json ]; then npm install; fi

# Copier le code source TypeScript (remplacé par pong/)
COPY pong/ ./pong/

# Compiler TypeScript (si présent)
RUN if [ -d pong ] && [ "$(ls -A pong)" ]; then npm run build || true; fi

# Stage final avec nginx
FROM nginx:alpine

# Supprimer les fichiers par défaut de nginx
RUN rm -rf /usr/share/nginx/html/*

# Copier les fichiers du jeu Pong (toujours présents)
COPY pong/* /usr/share/nginx/html/

# Créer une configuration nginx simple
RUN echo 'server { \
    listen 3000; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

# Exposer le port 3000
EXPOSE 3000

# Modifier la configuration pour écouter sur le port 3000
RUN sed -i 's/listen.*80;/listen 3000;/' /etc/nginx/conf.d/default.conf

# Démarrer nginx
CMD ["nginx", "-g", "daemon off;"]