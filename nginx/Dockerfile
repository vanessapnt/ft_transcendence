FROM nginx:alpine

# Supprimer la configuration par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Copier la configuration principale (nginx.conf)
COPY nginx.conf /etc/nginx/nginx.conf

# Ne PAS copier conf.d/ ici !
# Les fichiers de conf seront montés par docker-compose selon l'environnement

# Créer les dossiers nécessaires
RUN mkdir -p /etc/nginx/ssl

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]