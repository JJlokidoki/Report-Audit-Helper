#!/bin/sh
set -e

if [ -n "$AUTH_USER" ] && [ -n "$AUTH_PASSWORD" ]; then
  echo "$AUTH_USER:$(openssl passwd -apr1 "$AUTH_PASSWORD")" > /etc/nginx/.htpasswd
  echo "Basic auth enabled for user: $AUTH_USER"
else
  rm -f /etc/nginx/.htpasswd
  # remove auth directives so nginx doesn't fail on missing file
  sed -i '/auth_basic/d' /etc/nginx/conf.d/default.conf
  echo "Basic auth disabled (AUTH_USER/AUTH_PASSWORD not set)"
fi

exec nginx -g 'daemon off;'
