#!/bin/bash

echo "🔍 Verifying myPilotPost repository structure..."

REQUIRED_FILES=(
"packages/api/src/index.js"
"packages/api/src/server.js"
"packages/api/wrangler.toml"
"packages/api/migrations"
"packages/web"
"docs"
)

for file in "${REQUIRED_FILES[@]}"
do
if [ -e "$file" ]; then
echo "✅ Found $file"
else
echo "❌ Missing $file"
fi
done

echo ""
echo "Checking API directories..."

REQUIRED_DIRS=(
"packages/api/src/core"
"packages/api/src/api/admin"
"packages/api/src/auth"
"packages/api/src/lib"
)

for dir in "${REQUIRED_DIRS[@]}"
do
if [ -d "$dir" ]; then
echo "✅ Directory exists: $dir"
else
echo "❌ Missing directory: $dir"
fi
done

echo ""
echo "Repository structure verification complete."