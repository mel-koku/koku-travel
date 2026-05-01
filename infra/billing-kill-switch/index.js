const { CloudBillingClient } = require("@google-cloud/billing");

// PROJECT_ID is injected as an env var at deploy time so the function knows
// which project to detach. The function's service account must hold
// roles/billing.admin on the billing account (see README).
const PROJECT_NAME = `projects/${process.env.GCP_PROJECT_ID}`;

const billing = new CloudBillingClient();

/**
 * Pub/Sub-triggered Cloud Function. GCP Budget alerts publish JSON messages
 * to the topic this function subscribes to; when actual cost meets or
 * exceeds the budgeted amount, this function detaches billing from the
 * project — instantly killing all paid Google APIs (Vertex, Places,
 * Geocoding) on the project.
 *
 * Recovery is manual: re-attach billing in the GCP Console. This is the
 * "everything else failed" backstop. Threshold should be set far above
 * expected spend so it never fires on legitimate traffic.
 */
exports.killBilling = async (pubsubMessage) => {
  let body;
  try {
    const data = pubsubMessage.data
      ? Buffer.from(pubsubMessage.data, "base64").toString()
      : "{}";
    body = JSON.parse(data);
  } catch (err) {
    console.error("Failed to parse Pub/Sub message:", err);
    return;
  }

  const { costAmount = 0, budgetAmount = 0 } = body;
  console.log("Budget alert received", { costAmount, budgetAmount });

  // Forecast or under-threshold notifications also land here. Only act on
  // actual overshoots — costAmount is current spend; budgetAmount is the
  // configured budget. costAmount >= budgetAmount means we've blown it.
  if (costAmount < budgetAmount) {
    return;
  }

  const [billingInfo] = await billing.getProjectBillingInfo({
    name: PROJECT_NAME,
  });
  if (!billingInfo.billingEnabled) {
    console.log("Billing already disabled — no-op.");
    return;
  }

  await billing.updateProjectBillingInfo({
    name: PROJECT_NAME,
    projectBillingInfo: { billingAccountName: "" },
  });

  // Surface as error so it pages whoever watches Cloud Function logs.
  console.error("BILLING DETACHED on budget overshoot", {
    costAmount,
    budgetAmount,
    project: PROJECT_NAME,
  });
};
