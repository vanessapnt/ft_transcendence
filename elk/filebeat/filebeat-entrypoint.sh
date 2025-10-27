#!/bin/sh
# Entrypoint pour Filebeat : lance Filebeat

set -e

exec filebeat "$@"
