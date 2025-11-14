#!/bin/bash

# Vercel Configuration Verification Script
# This script helps verify that Vercel is correctly configured to deploy from the GitHub repository

set -e

echo "🔍 Vercel Configuration Verification"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Expected values
EXPECTED_REPO="mel-koku/koku-travel"
EXPECTED_REPO_URL="https://github.com/mel-koku/koku-travel.git"
EXPECTED_BRANCH="main"

echo "📋 Expected Configuration:"
echo "   Repository: $EXPECTED_REPO"
echo "   Repository URL: $EXPECTED_REPO_URL"
echo "   Production Branch: $EXPECTED_BRANCH"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel@latest
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Vercel. Please run: vercel login${NC}"
    echo ""
    echo "To continue verification:"
    echo "1. Run: vercel login"
    echo "2. Then run this script again"
    exit 1
fi

echo -e "${GREEN}✅ Logged in to Vercel${NC}"
echo ""

# Get current user
VERCEL_USER=$(vercel whoami)
echo "👤 Vercel User: $VERCEL_USER"
echo ""

# Check if project is linked
if [ -f ".vercel/project.json" ]; then
    echo -e "${GREEN}✅ Project is linked locally${NC}"
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)
    ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*' | cut -d'"' -f4)
    echo "   Project ID: $PROJECT_ID"
    echo "   Org ID: $ORG_ID"
    echo ""
else
    echo -e "${YELLOW}⚠️  Project not linked locally${NC}"
    echo "   Run: vercel link"
    echo ""
fi

# List projects
echo "📦 Checking Vercel projects..."
echo ""

PROJECTS=$(vercel project ls --json 2>/dev/null || echo "[]")

if [ "$PROJECTS" = "[]" ] || [ -z "$PROJECTS" ]; then
    echo -e "${RED}❌ No projects found or unable to fetch projects${NC}"
    echo ""
    echo "Please verify manually in Vercel Dashboard:"
    echo "1. Go to https://vercel.com/dashboard"
    echo "2. Check your project settings"
    echo "3. Verify repository connection"
    exit 1
fi

# Try to find koku-travel project
FOUND_PROJECT=$(echo "$PROJECTS" | grep -i "koku-travel" || echo "")

if [ -z "$FOUND_PROJECT" ]; then
    echo -e "${YELLOW}⚠️  'koku-travel' project not found in your projects${NC}"
    echo ""
    echo "Available projects:"
    vercel project ls
    echo ""
    echo "If your project has a different name, please check manually in Vercel Dashboard"
    exit 1
fi

echo -e "${GREEN}✅ Found koku-travel project${NC}"
echo ""

# Get project details (requires project to be linked or project name)
echo "🔍 Fetching project details..."
echo ""

# Try to inspect the project
if [ -f ".vercel/project.json" ]; then
    PROJECT_NAME=$(cat .vercel/project.json | grep -o '"name":"[^"]*' | cut -d'"' -f4 || echo "koku-travel")
    
    echo "Attempting to fetch project configuration..."
    echo ""
    
    # Note: vercel inspect requires the project to be linked
    if vercel inspect &> /dev/null; then
        echo -e "${GREEN}✅ Project inspection available${NC}"
        vercel inspect
    else
        echo -e "${YELLOW}⚠️  Cannot inspect project details via CLI${NC}"
        echo ""
        echo "Please verify manually in Vercel Dashboard:"
        echo "1. Go to https://vercel.com/dashboard"
        echo "2. Select your koku-travel project"
        echo "3. Go to Settings → Git"
        echo "4. Verify:"
        echo "   - Repository: $EXPECTED_REPO"
        echo "   - Production Branch: $EXPECTED_BRANCH"
    fi
else
    echo -e "${YELLOW}⚠️  Project not linked. Linking now...${NC}"
    echo ""
    echo "Please run: vercel link"
    echo "Then run this script again"
fi

echo ""
echo "====================================="
echo "📝 Manual Verification Steps:"
echo ""
echo "1. Go to: https://vercel.com/dashboard"
echo "2. Select your 'koku-travel' project"
echo "3. Click 'Settings' → 'Git'"
echo "4. Verify:"
echo "   ✅ Repository: $EXPECTED_REPO"
echo "   ✅ Production Branch: $EXPECTED_BRANCH"
echo "   ✅ Root Directory: ./ (or blank)"
echo ""
echo "5. Check 'Deployments' tab:"
echo "   ✅ Latest deployment should show:"
echo "      'Cloning github.com/$EXPECTED_REPO.git'"
echo ""

