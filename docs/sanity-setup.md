## Sanity Project Setup

Follow these steps to provision the shared Sanity project that will drive guide, itinerary, and blog content.

1. Install the Sanity CLI globally if you have not already:
   ```bash
   npm install -g @sanity/cli
   ```
2. Authenticate with Sanity and create the project (replace the placeholder values as needed):
   ```bash
   sanity login
   sanity init --project ${DESIRED_NAME} --dataset production --template clean
   ```
   - Choose the existing Vite/React project option when prompted so the CLI skips creating a new frontend.
   - Use `production` for the initial dataset. We will add a `development` dataset later when workflows stabilize.
3. Navigate to the [Sanity Manage](https://www.sanity.io/manage) UI for the project:
   - Invite other collaborators with the **Editor** role.
   - Create a dedicated **API token** with **Read** access for frontend data fetching.
   - (Optional) Create a separate token with **Write** access if we later need server-side mutations.
4. Record the following values and place them in your local `.env.local` file (see `env.local.example`):
   - `SANITY_PROJECT_ID`
   - `SANITY_DATASET` (default `production`)
   - `SANITY_API_READ_TOKEN`
   - `SANITY_API_WRITE_TOKEN` (only required for local import scripts)
   - `SANITY_API_VERSION` (optional override; defaults to the date in the example file)
   - `SANITY_REVALIDATE_SECRET` (shared with Sanity webhook for ISR)
5. Generate a random secret for preview mode:
   ```bash
   openssl rand -base64 32
   ```
   Store the value as `SANITY_PREVIEW_SECRET`.
6. Commit only the `.env.example` template—**never** commit real secrets.

Once these steps are complete, you can run the Sanity Studio locally (added in a later task) with:
```bash
npm run sanity:dev
```

## Configure Webhooks

1. In the Sanity Manage UI, create a new webhook (Project settings → API → Webhooks).
2. Set the target URL to your deployed Next.js endpoint: `https://<your-domain>/api/revalidate`.
3. Deliver the webhook on document **create**, **update**, and **delete** events.
4. Provide the `SANITY_REVALIDATE_SECRET` you created earlier. The webhook payload should include:
   ```jsonc
   {
     "slug": { "current": "${document.slug.current}" },
     "_type": "${document._type}"
   }
   ```
5. Optionally scope the webhook to only fire for `guide`, `destination`, `itinerary`, and `blogPost` types.

## Post-Import Validation

1. Run `npm run dev` and ensure the guide grid at `/guides` renders the imported Sanity documents.
2. Save a guide to bookmarks and verify it appears under `/guides/bookmarks`.
3. Visit `/dashboard` and confirm the guide bookmark count reflects the saved items.
4. Open `/trip-builder` to confirm the workflow still loads (it currently relies on local seed data).
5. (Optional) Trigger a webhook by publishing a guide and confirm the updated content appears after a refresh.

