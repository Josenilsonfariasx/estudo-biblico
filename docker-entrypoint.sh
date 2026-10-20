#!/bin/sh
set -e

echo "Aplicando migrations do banco..."
node /opt/prisma/node_modules/prisma/build/index.js migrate deploy --schema ./prisma/schema.prisma

exec node server.js
