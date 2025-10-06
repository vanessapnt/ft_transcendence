# Image de base nginx pour servir des fichiers statiques
FROM nginx:alpine

# Supprimer les fichiers par défaut de nginx
RUN rm -rf /usr/share/nginx/html/*

# Copier directement les fichiers du jeu Pong dans le répertoire racine
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