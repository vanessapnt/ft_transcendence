# Image de base nginx alpine (plus légère)
FROM nginx:alpine

# Supprimer la configuration par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Copier la configuration personnalisée
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Créer les dossiers nécessaires
RUN mkdir -p /etc/nginx/ssl

# Exposer les ports HTTP et HTTPS
EXPOSE 80 443

# Démarrer nginx en mode foreground
CMD ["nginx", "-g", "daemon off;"]