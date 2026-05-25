#!/bin/bash
API="http://localhost:8787"
EMAIL="exhaustive-$(date +%s)@mypilotpost.com"
PASS="StrongPass123!"

echo "1. User Registration"
REG=$(curl -s -X POST "$API/api/customer/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo $REG | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "2. Brand Creation"
BRAND_RES=$(curl -s -X POST "$API/api/customer/brands/create" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Exhaustive Brand", "industry":"Tech", "tone":"Bold"}')
B_TOKEN=$(echo $BRAND_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "3. Media Upload"
echo "hello world" > /tmp/test-upload.txt
MEDIA_RES=$(curl -s -X POST "$API/api/customer/media/upload" -H "Authorization: Bearer $B_TOKEN" -F "file=@/tmp/test-upload.txt" -F "type=text/plain")
MEDIA_ID=$(echo $MEDIA_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Media ID: $MEDIA_ID"

echo "4. Create Social Draft"
SOCIAL_RES=$(curl -s -X POST "$API/api/customer/content/social" -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" -d "{\"platforms\":[\"LinkedIn\"], \"text\":\"This is a fully compliant test for the exhaustive Deep Dive check!\"}")
echo "Social Result: $SOCIAL_RES"
CONTENT_ID=$(echo $SOCIAL_RES | grep -o '"content_id":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$CONTENT_ID" ]; then
  echo "5. Submit for Approval (Schedules)"
  APPROVE_RES=$(curl -s -X POST "$API/api/customer/content/social/$CONTENT_ID/submit-approval" -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" -d '{"schedule_at":"2027-01-01T10:00:00Z"}')
  echo "Approve Result: $APPROVE_RES"
fi

echo "6. Create Blog Draft"
LONG_TEXT="This is a very long blog post body designed to bypass the CONTENT_TOO_SHORT validation. It must be sufficiently long to be accepted by the system. The platform checks if the content is long enough, so here are a few more words to be absolutely sure. This should be enough."
BLOG_RES=$(curl -s -X POST "$API/api/customer/content/blog" -H "Authorization: Bearer $B_TOKEN" -H "Content-Type: application/json" -d "{\"title\":\"Exhaustive Blog Test\", \"content\":\"$LONG_TEXT\", \"seo_keywords\":[\"test\"]}")
echo "Blog Result: $BLOG_RES"

echo "7. Check Dashboard Summary"
DASH_RES=$(curl -s -X GET "$API/api/customer/dashboard/summary" -H "Authorization: Bearer $B_TOKEN")
echo "Dash Result: $DASH_RES"

