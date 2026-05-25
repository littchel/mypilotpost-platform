#!/bin/bash
set -e

echo "=== E2E DEEP DIVE VERIFICATION ==="
API="http://localhost:8787"

# 1. Register a fresh account for E2E Deep Dive
EMAIL="e2e-test-$(date +%s)@mypilotpost.com"
PASS="StrongPass123!"

echo "1. Registering user $EMAIL..."
REG_RES=$(curl -s -X POST "$API/api/customer/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo $REG_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to register user. Response: $REG_RES"
  exit 1
fi
echo "User registered. Token acquired."

# 2. Create Brand
echo "2. Creating Brand..."
BRAND_RES=$(curl -s -X POST "$API/api/customer/brands/create" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Deep Dive Brand", "industry":"Tech", "tone":"Bold"}')
BRAND_ID=$(echo $BRAND_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
BRAND_TOKEN=$(echo $BRAND_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$BRAND_TOKEN" ]; then
  echo "Failed to create brand. Response: $BRAND_RES"
  exit 1
fi
echo "Brand created: $BRAND_ID"

# 3. Create Social Draft
echo "3. Creating Social Draft..."
SOCIAL_RES=$(curl -s -X POST "$API/api/customer/content/social" -H "Authorization: Bearer $BRAND_TOKEN" -H "Content-Type: application/json" -d '{"platforms":["LinkedIn", "Twitter"], "text":"Hello world from deep dive test!"}')
echo "Social Result: $SOCIAL_RES"
CONTENT_ID=$(echo $SOCIAL_RES | grep -o '"content_id":"[^"]*' | cut -d'"' -f4)

# 4. Create Campaign
echo "4. Creating Campaign..."
CAMPAIGN_RES=$(curl -s -X POST "$API/api/customer/campaigns/create" -H "Authorization: Bearer $BRAND_TOKEN" -H "Content-Type: application/json" -d '{"name":"Launch Campaign", "description":"Detailed E2E Test Campaign", "start_date":"2026-06-01", "end_date":"2026-06-30"}')
echo "Campaign Result: $CAMPAIGN_RES"
CAMPAIGN_ID=$(echo $CAMPAIGN_RES | grep -o '"campaign_id":"[^"]*' | cut -d'"' -f4)

# 5. Link Content to Campaign (if API allows)
if [ ! -z "$CAMPAIGN_ID" ] && [ ! -z "$CONTENT_ID" ]; then
  echo "5. Linking Social Draft to Campaign..."
  LINK_RES=$(curl -s -X POST "$API/api/customer/campaigns/link" -H "Authorization: Bearer $BRAND_TOKEN" -H "Content-Type: application/json" -d "{\"campaign_id\":\"$CAMPAIGN_ID\", \"content_id\":\"$CONTENT_ID\"}")
  echo "Link Result: $LINK_RES"
fi

# 6. Check Dashboard Summary (to see recent activity/stats)
echo "6. Dashboard Summary..."
DASH_RES=$(curl -s -X GET "$API/api/customer/dashboard/summary" -H "Authorization: Bearer $BRAND_TOKEN")
echo "Dashboard Result: $DASH_RES"

# 7. Check Scheduler
# We can submit for approval or just post now to create a delivery job
if [ ! -z "$CONTENT_ID" ]; then
  echo "7. Triggering Delivery Job (Post Now)..."
  POST_NOW_RES=$(curl -s -X POST "$API/api/customer/content/social/$CONTENT_ID/publish-now" -H "Authorization: Bearer $BRAND_TOKEN" -H "Content-Type: application/json" -d '{}')
  echo "Post Now Result: $POST_NOW_RES"
fi

echo "=== VERIFICATION COMPLETE ==="

