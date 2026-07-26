#!/bin/sh
set -eu

if [ "${RUN_DB_SCHEMA_SYNC:-true}" = "true" ]; then
  echo "Aplicando o schema Prisma..."
  ./node_modules/.bin/prisma db push --skip-generate
fi

echo "Iniciando processo: $*"
exec "$@"
