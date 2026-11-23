#!/usr/bin/env bash
# One-time Azure setup for the Lentera API. Run in Azure Cloud Shell (Bash) or any shell with `az login` done.
# It creates the Container App from the ghcr.io image and lets GitHub Actions deploy new revisions.
# Prerequisite: the `api` workflow has pushed ghcr.io/<owner>/lentera-api:latest at least once.
set -euo pipefail

GH_OWNER=${GH_OWNER:-veinsan}
GH_REPO=${GH_REPO:-lentera}
LOCATION=${LOCATION:-malaysiawest}   # Azure for Students allows only eastasia, centralindia, japanwest, koreacentral, malaysiawest.
RG=${RG:-lentera-rg}
ENV_NAME=${ENV_NAME:-lentera-env}
APP=${APP:-lentera-api}
CORS_ORIGINS=${CORS_ORIGINS:-http://localhost:3000}
IMAGE="ghcr.io/${GH_OWNER}/lentera-api:latest"

# Secrets are read from the terminal, never passed as arguments.
read -rp  "SUPABASE_URL: " SUPABASE_URL
read -rsp "SUPABASE_SERVICE_ROLE_KEY (hidden): " SERVICE_KEY; echo
read -rsp "GitHub classic token with read:packages only (hidden): " GHCR_TOKEN; echo

SUB=$(az account show --query id -o tsv)
TENANT=$(az account show --query tenantId -o tsv)
echo "Subscription: $(az account show --query name -o tsv)"

az provider register -n Microsoft.App --wait
az provider register -n Microsoft.OperationalInsights --wait
az extension add -n containerapp --upgrade -y >/dev/null

az group create -n "$RG" -l "$LOCATION" -o none
az containerapp env create -n "$ENV_NAME" -g "$RG" -l "$LOCATION" -o none

# Scale to zero when idle; one replica at most because the plan cache is in process memory.
az containerapp create -n "$APP" -g "$RG" --environment "$ENV_NAME" --image "$IMAGE" \
  --registry-server ghcr.io --registry-username "$GH_OWNER" --registry-password "$GHCR_TOKEN" \
  --ingress external --target-port 8000 --cpu 1 --memory 2Gi --min-replicas 0 --max-replicas 1 \
  --secrets "supabase-url=$SUPABASE_URL" "service-role-key=$SERVICE_KEY" \
  --env-vars SUPABASE_URL=secretref:supabase-url SUPABASE_SERVICE_ROLE_KEY=secretref:service-role-key \
             "CORS_ORIGINS=$CORS_ORIGINS" IMAGE_TAG=latest -o none

FQDN=$(az containerapp show -n "$APP" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)

# GitHub Actions signs in with OIDC: no stored Azure password. Access is limited to this resource group.
CLIENT_ID=$(az ad app create --display-name "lentera-github-deploy" --query appId -o tsv)
az ad sp create --id "$CLIENT_ID" -o none 2>/dev/null || true
az role assignment create --assignee "$CLIENT_ID" --role Contributor \
  --scope "/subscriptions/$SUB/resourceGroups/$RG" -o none
az ad app federated-credential create --id "$CLIENT_ID" --parameters "{
  \"name\": \"lentera-main\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GH_OWNER}/${GH_REPO}:ref:refs/heads/main\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}" -o none

cat <<OUT

API URL: https://$FQDN   (check: curl https://$FQDN/health)

Set these GitHub repository variables (Settings > Secrets and variables > Actions > Variables):
  AZURE_CLIENT_ID=$CLIENT_ID
  AZURE_TENANT_ID=$TENANT
  AZURE_SUBSCRIPTION_ID=$SUB
  AZURE_RESOURCE_GROUP=$RG
  AZURE_CONTAINERAPP=$APP
OUT
