#!/bin/bash

# Script de validation de la configuration ELK et Monitoring
# Vérifie que tous les services sont correctement configurés

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Validation de la configuration ELK et Monitoring${NC}"
echo "=================================================="

# Vérifications de fichiers
echo -e "\n📝 Vérification des fichiers..."

files_to_check=(
  "backend/logger.js"
  "backend/metrics.js"
  "elk/logstash/pipeline/logstash.conf"
  "elk/kibana/init-kibana.sh"
  "elk/elasticsearch/setup-ilm-policy.sh"
  "monitoring/prometheus/prometheus.yml"
  "monitoring/grafana/dashboards/system-metrics.json"
  "monitoring/grafana/dashboards/backend-metrics.json"
  "monitoring/grafana/datasources/prometheus.yaml"
)

missing_files=0
for file in "${files_to_check[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    echo -e "${GREEN}✅${NC} $file"
  else
    echo -e "${RED}❌${NC} $file (MANQUANT)"
    missing_files=$((missing_files + 1))
  fi
done

# Vérifications de configuration
echo -e "\n⚙️  Vérification des configurations..."

# Vérifier que logger est utilisé dans app.js
if grep -q "require('./logger')" "$PROJECT_ROOT/backend/app.js"; then
  echo -e "${GREEN}✅${NC} Logger importé dans app.js"
else
  echo -e "${RED}❌${NC} Logger pas importé dans app.js"
fi

# Vérifier que metrics est utilisé dans app.js
if grep -q "require('./metrics')" "$PROJECT_ROOT/backend/app.js"; then
  echo -e "${GREEN}✅${NC} Metrics importé dans app.js"
else
  echo -e "${RED}❌${NC} Metrics pas importé dans app.js"
fi

# Vérifier l'endpoint /metrics
if grep -q "app.get('/metrics'" "$PROJECT_ROOT/backend/app.js"; then
  echo -e "${GREEN}✅${NC} Endpoint /metrics configuré"
else
  echo -e "${RED}❌${NC} Endpoint /metrics pas trouvé"
fi

# Vérifier les dépendances
echo -e "\n📦 Vérification des dépendances npm..."

for package in "winston" "prom-client"; do
  if grep -q "\"$package\"" "$PROJECT_ROOT/backend/package.json"; then
    echo -e "${GREEN}✅${NC} Dépendance $package présente"
  else
    echo -e "${RED}❌${NC} Dépendance $package manquante"
  fi
done

# Résumé
echo -e "\n📊 Résumé:"
if [ $missing_files -eq 0 ]; then
  echo -e "${GREEN}✅ Tous les fichiers et configurations sont en place!${NC}"
  echo -e "\n✨ Prochaines étapes:"
  echo "1. Installer les dépendances: cd backend && npm install"
  echo "2. Lancer l'environnement: make dev ou make prod"
  echo "3. Accéder aux services:"
  echo "   - Kibana: http://localhost:5601"
  echo "   - Grafana: http://localhost:3001"
  echo "   - Prometheus: http://localhost:9090"
  exit 0
else
  echo -e "${RED}❌ $missing_files fichier(s) manquant(s)${NC}"
  exit 1
fi
