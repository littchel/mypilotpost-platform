#!/bin/bash

echo "🚀 Testing local APIs"

BASE="http://localhost:8788"

echo "Health check"
curl -s $BASE/api/health

echo ""
TOKEN="YOUR_ADMIN_JWT_TOKEN"

echo ""
echo "Admin customers endpoint"

curl -s \
-H "Authorization: Bearer $TOKEN" \
$BASE/api/admin/customers

echo ""
echo "Admin billing overview"

curl -s \
-H "Authorization: Bearer $TOKEN" \
$BASE/api/admin/billing/overview

echo ""
echo "Admin analytics delivery"

curl -s \
-H "Authorization: Bearer $TOKEN" \
$BASE/api/admin/analytics/delivery

echo ""
echo "Local API tests completed"