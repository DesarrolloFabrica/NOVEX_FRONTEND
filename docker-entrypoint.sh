#!/bin/sh
set -eu

PORT="${PORT:-8080}"

# Cloud Run inyecta PORT; adaptar el listen de nginx sin fijar un puerto permanente.
sed -i "s/listen [0-9]*;/listen ${PORT};/" /etc/nginx/conf.d/default.conf

exec "$@"
