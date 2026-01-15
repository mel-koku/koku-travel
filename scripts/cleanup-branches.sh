#!/bin/bash

# Script to clean up merged branches from GitHub
# This will delete remote branches that have been merged into main

echo "🔍 Checking for merged branches..."
echo ""

# Fetch latest from remote
git fetch origin --prune

# Get list of merged branches (excluding main and HEAD)
MERGED_BRANCHES=$(git branch -r --merged origin/main | grep -v HEAD | grep -v "origin/main" | sed 's|origin/||' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | sort)

if [ -z "$MERGED_BRANCHES" ]; then
    echo "✅ No merged branches found to clean up!"
    exit 0
fi

echo "📋 Found the following merged branches:"
echo "$MERGED_BRANCHES" | nl
echo ""
echo "Total: $(echo "$MERGED_BRANCHES" | wc -l | tr -d ' ') branches"
echo ""

# Show unmerged branches for reference
UNMERGED=$(git branch -r --no-merged origin/main | grep -v HEAD | sed 's|origin/||' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | sort)
if [ -n "$UNMERGED" ]; then
    echo "⚠️  Unmerged branches (will NOT be deleted):"
    echo "$UNMERGED" | nl
    echo ""
fi

read -p "❓ Do you want to delete these merged branches from remote? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Cancelled. No branches were deleted."
    exit 0
fi

echo "🗑️  Deleting merged branches from remote..."
echo ""

DELETED_COUNT=0
FAILED_COUNT=0

while IFS= read -r branch; do
    # Trim whitespace
    branch=$(echo "$branch" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
    if [ -n "$branch" ]; then
        echo -n "Deleting origin/$branch... "
        if git push origin --delete "$branch" >/dev/null 2>&1; then
            echo "✅"
            DELETED_COUNT=$((DELETED_COUNT + 1))
        else
            echo "❌ Failed"
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
    fi
done <<< "$MERGED_BRANCHES"

echo ""
echo "✨ Cleanup complete!"
echo "   Deleted: $DELETED_COUNT branches"
if [ $FAILED_COUNT -gt 0 ]; then
    echo "   Failed: $FAILED_COUNT branches"
fi

# Clean up local tracking branches
echo ""
echo "🧹 Cleaning up local tracking branches..."
git fetch origin --prune

echo ""
echo "✅ Done!"
