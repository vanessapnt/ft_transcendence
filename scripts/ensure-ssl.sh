#!/bin/bash
# Ce script vérifie la présence des certificats SSL et les génère si besoin
CRT_PATH="$(dirname "$0")/../nginx/ssl/server.crt"
KEY_PATH="$(dirname "$0")/../nginx/ssl/server.key"
GEN_SCRIPT="$(dirname "$0")/generate-ssl.sh"

if [ ! -f "$CRT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
  echo "[ensure-ssl.sh] Certificat SSL manquant, génération..."
  bash "$GEN_SCRIPT"
else
  echo "[ensure-ssl.sh] Certificat SSL déjà présent."
fi
