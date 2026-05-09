#!/bin/bash

echo "🌐 Testing deployed APIs"

BASE="https://mypilotpost-api.littchel.workers.dev"

echo "Health"
curl -s $BASE/api/health

echo ""
TOKEN="YOUR_ADMIN_JWT_TOKEN"

echo ""
echo "Admin customers"

curl -s \
-H "Authorization: Bearer $TOKEN" \
$BASE/api/admin/customers

echo ""
echo "Billing overview"

curl -s \
-H "Authorization: Bearer $TOKEN" \
$BASE/api/admin/billing/overview

echo ""
echo "Delivery analytics"

curl -s \
-H "Authorization: Bearer $TOKEN" \
$BASE/api/admin/analytics/delivery

echo ""
echo "Remote API tests completed"