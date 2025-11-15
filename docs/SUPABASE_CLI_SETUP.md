# Supabase CLI Setup Guide

This guide explains how to use Supabase CLI with the Koku Travel project.

## Prerequisites

- Supabase CLI installed (already done via Homebrew)
- Access to your Supabase project dashboard
- Environment variables configured (see `env.local.example`)

## Installation

Supabase CLI has been installed via Homebrew. Verify installation:

```bash
supabase --version
```

## Initial Setup

### 1. Link to Remote Project

Link your local project to your remote Supabase project:

```bash
npm run supabase:link
```

Or manually:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**To find your project ref:**
1. Go to your Supabase Dashboard
2. Select your project
3. Go to Settings → General
4. Copy the "Reference ID" (it's the part after `https://` in your project URL, before `.supabase.co`)

**Example:**
If your Supabase URL is `https://abcdefghijklmnop.supabase.co`, your project ref is `abcdefghijklmnop`

You'll be prompted for your database password. This is the password you set when creating your Supabase project.

### 2. Verify Connection

Check the status of your linked project:

```bash
npm run supabase:status
```

## Common Commands

### Database Migrations

**Push migrations to remote database:**
```bash
npm run supabase:db:push
```

This will apply all migrations in `supabase/migrations/` to your remote database.

**Create a new migration:**
```bash
npm run supabase:migration:new migration_name
```

**Generate a migration from schema changes:**
```bash
npm run supabase:db:diff -f migration_name
```

**Reset local database (applies all migrations):**
```bash
npm run supabase:db:reset
```

### Local Development

**Start local Supabase instance:**
```bash
npm run supabase:start
```

This starts:
- PostgreSQL database (port 54322)
- Supabase API (port 54321)
- Supabase Studio (port 54323)
- Inbucket email testing (port 54324)

**Stop local Supabase:**
```bash
npm run supabase:stop
```

**Check status:**
```bash
npm run supabase:status
```

## Workflow

### Applying Migrations to Production

1. **Create migration** (if needed):
   ```bash
   npm run supabase:migration:new create_locations_table
   ```

2. **Edit the migration file** in `supabase/migrations/`

3. **Test locally** (optional):
   ```bash
   npm run supabase:start
   npm run supabase:db:reset
   npm run supabase:stop
   ```

4. **Push to remote**:
   ```bash
   npm run supabase:db:push
   ```

### Seeding Data

After migrations are applied, seed the database:

```bash
npm run seed:locations
```

**Note:** Requires `SUPABASE_SERVICE_ROLE_KEY` in your environment.

## Configuration

The Supabase CLI configuration is in `supabase/config.toml`. Key settings:

- **API Port**: 54321
- **Database Port**: 54322
- **Studio Port**: 54323
- **Migrations**: Enabled, reads from `supabase/migrations/`
- **Seeds**: Enabled, reads from `supabase/seed.sql` (if exists)

## Troubleshooting

### "Project not linked"

Run `npm run supabase:link` to link your project.

### "Database password incorrect"

1. Go to Supabase Dashboard → Settings → Database
2. Reset your database password if needed
3. Try linking again

### "Migration failed" or "duplicate key value violates unique constraint"

This error occurs when:
- Migrations were applied manually or through a different method
- Migration version already exists in `schema_migrations` table
- Multiple migrations share the same date prefix

**Solution:**

1. **Check existing migrations:**
   ```sql
   SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
   ```

2. **Fix migration tracking:**
   - Run `scripts/fix-migration-tracking.sql` in Supabase SQL Editor
   - Or manually insert missing migration records

3. **If migrations were renamed:**
   - Ensure renamed migrations have unique version identifiers
   - Migrations use format: `YYYYMMDD_description.sql` or `YYYYMMDDHHMMSS_description.sql`

4. **Retry push:**
   ```bash
   npm run supabase:db:push
   ```

### "Cannot connect to remote database"

1. Verify your project ref is correct
2. Check your internet connection
3. Ensure Supabase project is active (not paused)

## Local Development with Supabase

When developing locally, you can use a local Supabase instance:

1. **Start local Supabase:**
   ```bash
   npm run supabase:start
   ```

2. **Update `.env.local`** to use local URLs:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from supabase status>
   ```

3. **Run migrations locally:**
   ```bash
   npm run supabase:db:reset
   ```

4. **Seed data:**
   ```bash
   npm run seed:locations
   ```

5. **Start Next.js:**
   ```bash
   npm run dev
   ```

6. **Access Supabase Studio:**
   Open http://127.0.0.1:54323 in your browser

## Next Steps

After setting up:

1. ✅ Link to remote project: `npm run supabase:link`
2. ✅ Push migrations: `npm run supabase:db:push`
3. ✅ Seed locations: `npm run seed:locations`
4. ✅ Verify in production: Check `/explore` page

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Database Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Local Development Guide](https://supabase.com/docs/guides/cli/local-development)

