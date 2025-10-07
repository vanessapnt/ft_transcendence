#!/bin/bash

# Créer le répertoire SSL s'il n'existe pas
mkdir -p nginx/ssl

# Générer la clé privée (2048 bits pour la sécurité)
openssl genrsa -out nginx/ssl/server.key 2048

# Générer le certificat auto-signé
# -new : nouveau certificat
# -x509 : format de certificat standard
# -days 365 : valide pendant 1 an
# -subj : informations du certificat (évite les questions interactives)
openssl req -new -x509 -key nginx/ssl/server.key -out nginx/ssl/server.crt -days 365 \
    -subj "/C=FR/ST=Paris/L=Paris/O=42School/OU=Transcendence/CN=localhost"

# Sécuriser les fichiers
chmod 600 nginx/ssl/server.key  # Lecture seule pour le propriétaire
chmod 644 nginx/ssl/server.crt  # Lecture pour tous

echo "✅ Certificats SSL générés dans nginx/ssl/"