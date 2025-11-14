#!/bin/bash
# Create feature branches from current main branch
# This script creates all feature branches based on the codebase structure

set -e

echo "🌿 Creating feature branches..."

# Ensure we're on main branch
git checkout main

# Core Infrastructure Branches
echo "📦 Creating infrastructure branches..."
git checkout -b feature/auth
git checkout main
git checkout -b feature/sanity-integration
git checkout main
git checkout -b feature/supabase-integration
git checkout main
git checkout -b feature/api-infrastructure
git checkout main

# Feature Branches
echo "✨ Creating feature branches..."
git checkout -b feature/guides
git checkout main
git checkout -b feature/explore
git checkout main
git checkout -b feature/trip-builder
git checkout main
git checkout -b feature/itinerary
git checkout main
git checkout -b feature/wishlist
git checkout main
git checkout -b feature/community
git checkout main
git checkout -b feature/dashboard
git checkout main

# UI & Design System
echo "🎨 Creating UI branches..."
git checkout -b feature/ui-components
git checkout main

# Infrastructure & Utilities
echo "🔧 Creating utility branches..."
git checkout -b feature/routing
git checkout main
git checkout -b feature/monitoring
git checkout main

# Return to main
git checkout main

echo "✅ All branches created successfully!"
echo ""
echo "📋 Created branches:"
git branch --list "feature/*" | sed 's/^/  /'
echo ""
echo "💡 To switch to a branch: git checkout feature/<branch-name>"
echo "💡 To see all branches: git branch -a"

