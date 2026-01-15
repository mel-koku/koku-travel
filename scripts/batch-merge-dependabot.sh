#!/bin/bash
# Batch merge passing Dependabot PRs
# Requires GitHub CLI (gh) to be installed and authenticated

set -e

echo "🔍 Fetching open Dependabot PRs..."

# Fetch all PRs with dependencies label
PRS=$(gh pr list --label "dependencies" --label "automated" --state open --json number,title,statusCheckRollup --jq '.[] | select(.statusCheckRollup[]?.conclusion == "SUCCESS") | .number')

if [ -z "$PRS" ]; then
  echo "✅ No passing Dependabot PRs found to merge"
  exit 0
fi

echo "📋 Found passing PRs:"
echo "$PRS" | while read pr_number; do
  if [ ! -z "$pr_number" ]; then
    title=$(gh pr view $pr_number --json title --jq '.title')
    echo "  - PR #$pr_number: $title"
  fi
done

echo ""
read -p "Do you want to merge these PRs? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled"
  exit 0
fi

echo "🚀 Merging PRs..."
echo "$PRS" | while read pr_number; do
  if [ ! -z "$pr_number" ]; then
    echo "Merging PR #$pr_number..."
    gh pr merge $pr_number --squash --auto || echo "⚠️  Failed to merge PR #$pr_number"
  fi
done

echo "✅ Done!"
