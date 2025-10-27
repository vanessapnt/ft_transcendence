#!/bin/sh
set -e

# Copy the config file from the mounted location to the real config path (writable)
cp /tmp/host-logstash.yml /usr/share/logstash/config/logstash.yml
chown logstash:logstash /usr/share/logstash/config/logstash.yml

# Start Logstash (default CMD)
exec /usr/local/bin/docker-entrypoint "${@}"
