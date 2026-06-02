import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const stripeApiVersion = "2026-02-25.clover";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erreur inconnue.";

const getEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variable serveur manquante : ${name}.`);
  return value;
};

const encodeForm = (data: Record<string, string>) => {
  const form = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => form.append(key, value));
  return form;
};

const getProject = async (projectId: string) => {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/video_projects?id=eq.${encodeURIComponent(projectId)}&select=id,pilot_name,customer_email,amount_cents,currency,payment_status`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || "Impossible de lire le dossier.");
  const project = Array.isArray(data) ? data[0] : null;
  if (!project) throw new Error("Dossier introuvable.");
  return project;
};

const updateProjectCheckoutSession = async (projectId: string, sessionId: string) => {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(`${supabaseUrl}/rest/v1/video_projects?id=eq.${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payment_status: "pending",
      stripe_checkout_session_id: sessionId,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || "Impossible de mettre à jour le dossier.");
  }
};

const createStripeCheckoutSession = async (project: any) => {
  const stripeSecretKey = getEnv("STRIPE_SECRET_KEY");
  const siteUrl = getEnv("SITE_URL").replace(/\/$/, "");
  const amount = Number(project.amount_cents || 7900);
  const currency = String(project.currency || "eur").toLowerCase();
  const pilotName = project.pilot_name ? ` pour ${project.pilot_name}` : "";

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": stripeApiVersion,
    },
    body: encodeForm({
      mode: "payment",
      customer_email: project.customer_email,
      success_url: `${siteUrl}/?payment=success&project=${project.id}`,
      cancel_url: `${siteUrl}/?payment=cancelled&project=${project.id}`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": currency,
      "line_items[0][price_data][unit_amount]": String(amount),
      "line_items[0][price_data][product_data][name]": `Vidéo souvenir Souvenir de Paddock${pilotName}`,
      "line_items[0][price_data][product_data][description]":
        "Vidéo souvenir personnalisée d'environ une minute, livrée sous 7 jours maximum après réception des éléments complets.",
      "metadata[project_id]": project.id,
      "payment_intent_data[metadata][project_id]": project.id,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Erreur Stripe Checkout.");
  return data;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Méthode non autorisée." }, 405);

  try {
    const { projectId } = await request.json();
    if (!projectId || typeof projectId !== "string") {
      return jsonResponse({ error: "projectId est obligatoire." }, 400);
    }

    const project = await getProject(projectId);
    if (project.payment_status === "paid") {
      return jsonResponse({ error: "Ce dossier est déjà payé." }, 400);
    }
    if (!project.customer_email) {
      return jsonResponse({ error: "Email client manquant." }, 400);
    }

    const session = await createStripeCheckoutSession(project);
    await updateProjectCheckoutSession(project.id, session.id);
    return jsonResponse({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
