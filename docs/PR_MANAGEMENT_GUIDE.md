# Pull Request Management Guide

## Quick Reference

### Your PRs
1. **Fix/vercel build sanity config (#10)** - Wait for CI to pass, then merge

### Dependabot PRs - Recommended Actions

#### ✅ Safe to Merge (Passing CI)
- **#6**: Testing group updates - Merge
- **#3**: Next.js/React group updates - Merge  
- **#2**: actions/setup-node update - Merge

#### ⚠️ Review Before Merging (Failing CI)
- **#8**: web-vitals 4.2.4 → 5.1.0 (Major version) - Check breaking changes
- **#7**: eslint-config-next - Check ESLint config compatibility
- **#5**: @supabase/supabase-js - Check Supabase API changes
- **#4**: @sanity/webhook 3.0.1 → 4.0.0 (Major version) - Review breaking changes
- **#1**: actions/checkout - Usually safe, check CI errors

## Strategy

### Step 1: Merge Your Fix First
Wait for your PR (#10) to pass CI, then merge it. This ensures main branch is stable.

### Step 2: Merge Passing Dependabot PRs
Merge the passing PRs (#6, #3, #2) in order:
1. Start with GitHub Actions updates (#2)
2. Then testing dependencies (#6)
3. Finally Next.js/React updates (#3)

### Step 3: Fix Failing Dependabot PRs
For each failing PR:

1. **Check the CI error** - Click on the PR to see what failed
2. **Review changelog** - Check the package's release notes for breaking changes
3. **Update code if needed** - Fix any breaking changes
4. **Re-run CI** - Push fixes and verify tests pass
5. **Merge** - Once CI passes

### Step 4: Handle Major Version Updates Carefully

Major version updates (web-vitals 5.x, sanity/webhook 4.x) require:
- Reading the migration guide
- Testing thoroughly
- Updating code to match new APIs
- Consider creating a separate branch for major updates

## Quick Commands

### Check PR status locally
```bash
# Fetch latest changes
git fetch origin

# Check out a dependabot PR locally
git fetch origin pull/PR_NUMBER/head:pr-PR_NUMBER
git checkout pr-PR_NUMBER

# Test locally
npm ci
npm run lint
npm run test
npm run build
```

### Merge strategy
```bash
# After merging your PR, update main
git checkout main
git pull origin main

# For each dependabot PR, merge via GitHub UI or:
git checkout -b review-dependabot-PR_NUMBER
git merge origin/dependabot/BRANCH_NAME
# Fix any issues, then push
```

## Best Practices

1. **One PR at a time** - Merge PRs sequentially to avoid conflicts
2. **Test locally first** - Check out failing PRs and test them
3. **Read changelogs** - Especially for major version updates
4. **Update in order** - Dependencies → Dev tools → Application code
5. **Keep main stable** - Only merge when CI passes

## Dependabot Configuration

Your `.github/dependabot.yml` is configured to:
- Group related packages (Next.js/React, Sanity, Supabase, Testing)
- Ignore major version updates for critical packages
- Create PRs weekly on Mondays
- Limit to 10 open PRs

Consider adjusting if you get overwhelmed:
- Reduce `open-pull-requests-limit` to 5
- Increase update interval
- Add more packages to ignore list

