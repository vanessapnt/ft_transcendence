#!/bin/bash

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration (progression complète)
SERVICES=("backend" "frontend" "elasticsearch" "logstash" "kibana")
SERVICE_PORTS=("8000" "3000" "9200" "5044" "5601")
SERVICE_URLS=("http://localhost:8000" "http://localhost:3000" "http://localhost:9200" "http://localhost:5044" "http://localhost:5601")
SERVICE_NAMES=("Backend API" "Frontend App" "Elasticsearch" "Logstash (Beats input)" "Kibana Dashboard")

print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║                   🚀 TRANSCENDENCE DEV                       ║${NC}"
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
    printf "%*s" $filled | tr ' ' '█'
    printf "%*s" $empty | tr ' ' '░'
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
        # Efface la ligne avant d'afficher le nouveau statut
        tput el
        if [ "$status" = "ready" ]; then
            local filled_bar=$(printf "%*s" $bar_width | tr ' ' '█')
            printf "  %-25s ${GREEN}[%s] ✅ READY${NC}\n" "$service_name" "$filled_bar"
        elif [ "$status" = "starting" ]; then
            local filled=$((bar_width * 3 / 4))
            local empty=$((bar_width - filled))
            local filled_bar=$(printf "%*s" $filled | tr ' ' '█')
            local empty_bar=$(printf "%*s" $empty | tr ' ' '░')
            printf "  %-25s ${YELLOW}[%s%s] 🔄 STARTING${NC}\n" "$service_name" "$filled_bar" "$empty_bar"
        else
            local filled=$((bar_width / 4))
            local empty=$((bar_width - filled))
            local filled_bar=$(printf "%*s" $filled | tr ' ' '█')
            local empty_bar=$(printf "%*s" $empty | tr ' ' '░')
            printf "  %-25s ${RED}[%s%s] ⏳ WAITING${NC}\n" "$service_name" "$filled_bar" "$empty_bar"
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

    # Initialiser les états des services
    for i in "${!SERVICES[@]}"; do
        service_states[$i]="waiting"
    done

    # Affichage initial
    echo -e "${BLUE}⏳ Attente du démarrage des services...${NC}"
    show_progress_bar 0 ${#SERVICES[@]}
    show_individual_progress "${service_states[@]}"
    lines_to_overwrite=$((4 + ${#SERVICES[@]}))

    while [ $ready_count -lt ${#SERVICES[@]} ] && [ $attempt -lt $max_attempts ]; do
        ready_count=0
        # Vérifier chaque service et mettre à jour son état
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
        # Replacer le curseur en haut de la zone d'affichage
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
    
    # N'afficher que les liens cliquables pour Frontend, Kibana et Grafana
    local link_names=("Frontend App (Jeu)" "Kibana Dashboard" "Grafana Monitoring")
    local link_urls=("http://localhost:3000" "http://localhost:5601" "http://localhost:3001")
    for i in "${!link_names[@]}"; do
        local status_icon="�"
        local status_text="OFFLINE"
        if curl -s --max-time 2 "${link_urls[$i]}" >/dev/null 2>&1; then
            status_icon="🟢"
            status_text="ONLINE "
        fi
        printf "  %s %s %-24s %s\n" "$status_icon" "$status_text" "${link_names[$i]}" "${link_urls[$i]}"
    done
    echo ""
    echo -e "${BOLD}${BLUE}📊 Dashboards spéciaux :${NC}"
    echo -e "  🔍 Logs ELK Stack     ${BLUE}http://localhost:5601/app/dashboards#/view/transcendence-dashboard${NC}"
    echo -e "  🎮 Game Interface     ${BLUE}http://localhost:3000/pong${NC}"
    echo ""
    echo -e "${YELLOW}💡 Tip: Utilisez ${BOLD}'make logs'${NC}${YELLOW} pour voir les logs en temps réel${NC}"
    echo -e "${YELLOW}💡 Tip: Utilisez ${BOLD}'make links'${NC}${YELLOW} pour réafficher ces liens${NC}"
    echo ""
}

# Fonction principale
main() {
    print_header
    wait_for_services
    show_service_links
}

# Exécution si appelé directement
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi