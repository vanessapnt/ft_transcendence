#!/bin/sh
# Script pour corriger automatiquement les permissions critiques pour Docker Compose ELK

set -e

# Corrige les droits sur le fichier logstash.yml
chmod 644 elk/logstash/config/logstash.yml
chown $(id -u):$(id -g) elk/logstash/config/logstash.yml

# Corrige les droits sur le script filebeat-entrypoint.sh (au cas où)
chmod +x elk/filebeat/filebeat-entrypoint.sh
chown $(id -u):$(id -g) elk/filebeat/filebeat-entrypoint.sh

echo "✅ Permissions corrigées pour Logstash et Filebeat."
