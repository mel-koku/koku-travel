# Pull Request Management Guide

## Quick Reference

### Automated Triage Workflow

1. **Check PR status** - Open PRs are automatically tested by CI
2. **Passing CI + Minor/Patch** → Auto-merge (if enabled) or quick review
3. **Passing CI + Major** → Review changelog, test locally, then merge
4. **Failing CI** → Investigate, fix, then merge

### Your PRs
1. Review and merge PRs as needed

### Dependabot PRs - Recommended Actions

#### ✅ Safe to Auto-Merge (Passing CI, Minor/Patch)
- Testing group updates
- Dev tools updates  
- Type definition updates
- GitHub Actions updates

#### ⚠️ Review Before Merging (Major Version or Failing CI)
- Major version updates (web-vitals 5.x, etc.)
- Failing CI checks
- Critical dependencies (@supabase/supabase-js, next, react)

## Strategy

### Daily Workflow (5 minutes)
1. Check GitHub notifications for new Dependabot PRs
2. If CI passes and it's minor/patch → Merge immediately (or let auto-merge handle it)
3. If CI fails → Add to review queue

### Weekly Workflow (30 minutes)
1. Review all open PRs
2. Merge passing PRs in batches using the batch script
3. Fix failing PRs one at a time
4. Handle major version updates separately

### Monthly Workflow (1 hour)
1. Review ignored major version updates
2. Plan migration for critical dependencies
3. Update Dependabot config if needed

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

### Batch merge passing PRs
```bash
# Using GitHub CLI (requires gh CLI installed)
gh pr list --label "dependencies" --state open --json number,title | jq '.[] | .number' | xargs -I {} gh pr merge {} --squash

# Or use the provided script
./scripts/batch-merge-dependabot.sh
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

1. **Merge frequently** - Don't let PRs accumulate
2. **Test locally for major updates** - Always verify breaking changes
3. **Read changelogs** - Especially for major version updates
4. **Keep main stable** - Only merge when CI passes
5. **Batch similar updates** - Merge related packages together
6. **Use auto-merge** - Enable for safe minor/patch updates to reduce manual work

## Dependabot Configuration

Current settings:
- **Open PR limit**: 5 (reduced from 10)
- **Update frequency**: Weekly (Mondays at 09:00)
- **Grouping**: Enabled for related packages:
  - `nextjs-react`: next, react, react-dom, @types/react, @types/react-dom
  - `supabase`: @supabase/*
  - `testing`: vitest, @vitest/*, @testing-library/*, jsdom
  - `typescript-types`: typescript, @types/*
  - `dev-tools`: eslint*, tsx, tailwindcss, @tailwindcss/*
  - `dnd-kit`: @dnd-kit/*
- **Major updates**: Ignored for critical packages (next, react, react-dom, @supabase/supabase-js, web-vitals, mapbox-gl)

### Auto-Merge Workflow

An automated workflow (`.github/workflows/auto-merge-dependabot.yml`) is configured to:
- Auto-merge Dependabot PRs that pass CI
- Only merge minor/patch updates (not major versions)
- Use squash merge method

**Note**: Auto-merge requires branch protection rules to allow it. If you want to disable auto-merge, you can delete or disable the workflow file.

## Troubleshooting

### Too many PRs?
- Reduce `open-pull-requests-limit` further (currently 5)
- Increase update interval to bi-weekly
- Add more packages to ignore list

### PRs failing CI?
1. Check the error message in the PR
2. Review the package changelog for breaking changes
3. Test locally by checking out the PR branch
4. Fix issues and push updates

### Major version updates piling up?
- Review them monthly in a dedicated session
- Create a separate branch for major updates
- Consider upgrading critical packages together
