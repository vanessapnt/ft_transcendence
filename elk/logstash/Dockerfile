FROM docker.elastic.co/logstash/logstash:7.15.0
COPY --chown=logstash:logstash config/logstash.yml /usr/share/logstash/config/logstash.yml
COPY --chown=logstash:logstash pipeline /usr/share/logstash/pipeline
