#!/bin/bash

echo "📊 Monitoring Transcendence en temps réel..."
echo "Press Ctrl+C to stop"
echo ""

while true; do
    # Clear screen
    clear
    
    echo "🎮 TRANSCENDENCE SYSTEM MONITORING"
    echo "=================================="
    echo "$(date)"
    echo ""
    
    # Services Status
    echo "📡 SERVICES STATUS:"
    services=$(curl -s "http://localhost:9090/api/v1/query?query=up" | jq -r '.data.result[] | "\(.metric.job): \(if .value[1] == "1" then "✅ UP" else "❌ DOWN" end)"' 2>/dev/null)
    echo "$services"
    echo ""
    
    # CPU Usage
    echo "🖥️  CPU USAGE:"
    cpu=$(curl -s "http://localhost:9090/api/v1/query?query=100%20-%20(avg(rate(node_cpu_seconds_total%7Bmode%3D%22idle%22%7D%5B5m%5D))%20*%20100)" | jq -r '.data.result[0].value[1]' 2>/dev/null)
    if [ ! -z "$cpu" ]; then
        cpu_formatted=$(printf "%.2f" "$cpu")
        echo "CPU: ${cpu_formatted}%"
    else
        echo "CPU: Collecting..."
    fi
    echo ""
    
    # Memory Info
    echo "💾 MEMORY INFO:"
    mem_total=$(curl -s "http://localhost:9090/api/v1/query?query=node_memory_MemTotal_bytes" | jq -r '.data.result[0].value[1]' 2>/dev/null)
    mem_available=$(curl -s "http://localhost:9090/api/v1/query?query=node_memory_MemAvailable_bytes" | jq -r '.data.result[0].value[1]' 2>/dev/null)
    
    if [ ! -z "$mem_total" ] && [ ! -z "$mem_available" ]; then
        mem_total_gb=$(echo "$mem_total / 1024 / 1024 / 1024" | bc -l | xargs printf "%.1f")
        mem_used=$(echo "$mem_total - $mem_available" | bc)
        mem_used_gb=$(echo "$mem_used / 1024 / 1024 / 1024" | bc -l | xargs printf "%.1f")
        mem_percent=$(echo "($mem_used / $mem_total) * 100" | bc -l | xargs printf "%.1f")
        
        echo "Total: ${mem_total_gb} GB"
        echo "Used:  ${mem_used_gb} GB (${mem_percent}%)"
    else
        echo "Memory: Collecting..."
    fi
    echo ""
    
    # Dashboard Access
    echo "🌐 DASHBOARD ACCESS:"
    echo "Grafana: http://localhost:3001"
    echo "Login: admin / transcendence123"
    echo ""
    echo "Press Ctrl+C to stop monitoring..."
    
    # Wait 5 seconds
    sleep 5
done