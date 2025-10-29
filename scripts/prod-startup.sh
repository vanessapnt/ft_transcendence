#!/bin/bash

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration (progression complète)
SERVICES=(
	"backend" "frontend" "nginx" "elasticsearch" "logstash" "kibana" "prometheus" "grafana" "node-exporter"
)
SERVICE_PORTS=(
	"8000" "3000" "80" "9200" "5044" "5601" "9090" "3001" "9100"
)
SERVICE_URLS=(
	"http://localhost:8000" "http://localhost:3000" "http://localhost" "http://localhost:9200" "http://localhost:5044" "http://localhost:5601" "http://localhost:9090" "http://localhost:3001" "http://localhost:9100"
)
SERVICE_NAMES=(
	"Backend API" "Frontend App" "Nginx Proxy" "Elasticsearch" "Logstash (Beats input)" "Kibana Dashboard" "Prometheus" "Grafana Monitoring" "Node Exporter"
)

print_header() {
	echo ""
	echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
	echo -e "${BOLD}${BLUE}║                   🚀 TRANSCENDENCE PROD                      ║${NC}"
	echo -e "${BOLD}${BLUE}║              Démarrage de l'environnement...                 ║${NC}"
	echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
	echo ""
}

show_progress_bar() {
	local current=$1
	local total=$2
	local width=50
	local percentage=$((current * 100 / total))
	local filled=$((current * width / total))
	local empty=$((width - filled))
	printf "\r${YELLOW}[${NC}"
	printf "%*s" $filled | tr ' ' '#'
	printf "%*s" $empty | tr ' ' '-'
	printf "${YELLOW}] %d%% (%d/%d services)${NC}" $percentage $current $total
}

show_individual_progress() {
	local service_states=("$@")
	echo ""
	echo -e "${BLUE}📋 État des services :${NC}"
	echo ""
	for i in "${!SERVICES[@]}"; do
		local service_name="${SERVICE_NAMES[$i]}"
		local status="${service_states[$i]}"
		local bar_width=30
		tput el
		local filled_bar=$(printf "%*s" $bar_width | tr ' ' '#')
		local empty_bar=$(printf "%*s" $bar_width | tr ' ' '-')
		if [ "$status" = "ready" ]; then
			printf "  %-25s ${GREEN}[%s] READY${NC}\n" "$service_name" "$filled_bar"
		elif [ "$status" = "starting" ]; then
			local filled=$((bar_width * 3 / 4))
			local empty=$((bar_width - filled))
			local filled_bar=$(printf "%*s" $filled | tr ' ' '#')
			local empty_bar=$(printf "%*s" $empty | tr ' ' '-')
			printf "  %-25s ${YELLOW}[%s%s] STARTING${NC}\n" "$service_name" "$filled_bar" "$empty_bar"
		else
			local filled=$((bar_width / 4))
			local empty=$((bar_width - filled))
			local filled_bar=$(printf "%*s" $filled | tr ' ' '#')
			local empty_bar=$(printf "%*s" $empty | tr ' ' '-')
			printf "  %-25s ${RED}[%s%s] WAITING${NC}\n" "$service_name" "$filled_bar" "$empty_bar"
		fi
	done
}

check_service_health() {
	local url=$1
	local service_name=$2
	local timeout=2
    
	# Logstash : vérifier l'API HTTP 9600
	if [[ "$service_name" == "Logstash (Beats input)" ]]; then
		if curl -s --max-time $timeout http://localhost:9600 >/dev/null 2>&1; then
			return 0
		else
			return 1
		fi
	# Nginx : vérifier port 80 (utilise /health pour un check fiable)
	elif [[ "$service_name" == "Nginx Proxy" ]]; then
		if curl -s --max-time $timeout http://localhost:8080/health >/dev/null 2>&1; then
			return 0
		else
			return 1
		fi
	# Kibana Init : prêt si le conteneur n'existe plus ou est exited
	elif [[ "$service_name" == "Kibana Init" ]]; then
		status=$(docker ps -a --filter "name=kibana-init-prod" --format '{{.Status}}')
		if [[ -z "$status" || "$status" == Exited* || "$status" == "Created"* ]]; then
			return 0
		else
			return 1
		fi
	else
		if curl -s --max-time $timeout "$url" >/dev/null 2>&1; then
			return 0
		else
			return 1
		fi
	fi
}

