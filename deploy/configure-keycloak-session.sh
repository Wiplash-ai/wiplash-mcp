#!/usr/bin/env bash
set -euo pipefail

KEYCLOAK_CONTAINER="${KEYCLOAK_CONTAINER:-keycloak}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-wiplash}"
SSO_IDLE_SECONDS="${SSO_IDLE_SECONDS:-604800}"
SSO_MAX_SECONDS="${SSO_MAX_SECONDS:-2592000}"

for value in "$SSO_IDLE_SECONDS" "$SSO_MAX_SECONDS"; do
  if [[ ! "$value" =~ ^[0-9]+$ ]] || (( value < 300 )); then
    printf 'Session lifetimes must be integer seconds of at least 300.\n' >&2
    exit 2
  fi
done

if (( SSO_MAX_SECONDS < SSO_IDLE_SECONDS )); then
  printf 'SSO_MAX_SECONDS must be greater than or equal to SSO_IDLE_SECONDS.\n' >&2
  exit 2
fi

docker exec \
  -e TARGET_REALM="$KEYCLOAK_REALM" \
  -e TARGET_SSO_IDLE_SECONDS="$SSO_IDLE_SECONDS" \
  -e TARGET_SSO_MAX_SECONDS="$SSO_MAX_SECONDS" \
  "$KEYCLOAK_CONTAINER" \
  sh -lc '
    set -eu
    admin_user="${KEYCLOAK_ADMIN:-${KC_BOOTSTRAP_ADMIN_USERNAME:-}}"
    admin_password="${KEYCLOAK_ADMIN_PASSWORD:-${KC_BOOTSTRAP_ADMIN_PASSWORD:-}}"
    if [ -z "$admin_user" ] || [ -z "$admin_password" ]; then
      printf "Keycloak admin environment variables are unavailable in the container.\n" >&2
      exit 3
    fi

    kcadm=/opt/keycloak/bin/kcadm.sh
    "$kcadm" config credentials \
      --server http://127.0.0.1:8080 \
      --realm master \
      --user "$admin_user" \
      --password "$admin_password" >/dev/null
    "$kcadm" update "realms/$TARGET_REALM" \
      -s "ssoSessionIdleTimeout=$TARGET_SSO_IDLE_SECONDS" \
      -s "ssoSessionMaxLifespan=$TARGET_SSO_MAX_SECONDS" >/dev/null
    "$kcadm" get "realms/$TARGET_REALM" \
      --fields realm,accessTokenLifespan,ssoSessionIdleTimeout,ssoSessionMaxLifespan
  '
