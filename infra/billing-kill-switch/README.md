# Billing kill switch (Layer 2 nuclear backstop)

Cloud Function that detaches billing from the GCP project when a Budget alert reports actual cost has met or exceeded the budgeted amount. Once detached, every paid Google API on the project (Vertex, Places, Geocoding) fails immediately. Recovery is manual via the GCP Console.

This is the "everything else failed" backstop. **Layer 1 — per-request cost reservation in `src/lib/api/costGate.ts` + `src/lib/api/costLimit.ts` — is the primary control** and refuses individual requests at the budget cap (currently $2/day-user, $50/hr-global). Layer 2 fires only if Layer 1 somehow lets cost run away (e.g. compromised credentials, a new endpoint someone forgot to gate).

## Deploy

Prereqs: `gcloud` authenticated to the target project, your account must have `roles/billing.admin` on the billing account.

```bash
PROJECT_ID=$(gcloud config get-value project)
BILLING_ACCOUNT_ID=$(gcloud beta billing projects describe "$PROJECT_ID" --format='value(billingAccountName.basename())')

# 1. Pub/Sub topic the Budget will publish alerts to.
gcloud pubsub topics create billing-alerts

# 2. Deploy the function.
gcloud functions deploy billing-kill-switch \
  --runtime=nodejs20 \
  --trigger-topic=billing-alerts \
  --region=us-central1 \
  --entry-point=killBilling \
  --set-env-vars=GCP_PROJECT_ID=$PROJECT_ID \
  --source=.

# 3. Grant the function's runtime service account billing-admin on the
#    billing account so it can detach. After step 2, find the SA email:
FUNCTION_SA=$(gcloud functions describe billing-kill-switch \
  --region=us-central1 --format='value(serviceAccountEmail)')

gcloud beta billing accounts add-iam-policy-binding "$BILLING_ACCOUNT_ID" \
  --member="serviceAccount:$FUNCTION_SA" \
  --role=roles/billing.admin
```

Then in the **Cloud Console** (Budget setup is not scriptable cleanly):

1. Billing → Budgets & alerts → **Create budget**
2. Scope: this project only
3. Amount: see threshold guidance below
4. Notifications: toggle "Connect a Pub/Sub topic" → select `billing-alerts`
5. Threshold rules: at minimum, an alert at **100% actual** (this is the one that triggers the detach). Optional softer alerts at 50% / 75% / 90% just send email.

## Threshold guidance

Set this **way above expected spend**. With Layer 1 in place:

- Per-user cap: $2/day. A thousand active users = $2000/day theoretical max.
- Realistic usage: <$10/day total at current scale.

Suggested daily budget: **$500/day actual**. Huge headroom over realistic spend, still catches catastrophic runaway. Adjust upward as the business grows.

If you set this near expected spend, normal traffic spikes will detach billing and effectively kill the site.

## Recovery

When this fires:

1. Investigate why. Check Cloud Function logs (`gcloud functions logs read billing-kill-switch`), Layer 1 cost metrics, recent deploys, audit API usage for compromised credentials.
2. Fix the root cause.
3. Cloud Console → Billing → re-link billing account to project.

## Local test

The function is a single Pub/Sub handler; you can invoke it directly with a fake message to verify the parser:

```bash
GCP_PROJECT_ID=fake-project node -e "
const { killBilling } = require('./index.js');
const msg = { data: Buffer.from(JSON.stringify({
  costAmount: 600, budgetAmount: 500
})).toString('base64') };
killBilling(msg).catch(e => console.error(e));
"
```

This will fail at the GCP API call (no creds, fake project), which is correct — the parser ran fine.