wait_for_services() {
	echo -e "${BLUE}⏳ Attente du démarrage des services...${NC}"
	echo ""
	local ready_count=0
	local max_attempts=60
	local attempt=0
	local service_states=()
	local lines_to_overwrite=0

	for i in "${!SERVICES[@]}"; do
		service_states[$i]="waiting"
	done

	echo -e "${BLUE}⏳ Attente du démarrage des services...${NC}"
	show_progress_bar 0 ${#SERVICES[@]}
	show_individual_progress "${service_states[@]}"
	lines_to_overwrite=$((4 + ${#SERVICES[@]}))

	while [ $ready_count -lt ${#SERVICES[@]} ] && [ $attempt -lt $max_attempts ]; do
		ready_count=0
		for i in "${!SERVICES[@]}"; do
			if check_service_health "${SERVICE_URLS[$i]}" "${SERVICE_NAMES[$i]}"; then
				service_states[$i]="ready"
				((ready_count++))
			elif [ $attempt -gt 10 ]; then
				if [ "${service_states[$i]}" != "ready" ]; then
					service_states[$i]="starting"
				fi
			fi
		done
		tput cuu $lines_to_overwrite
		tput el
		echo -e "${BLUE}⏳ Attente du démarrage des services...${NC}"
		show_progress_bar $ready_count ${#SERVICES[@]}
		show_individual_progress "${service_states[@]}"
		if [ $ready_count -lt ${#SERVICES[@]} ]; then
			sleep 2
			((attempt++))
		fi
	done

	echo ""
	echo ""
	if [ $ready_count -eq ${#SERVICES[@]} ]; then
		echo -e "${GREEN}✅ Tous les services sont prêts !${NC}"
	else
		echo -e "${RED}⚠️  Certains services ne sont pas encore prêts (timeout atteint)${NC}"
	fi
}

show_service_links() {
	echo ""
	echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
	echo -e "${BOLD}${GREEN}║                    🌐 SERVICES DISPONIBLES                   ║${NC}"
	echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
	echo ""

	# Section APPLICATION PRINCIPALE
	echo -e "${BOLD}${BLUE}🎯 APPLICATION PRINCIPALE${NC}"
	echo -e "${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
	local app_name="🌐 Transcendence Game (Prod)"
	local app_url="http://localhost"
	local app_desc="Jeu Pong + Authentification GitHub (prod)"
	local app_status_icon="🟢"
	local app_status_text="ONLINE"
	if ! curl -s --max-time 2 "$app_url" >/dev/null 2>&1; then
		app_status_icon="🔴"
		app_status_text="OFFLINE"
	fi
	printf "${NC}│ ${app_status_icon} %-15s │ ${BOLD}%-30s${NC} │\n" "$app_status_text" "$app_name"
	printf "${NC}│ ${YELLOW}📝 Description${NC}    │ %-30s │\n" "$app_desc"
	printf "${NC}│ ${GREEN}🔗 URL${NC}            │ ${BOLD}${GREEN}%-30s${NC} │\n" "$app_url"
	echo -e "${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
	echo ""

	# Section MONITORING
	echo -e "${BOLD}${PURPLE}📊 MONITORING & LOGS${NC}"
	echo -e "${PURPLE}┌─────────────────────────────────────────────────────────────┐${NC}"
	local dash_names=("Kibana Dashboard" "Grafana Monitoring")
	local dash_urls=("http://localhost:5601/app/dashboards#/view/transcendence-dashboard" "http://localhost:3001/d/$(echo transcendence-system-monitoring)/")
	local dash_icons=("📈" "📊")
	for i in "${!dash_names[@]}"; do
		local d_icon="🔴"
		local d_text="OFFLINE"
		local health_url="${dash_urls[$i]}"
		if [ $i -eq 0 ]; then health_url="http://localhost:5601"; fi
		if [ $i -eq 1 ]; then health_url="http://localhost:3001"; fi
		if curl -s --max-time 2 "$health_url" >/dev/null 2>&1; then
			d_icon="🟢"
			d_text="ONLINE "
		fi
		printf "${NC}│ ${dash_icons[$i]} %-15s │ ${BOLD}%-30s${NC} │\n" "$d_text" "${dash_names[$i]}"
	done
	echo -e "${PURPLE}└─────────────────────────────────────────────────────────────┘${NC}"
	echo ""

	# Footer avec conseils
	echo -e "${BOLD}${GREEN}🎉 Prêt à jouer en PROD !${NC}"
	echo -e "${GREEN}   → Ouvrez ${BOLD}http://localhost${NC}${GREEN} dans votre navigateur${NC}"
	echo -e "${GREEN}   → Cliquez sur ${BOLD}'Login with GitHub'${NC}${GREEN} pour commencer${NC}"
	echo ""
	echo -e "${BLUE}💡 Conseils:${NC}"
	echo -e "${BLUE}   • Utilisez ${BOLD}'make logs'${NC}${BLUE} pour voir les logs en temps réel${NC}"
	echo -e "${BLUE}   • Utilisez ${BOLD}'make stop'${NC}${BLUE} pour arrêter tous les services${NC}"
	echo ""
}

main() {
	print_header
	wait_for_services
	show_service_links
	if [ -x "$(dirname "$0")/create-grafana-dashboard.sh" ]; then
		bash "$(dirname "$0")/create-grafana-dashboard.sh" >/dev/null 2>&1
	fi
}

if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
	main "$@"
fi
