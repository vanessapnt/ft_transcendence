
#!/bin/bash

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

print_header() {
	echo ""
	echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
	echo -e "${BOLD}${BLUE}║                                                              ║${NC}"
	echo -e "${BOLD}${BLUE}║                 🚀 TRANSCENDENCE - PROD 🎮                   ║${NC}"
	echo -e "${BOLD}${BLUE}║                                                              ║${NC}"
	echo -e "${BOLD}${BLUE}║              Démarrage de l'environnement...                 ║${NC}"
	echo -e "${BOLD}${BLUE}║                                                              ║${NC}"
	echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
	echo ""
}

wait_for_services() {
	echo -e "${BLUE}⏳ Initialisation des services...${NC}"
	echo ""
	
	local max_attempts=120
	local attempt=0
	
	while [ $attempt -lt $max_attempts ]; do
		# Vérifier si nginx répond
		if curl -s --max-time 2 -k https://localhost:8443 >/dev/null 2>&1; then
			echo ""
			echo -e "${GREEN}✅ Services prêts !${NC}"
			return 0
		fi
		
		local percentage=$((attempt * 100 / max_attempts))
		echo -ne "\r${YELLOW}Progression: ${NC}$percentage% (attend Nginx)${NC}"
		
		sleep 1
		((attempt++))
	done

	echo ""
	echo -e "${YELLOW}⚠️  Timeout - certains services peuvent ne pas être prêts${NC}"
}

show_service_links() {
	echo ""
	echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
	echo -e "${BOLD}${GREEN}║                                                              ║${NC}"
	echo -e "${BOLD}${GREEN}║                   ✅ TRANSCENDENCE - READY!                  ║${NC}"
	echo -e "${BOLD}${GREEN}║                                                              ║${NC}"
	echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
	echo ""
	
	# Section APPLICATION PRINCIPALE
	echo -e "${BOLD}${CYAN}🎯 APPLICATION PRINCIPALE (HTTPS)${NC}"
	echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
	
	local app_status="🟢 ONLINE"
	if ! curl -s --max-time 2 -k https://localhost:8443 >/dev/null 2>&1; then
		app_status="🔴 OFFLINE"
	fi
	
	printf "${NC}│ %-17s │ ${BOLD}Transcendence Game${NC}%-15s │\n" "$app_status" ""
	printf "${NC}│                   │ 🌐 Jeu Pong + GitHub Login%-12s │\n" ""
	printf "${NC}│ 🔗 https://localhost:8443${NC}%-8s │\n" ""
	echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
	echo ""
	
	# Section SERVICES BACKEND
	echo -e "${BOLD}${PURPLE}⚙️  SERVICES BACKEND${NC}"
	echo -e "${PURPLE}┌─────────────────────────────────────────────────────────────┐${NC}"
	
	local api_status="🟢 ONLINE"
	if ! curl -s --max-time 2 -k https://localhost:8443/api/health >/dev/null 2>&1; then
		api_status="🔴 OFFLINE"
	fi
	
	printf "${NC}│ %-17s │ ${BOLD}Backend API${NC}%-28s │\n" "$api_status" ""
	printf "${NC}│                   │ 🔧 Express + SQLite + WebSocket${NC}       │\n"
	printf "${NC}│ 🔗 https://localhost:8443/api${NC}%-14s │\n" ""
	echo -e "${PURPLE}└─────────────────────────────────────────────────────────────┘${NC}"
	echo ""
	
	# Section MONITORING & LOGS
	echo -e "${BOLD}${YELLOW}📊 MONITORING & LOGS${NC}"
	echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────┐${NC}"
	
	local es_status="🟢 ONLINE"
	if ! curl -s --max-time 2 http://127.0.0.1:9200 >/dev/null 2>&1; then
		es_status="🔴 OFFLINE"
	fi
	printf "${NC}│ %-17s │ ${BOLD}Elasticsearch${NC}%-26s │\n" "$es_status" ""
	printf "${NC}│ 🔗 http://127.0.0.1:9200${NC}%-12s │\n" ""
	
	local kibana_status="🟢 ONLINE"
	if ! curl -s --max-time 2 http://127.0.0.1:5601 >/dev/null 2>&1; then
		kibana_status="🔴 OFFLINE"
	fi
	printf "${NC}│ %-17s │ ${BOLD}Kibana${NC}%-33s │\n" "$kibana_status" ""
	printf "${NC}│ 🔗 http://127.0.0.1:5601${NC}%-12s │\n" ""
	
	local grafana_status="🟢 ONLINE"
	if ! curl -s --max-time 2 http://127.0.0.1:3001 >/dev/null 2>&1; then
		grafana_status="🔴 OFFLINE"
	fi
	printf "${NC}│ %-17s │ ${BOLD}Grafana${NC}%-32s │\n" "$grafana_status" ""
	printf "${NC}│ 🔗 http://127.0.0.1:3001${NC}%-12s │\n" ""
	
	echo -e "${YELLOW}└─────────────────────────────────────────────────────────────┘${NC}"
	echo ""
	
	# Section COMMANDES UTILES
	echo -e "${BOLD}${BLUE}📋 COMMANDES UTILES${NC}"
	echo -e "${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
	printf "${NC}│ 📊 Logs en temps réel   │ ${BOLD}make logs${NC}%-23s │\n" ""
	printf "${NC}│ 🛑 Arrêter les services │ ${BOLD}make stop${NC}%-23s │\n" ""
	printf "${NC}│ 🧹 Nettoyer & redémarrer│ ${BOLD}make clean${NC}%-22s │\n" ""
	echo -e "${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
	echo ""
	
	# Footer
	echo -e "${BOLD}${GREEN}🎉 Prêt à jouer en production !${NC}"
	echo -e "${GREEN}   👉 Ouvrez ${BOLD}https://localhost:8443${NC}${GREEN} dans votre navigateur${NC}"
	echo -e "${GREEN}   👉 Cliquez sur ${BOLD}'Login with GitHub'${NC}${GREEN} pour commencer${NC}"
	echo ""
	echo -e "${CYAN}ℹ️  Note: L'application utilise HTTPS avec SSL auto-signé${NC}"
	echo -e "${CYAN}   Acceptez l'avertissement de certificat pour continuer${NC}"
	echo ""
}

# Fonction principale
main() {
	print_header
	wait_for_services
	show_service_links
	
	# Création automatique du dashboard Grafana (silencieux)
	if [ -x "$(dirname "$0")/create-grafana-dashboard.sh" ]; then
		bash "$(dirname "$0")/create-grafana-dashboard.sh" >/dev/null 2>&1
	fi
}

# Exécution
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
	main "$@"
fi

