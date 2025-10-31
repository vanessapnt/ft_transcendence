#!/bin/sh
set -e

# Copie la config logstash du host dans le dossier interne (droits logstash)
cp /tmp/host-logstash.yml /usr/share/logstash/config/logstash.yml
chown logstash:logstash /usr/share/logstash/config/logstash.yml

exec /usr/local/bin/docker-entrypoint "$@"
