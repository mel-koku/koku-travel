# GitHub Branch Protection Rules Guide

## How to Modify Branch Protection Rules

### Step 1: Navigate to Repository Settings
1. Go to your repository: `https://github.com/mel-koku/koku-travel`
2. Click on **Settings** (top navigation bar)
3. In the left sidebar, click **Rules** (under "Code and automation")

### Step 2: Edit Branch Protection Rules
1. Find the rule for `main` branch (or create one if it doesn't exist)
2. Click **Edit** on the existing rule

### Step 3: Modify Protection Settings

#### Option A: Disable Pull Request Requirement (Recommended)
Uncheck these options:
- ❌ **Require a pull request before merging**
  - This removes the requirement for PRs
  - You can still create PRs if you want, but they won't be required

#### Option B: Keep PRs but Allow Direct Pushes
If you want to keep PRs as an option but allow direct pushes:
- ✅ Keep **Require a pull request before merging** checked
- ✅ Check **Allow specified actors to bypass required pull requests**
  - Add yourself or a team that can bypass

#### Option C: Remove All Restrictions (Not Recommended)
- Uncheck all protection rules
- ⚠️ **Warning**: This removes all safety checks

### Step 4: Handle Merge Commit Restriction
If you see **"This branch must not contain merge commits"**:
- Uncheck **Require linear history**
- Or check **Allow merge commits** if that option exists

### Step 5: Save Changes
- Click **Save changes** or **Update branch rule**

## Recommended Settings for Development

For a solo developer or small team:

```
✅ Require a pull request before merging: OFF
✅ Require linear history: OFF
✅ Allow merge commits: ON
✅ Allow force pushes: OFF (keep this for safety)
✅ Allow deletions: OFF (keep this for safety)
```

## Alternative: Create a Different Branch Strategy

Instead of changing main branch rules, you could:

1. **Use a `develop` branch** for direct pushes
2. **Keep `main` protected** for releases only
3. **Merge `develop` → `main`** via PR when ready

## Quick Access Links

- **Repository Rules**: `https://github.com/mel-koku/koku-travel/settings/rules`
- **Branch Protection**: `https://github.com/mel-koku/koku-travel/settings/branches`

## Notes

- Changes take effect immediately
- Existing PRs are not affected
- You can always re-enable protection later
- Consider keeping some protections (like requiring status checks) even if PRs aren't required

