#!/bin/bash
# Git helper functions for feature branch management

# Create a new feature branch
create_feature() {
    if [ -z "$1" ]; then
        echo "Usage: create_feature <feature-name>"
        echo "Example: create_feature guides"
        return 1
    fi
    
    git checkout main
    git pull origin main
    git checkout -b "feature/$1"
    echo "✅ Created and switched to feature/$1"
}

# Switch to a feature branch
switch_feature() {
    if [ -z "$1" ]; then
        echo "Usage: switch_feature <feature-name>"
        echo "Example: switch_feature guides"
        return 1
    fi
    
    git checkout "feature/$1"
    echo "✅ Switched to feature/$1"
}

# List all feature branches
list_features() {
    echo "📋 Feature branches:"
    git branch --list "feature/*" | sed 's/^/  /'
}

# Delete a feature branch (local)
delete_feature() {
    if [ -z "$1" ]; then
        echo "Usage: delete_feature <feature-name>"
        echo "Example: delete_feature guides"
        return 1
    fi
    
    git checkout main
    git branch -d "feature/$1"
    echo "✅ Deleted feature/$1"
}

# Show branch status
branch_status() {
    echo "📍 Current branch: $(git branch --show-current)"
    echo "📊 Branch status:"
    git status --short
}

# Sync feature branch with main
sync_feature() {
    CURRENT_BRANCH=$(git branch --show-current)
    if [[ ! "$CURRENT_BRANCH" =~ ^feature/ ]]; then
        echo "❌ Not on a feature branch"
        return 1
    fi
    
    git checkout main
    git pull origin main
    git checkout "$CURRENT_BRANCH"
    git merge main
    echo "✅ Synced $CURRENT_BRANCH with main"
}

# Show help
show_help() {
    echo "Git Feature Branch Helpers"
    echo ""
    echo "Commands:"
    echo "  create_feature <name>    - Create new feature branch from main"
    echo "  switch_feature <name>     - Switch to feature branch"
    echo "  list_features             - List all feature branches"
    echo "  delete_feature <name>     - Delete local feature branch"
    echo "  branch_status             - Show current branch status"
    echo "  sync_feature              - Sync current feature branch with main"
    echo ""
    echo "Usage:"
    echo "  source scripts/git-helpers.sh"
    echo "  create_feature guides"
}

# If script is sourced, show help
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
    echo "Git helpers loaded! Use 'show_help' for commands."
fi

