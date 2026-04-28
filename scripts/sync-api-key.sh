#!/bin/bash
# Reads DASHBOARD_API_KEY from the droplet .env and pushes it to Vercel as API_KEY.
# Run this any time the key changes: bash scripts/sync-api-key.sh

DROPLET="root@164.92.152.59"
REMOTE_ENV="/root/altcoinist-support-bot/.env"

echo "Fetching DASHBOARD_API_KEY from droplet..."
KEY=$(ssh "$DROPLET" "grep '^DASHBOARD_API_KEY=' $REMOTE_ENV | cut -d'=' -f2")

if [ -z "$KEY" ]; then
  echo "ERROR: Could not read DASHBOARD_API_KEY from droplet. Aborting."
  exit 1
fi

echo "Updating Vercel API_KEY..."
vercel env rm API_KEY production --yes 2>/dev/null
printf "%s" "$KEY" | vercel env add API_KEY production

echo "Done. Redeploy the dashboard for the change to take effect:"
echo "  vercel --prod"
