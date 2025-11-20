#!/bin/bash

echo "🚀 Déploiement en production avec HTTPS..."

# Vérification et génération des certificats
if [ ! -f "nginx/ssl/server.crt" ]; then
    echo "📄 Génération des certificats SSL..."
    ./scripts/generate-ssl.sh
else
    echo "✅ Certificats SSL déjà présents"
fi

# Arrêt propre des services
echo "🛑 Arrêt des services..."
docker compose -f docker-compose.prod.yml down

# Reconstruction et démarrage
echo "🏗️  Construction et lancement..."
docker compose -f docker-compose.prod.yml up --build -d

echo "✅ Déploiement terminé !"
echo "🌐 Testez: curl -I http://localhost (doit rediriger)"
echo "🔒 Testez: curl -I -k https://localhost (doit fonctionner)"