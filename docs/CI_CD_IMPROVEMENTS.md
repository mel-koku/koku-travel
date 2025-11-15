# CI/CD Improvements Quick Reference

This document provides actionable steps to enhance the CI/CD pipeline based on the examination report.

---

## Quick Wins (Can implement today)

### 1. Add Security Scanning to CI

**File:** `.github/workflows/ci.yml`

Add this job after the `type-check` job:

```yaml
  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run security audit
        run: npm audit --audit-level=moderate
```

### 2. Add Test Coverage Script

**File:** `package.json`

Add to scripts:
```json
{
  "test:coverage": "vitest run --coverage",
  "test:watch": "vitest watch"
}
```

### 3. Add Coverage Reporting to CI

**File:** `.github/workflows/ci.yml`

Add to test job:
```yaml
      - name: Run tests with coverage
        run: npm run test:coverage
        env:
          CI: true

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/coverage-final.json
```

### 4. Fail Fast on Missing Secrets

**File:** `.github/workflows/ci.yml`

Add before build step:
```yaml
      - name: Validate required secrets
        run: |
          if [ -z "${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}" ]; then
            echo "❌ Missing NEXT_PUBLIC_SUPABASE_URL secret"
            exit 1
          fi
          if [ -z "${{ secrets.SANITY_PROJECT_ID }}" ]; then
            echo "❌ Missing SANITY_PROJECT_ID secret"
            exit 1
          fi
          echo "✅ All required secrets present"
```

---

## Medium Priority Improvements

### 5. Add Build Artifact Storage

**File:** `.github/workflows/ci.yml`

Add after build step:
```yaml
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: build-artifacts
          path: .next
          retention-days: 7
```

### 6. Add Deployment Verification Job

**File:** `.github/workflows/deploy.yml` (new file)

```yaml
name: Deploy Verification

on:
  workflow_run:
    workflows: ["CI"]
    types:
      - completed

jobs:
  verify-deployment:
    name: Verify Deployment
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    
    steps:
      - name: Wait for Vercel deployment
        run: sleep 30

      - name: Health check
        run: |
          DEPLOY_URL="${{ secrets.VERCEL_DEPLOYMENT_URL }}"
          if curl -f "$DEPLOY_URL/api/health" > /dev/null 2>&1; then
            echo "✅ Deployment healthy"
          else
            echo "❌ Deployment health check failed"
            exit 1
          fi
```

### 7. Add Performance Testing

**File:** `.github/workflows/ci.yml`

Add new job:
```yaml
  performance:
    name: Performance Check
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:3000
          uploadArtifacts: true
          temporaryPublicStorage: true
```

---

## Advanced Improvements

### 8. Add Build Matrix Testing

**File:** `.github/workflows/ci.yml`

Modify test job:
```yaml
  test:
    name: Test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"
      # ... rest of steps
```

### 9. Add Notifications

**File:** `.github/workflows/ci.yml`

Add at end of workflow:
```yaml
      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'CI pipeline failed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 10. Enable Dependabot Security Updates

**File:** `.github/dependabot.yml`

Add at top level:
```yaml
version: 2
updates:
  # ... existing config ...
  
  # Enable security updates
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    open-pull-requests-limit: 5
    labels:
      - "security"
      - "dependencies"
```

---

## Vercel-Specific Improvements

### 11. Add Vercel Build Configuration

**File:** `vercel.json` (create new)

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 12. Add Deployment Hooks

**File:** `package.json`

Add scripts:
```json
{
  "vercel-build": "npm run build && npm run postbuild",
  "postbuild": "node scripts/postbuild.js"
}
```

Create `scripts/postbuild.js`:
```javascript
// Run migrations, seed data, etc.
console.log('Running post-build tasks...');
```

### 13. Configure Vercel Environment Variables

Use Vercel CLI or Dashboard to set:
- Production: All required vars
- Preview: Same as production (or staging values)
- Development: Local development values

---

## Testing Improvements

### 14. Add E2E Tests

**Install Playwright:**
```bash
npm install -D @playwright/test
npx playwright install
```

**File:** `playwright.config.ts`
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  },
});
```

**File:** `.github/workflows/e2e.yml`
```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm run start &
      - run: npx playwright test
```

---

## Monitoring Integration

### 15. Link Sentry to Deployments

**File:** `.github/workflows/ci.yml`

Add to build step:
```yaml
      - name: Create Sentry release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        with:
          environment: production
          version: ${{ github.sha }}
```

---

## Checklist for Implementation

- [ ] Add security scanning
- [ ] Add test coverage reporting
- [ ] Add deployment verification
- [ ] Add performance testing
- [ ] Add build artifact storage
- [ ] Add notifications
- [ ] Enable Dependabot security updates
- [ ] Add E2E tests
- [ ] Integrate Sentry releases
- [ ] Configure Vercel build settings

---

**Priority Order:**
1. Security scanning (Critical)
2. Test coverage (High)
3. Deployment verification (High)
4. Performance testing (Medium)
5. Everything else (Low)

---

**Last Updated:** December 2024

