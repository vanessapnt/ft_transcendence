# 📊 Queries Grafana pour démonstration

## Services Status
```promql
up
```
**Résultat attendu :**
- prometheus: 1 (UP)
- node-exporter: 1 (UP)  
- elasticsearch: 0 (DOWN)
- backend: 0 (DOWN)

## CPU Usage %
```promql
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```
**Résultat testé :** ~2.91% (système peu chargé)

## Memory Usage %
```promql
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

## Memory Total (GB)
```promql
node_memory_MemTotal_bytes / 1024 / 1024 / 1024
```
**Résultat testé :** 8 GB

## CPU Cores Count
```promql
count by (instance) (node_cpu_seconds_total{mode="idle"})
```
**Résultat testé :** 8 cores CPU

## Disk Usage %
```promql
100 - ((node_filesystem_free_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"}) * 100)
```

## Network Traffic (MB/s)
```promql
rate(node_network_receive_bytes_total[5m]) / 1024 / 1024
```

## Prometheus Metrics Count
```promql
prometheus_tsdb_head_series
```

## System Uptime (hours)
```promql
(time() - node_boot_time_seconds) / 3600
```