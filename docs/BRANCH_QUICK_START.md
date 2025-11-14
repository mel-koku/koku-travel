# Quick Start: Feature Branch Workflow

## Initial Setup

1. **Make the scripts executable:**
   ```bash
   chmod +x scripts/create-feature-branches.sh
   chmod +x scripts/git-helpers.sh
   ```

2. **Create all feature branches:**
   ```bash
   ./scripts/create-feature-branches.sh
   ```

3. **Load git helpers (optional):**
   ```bash
   source scripts/git-helpers.sh
   ```

## Daily Workflow

### Starting Work on a Feature

```bash
# Option 1: Use helper function
source scripts/git-helpers.sh
create_feature guides

# Option 2: Manual
git checkout main
git pull origin main
git checkout -b feature/guides
```

### Making Changes

1. Make your changes
2. Commit frequently with descriptive messages:
   ```bash
   git add .
   git commit -m "feat(guides): add guide bookmark functionality"
   ```

### Syncing with Main

```bash
# Option 1: Use helper
sync_feature

# Option 2: Manual
git checkout main
git pull origin main
git checkout feature/guides
git merge main
```

### Pushing Changes

```bash
git push origin feature/guides
```

### Creating Pull Request

1. Push your branch
2. Go to GitHub/GitLab
3. Create pull request from `feature/guides` to `main`
4. Add description and reviewers
5. Wait for review and approval

### After Merge

```bash
# Delete local branch
git checkout main
git pull origin main
git branch -d feature/guides

# Delete remote branch (if needed)
git push origin --delete feature/guides
```

## Commit Message Convention

Use conventional commits format:

- `feat(guides): add bookmark feature`
- `fix(itinerary): resolve time calculation bug`
- `refactor(ui): improve button component`
- `docs(readme): update setup instructions`
- `test(guides): add bookmark tests`

## Branch Naming

- Features: `feature/<name>`
- Bug fixes: `bugfix/<description>`
- Hotfixes: `hotfix/<description>`
- Refactoring: `refactor/<component>`
- Documentation: `docs/<topic>`

## Common Commands

```bash
# See all branches
git branch -a

# See current branch
git branch --show-current

# See what changed
git status
git diff

# See commit history
git log --oneline --graph --all

# Stash changes
git stash
git stash pop
```

## Troubleshooting

### Branch is behind main
```bash
sync_feature
# or manually merge main into your branch
```

### Accidentally committed to main
```bash
# Create branch from current state
git branch feature/my-feature
# Reset main to origin
git reset --hard origin/main
# Switch to feature branch
git checkout feature/my-feature
```

### Need to undo last commit
```bash
git reset --soft HEAD~1  # Keep changes
git reset --hard HEAD~1  # Discard changes
```

