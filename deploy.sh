#!/usr/bin/env bash
# Build the site and publish it to the nginx web root on this server.
# Usage: ./deploy.sh   (run from site/)
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Building…"
npm run build

echo "==> Publishing to /var/www/pumpfun.wtf…"
rsync -a --delete dist/ /var/www/pumpfun.wtf/
chown -R www-data:www-data /var/www/pumpfun.wtf

echo "==> Reloading nginx…"
nginx -t
systemctl reload nginx

echo "==> Done. https://pumpfun.wtf is updated."
