#!/bin/bash
# verify-production-grade.sh
# myPilotPost — Production Grade API Verification

API_URL="http://127.0.0.1:8787"
TEST_EMAIL="prod-$(date +%s)@example.com"
TEST_PASS="ProdPass123!"

echo "--- 🚀 STARTING PRODUCTION GRADE VERIFICATION ---"

# Helper for JSON assertions
assert_key() {
  if echo "$1" | grep -q "\"$2\""; then
    return 0
  else
    echo "❌ Missing key: $2 in $1"
    exit 1
  fi
}

# 1. REGISTER & LOGIN
echo -n "1. Auth Flow... "
REG_RES=$(curl -s -X POST "$API_URL/api/customer/register" -H "Content-Type: application/json" -d "{\"email\":\"$TEST_EMAIL\", \"password\":\"$TEST_PASS\"}")
LOGIN_RES=$(curl -s -X POST "$API_URL/api/customer/login" -H "Content-Type: application/json" -d "{\"email\":\"$TEST_EMAIL\", \"password\":\"$TEST_PASS\"}")
TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -n "$TOKEN" ]; then echo "✅"; else echo "❌ Auth failed"; exit 1; fi

# 2. CREATE BRAND
echo -n "2. Create Brand... "
BRAND_RES=$(curl -s -X POST "$API_URL/api/customer/brands/create" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Prod Brand", "industry":"Tech", "tone":"Professional"}')

if echo "$BRAND_RES" | grep -q '"id"'; then
  BRAND_ID=$(echo $BRAND_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo "✅"
else
  echo "❌ Brand failed: $BRAND_RES"
  exit 1
fi

# 3. DASHBOARD SUMMARY
echo -n "3. Dashboard Summary... "
SUM_RES=$(curl -s -X GET "$API_URL/api/customer/dashboard/summary" -H "Authorization: Bearer $TOKEN")
assert_key "$SUM_RES" "metrics"
assert_key "$SUM_RES" "totalContent"
assert_key "$SUM_RES" "thisWeek"
echo "✅"

# 4. BRAND INTELLIGENCE
echo -n "4. Brand Intelligence... "
INTEL_RES=$(curl -s -X GET "$API_URL/api/customer/brand-intelligence" -H "Authorization: Bearer $TOKEN")
assert_key "$INTEL_RES" "brandHealth"
assert_key "$INTEL_RES" "publishingConsistency"
assert_key "$INTEL_RES" "marketContext"
assert_key "$INTEL_RES" "topAlerts"
echo "✅"

# 5. AI SOCIAL
echo -n "5. AI Social... "
AI_SOC=$(curl -s -X POST "$API_URL/api/customer/ai/generate/social" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"context_id\":\"$(uuidgen)\", \"intention\":\"Draft\", \"platforms\":[\"X\"], \"tone\":\"Neutral\", \"cta\":\"Link\"}")
assert_key "$AI_SOC" "platformVariants"
assert_key "$AI_SOC" "baseCaption"
assert_key "$AI_SOC" "tone"
if [[ $AI_SOC == *"\"x\":"* ]]; then echo "✅"; else echo "❌ Lowercase platform key missing: $AI_SOC"; exit 1; fi

# 6. AI BLOG
echo -n "6. AI Blog... "
AI_BLOG=$(curl -s -X POST "$API_URL/api/customer/ai/generate/blog" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"context_id\":\"$(uuidgen)\", \"goal\":\"Guide\", \"audience\":\"Tech\", \"primary_keyword\":\"AI\"}")
assert_key "$AI_BLOG" "title"
assert_key "$AI_BLOG" "seoMeta"
echo "✅"

# 7. FEEDS (Notifications & Activity)
echo -n "7. Feeds... "
NOTIF_RES=$(curl -s -X GET "$API_URL/api/customer/notifications" -H "Authorization: Bearer $TOKEN")
ACT_RES=$(curl -s -X GET "$API_URL/api/customer/activity" -H "Authorization: Bearer $TOKEN")
assert_key "$NOTIF_RES" "notifications"
assert_key "$NOTIF_RES" "pagination"
assert_key "$ACT_RES" "activity"
assert_key "$ACT_RES" "pagination"
echo "✅"

# 8. CAMPAIGNS
echo -n "8. Campaigns... "
CAMP_L=$(curl -s -X GET "$API_URL/api/customer/campaigns" -H "Authorization: Bearer $TOKEN")
CAMP_C=$(curl -s -X POST "$API_URL/api/customer/campaigns" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Test", "industry":"Tech", "tone":"Bold"}')
assert_key "$CAMP_L" "campaigns"
assert_key "$CAMP_L" "pagination"
assert_key "$CAMP_C" "status"
echo "✅"

echo "--- 🏁 PRODUCTION GRADE VERIFICATION PASSED ---"
