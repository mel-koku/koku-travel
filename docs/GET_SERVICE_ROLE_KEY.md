# How to Get Your Supabase Service Role Key

The seed script requires `SUPABASE_SERVICE_ROLE_KEY` to insert data into your Supabase database.

## Quick Steps

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to API Settings**
   - Click **Project Settings** (gear icon in left sidebar)
   - Click **API** in the settings menu

3. **Find the Service Role Key**
   - Scroll down to **Project API keys** section
   - Look for **`service_role`** key (NOT the `anon` key)
   - Click the **eye icon** or **copy icon** to reveal/copy it
   - ⚠️ **Warning**: This key has admin privileges - keep it secret!

4. **Add to Your `.env.local` File**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXJwcm9qZWN0cmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTk5ODk5OSwiZXhwIjoxOTYxNTc0OTk5fQ.your-actual-key-here
   ```

5. **Run the Seed Script Again**
   ```bash
   npm run seed:locations
   ```

## Important Notes

- ⚠️ **Never commit** `.env.local` to git (it's already in `.gitignore`)
- ⚠️ **Never expose** the service role key in client-side code
- ✅ The service role key bypasses Row Level Security (RLS) - that's why it's needed for seeding
- ✅ The `anon` key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is safe for client-side use

## Troubleshooting

### "Key not found" or "Invalid key"
- Make sure you copied the **`service_role`** key, not the `anon` key
- Check for extra spaces or line breaks when pasting
- The key should start with `eyJ...` (it's a JWT token)

### "Permission denied"
- Verify you're using the service_role key (not anon key)
- Check that the key hasn't been rotated/reset in Supabase

### Still having issues?
- Check that your `.env.local` file is in the project root
- Verify the variable name is exactly: `SUPABASE_SERVICE_ROLE_KEY`
- Make sure there are no quotes around the value (unless the key itself contains spaces, which is unlikely)

