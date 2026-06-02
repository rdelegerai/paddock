import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const toleranceSeconds = 300;
const defaultNotificationEmail = "rdeleger.ai@gmail.com";

type Project = {
  id: string;
  pilot_name: string;
  customer_email: string | null;
  contact_email: string | null;
  final_story: string | null;
  generated_story: string | null;
  answers: Record<string, string> | null;
  photo_files: unknown[] | null;
  admin_token: string | null;
  amount_cents: number | null;
  currency: string | null;
  paid_at: string | null;
  owner_notified_at: string | null;
  customer_notified_at: string | null;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erreur inconnue.";

const getEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variable serveur manquante : ${name}.`);
  return value;
};

const getOptionalEnv = (name: string) => Deno.env.get(name) || "";

const projectSelect = [
  "id",
  "pilot_name",
  "customer_email",
  "contact_email",
  "final_story",
  "generated_story",
  "answers",
  "photo_files",
  "admin_token",
  "amount_cents",
  "currency",
  "paid_at",
  "owner_notified_at",
  "customer_notified_at",
].join(",");

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatAmount = (amountCents?: number | null, currency?: string | null) => {
  const amount = Number(amountCents || 7900) / 100;
  const suffix = String(currency || "eur").toLowerCase() === "eur" ? "€" : String(currency || "").toUpperCase();
  return `${amount.toFixed(2).replace(".", ",")} ${suffix}`.trim();
};

const formatDate = (isoDate?: string | null) => {
  if (!isoDate) return "";
  return new Date(isoDate).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
};

const answerRows = (answers: Record<string, string> | null) => {
  const labels: Record<string, string> = {
    pilotName: "Nom du pilote",
    discipline: "Discipline",
    startStory: "Début de l'histoire",
    vehicleAndPlaces: "Voitures, circuits, rallyes ou lieux",
    proudMoment: "Plus beau souvenir",
    hardMoment: "Difficulté ou anecdote",
    keyPeople: "Personnes à remercier ou citer",
    familyMessage: "Message final",
    webNotes: "Notes ou biographie",
    contactEmail: "Email client",
  };

  return Object.entries(labels)
    .map(([key, label]) => {
      const value = answers?.[key]?.trim();
      if (!value) return "";
      return `<p><strong>${escapeHtml(label)} :</strong><br>${escapeHtml(value).replaceAll("\n", "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
};

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const computeSignature = async (secret: string, payload: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(signature);
};

const getProject = async (projectId: string): Promise<Project> => {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/video_projects?id=eq.${encodeURIComponent(projectId)}&select=${projectSelect}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || "Impossible de lire le dossier payé.");
  const project = Array.isArray(data) ? data[0] : null;
  if (!project) throw new Error("Dossier payé introuvable.");
  return project;
};

const verifyStripeSignature = async (body: string, signatureHeader: string | null) => {
  if (!signatureHeader) throw new Error("Signature Stripe manquante.");
  const webhookSecret = getEnv("STRIPE_WEBHOOK_SECRET");
  const signatures: string[] = [];
  let timestamp = "";

  signatureHeader.split(",").forEach((part) => {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) return;

    const key = part.slice(0, separatorIndex);
    const value = part.slice(separatorIndex + 1);
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  });

  if (!timestamp || signatures.length === 0) throw new Error("Signature Stripe invalide.");

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    throw new Error("Signature Stripe expirée.");
  }

  const expected = await computeSignature(webhookSecret, `${timestamp}.${body}`);
  if (!signatures.some((signature) => timingSafeEqual(expected, signature))) {
    throw new Error("Signature Stripe incorrecte.");
  }
};

const markProjectPaid = async (session: any): Promise<Project> => {
  const projectId = session.metadata?.project_id;
  if (!projectId) throw new Error("project_id manquant dans la session Stripe.");

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/video_projects?id=eq.${encodeURIComponent(projectId)}&payment_status=neq.paid&select=${projectSelect}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "submitted",
        payment_status: "paid",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent || null,
        paid_at: new Date().toISOString(),
      }),
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Impossible de confirmer le paiement.");
  }

  const updatedProject = Array.isArray(data) ? data[0] : null;
  return updatedProject || await getProject(projectId);
};

const markNotificationSent = async (projectId: string, field: "owner_notified_at" | "customer_notified_at") => {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(`${supabaseUrl}/rest/v1/video_projects?id=eq.${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ [field]: new Date().toISOString() }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || "Impossible de marquer la notification comme envoyée.");
  }
};

const sendEmail = async (to: string, subject: string, html: string, text: string) => {
  const resendApiKey = getEnv("RESEND_API_KEY");
  const from = getEnv("EMAIL_FROM");
  const replyTo = getOptionalEnv("REPLY_TO_EMAIL") || getOptionalEnv("NOTIFICATION_EMAIL") || defaultNotificationEmail;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      reply_to: replyTo,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "Erreur envoi email Resend.");
};

const ownerEmail = (project: Project) => {
  const photoCount = Array.isArray(project.photo_files) ? project.photo_files.length : 0;
  const story = project.final_story || project.generated_story || "";
  const subject = `Nouvelle commande payée - ${project.pilot_name || "Pilote"}`;
  const html = `
    <h1>Nouvelle commande payée</h1>
    <p><strong>ID dossier :</strong> ${escapeHtml(project.id)}</p>
    <p><strong>Pilote :</strong> ${escapeHtml(project.pilot_name || "Non renseigné")}</p>
    <p><strong>Email client :</strong> ${escapeHtml(project.customer_email || project.contact_email || "Non renseigné")}</p>
    <p><strong>Montant :</strong> ${escapeHtml(formatAmount(project.amount_cents, project.currency))}</p>
    <p><strong>Paiement confirmé le :</strong> ${escapeHtml(formatDate(project.paid_at))}</p>
    <p><strong>Nombre de photos :</strong> ${photoCount}</p>
    <h2>Texte final</h2>
    <p>${escapeHtml(story).replaceAll("\n", "<br>")}</p>
    <h2>Réponses client</h2>
    ${answerRows(project.answers)}
  `;
  const text = [
    "Nouvelle commande payée",
    `ID dossier : ${project.id}`,
    `Pilote : ${project.pilot_name || "Non renseigné"}`,
    `Email client : ${project.customer_email || project.contact_email || "Non renseigné"}`,
    `Montant : ${formatAmount(project.amount_cents, project.currency)}`,
    `Paiement confirmé le : ${formatDate(project.paid_at)}`,
    `Nombre de photos : ${photoCount}`,
    "",
    "Texte final :",
    story,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
};

const customerEmail = (project: Project) => {
  const subject = "Confirmation de votre commande Souvenir de Paddock";
  const html = `
    <h1>Commande confirmée</h1>
    <p>Bonjour,</p>
    <p>Votre commande Souvenir de Paddock est bien confirmée pour ${escapeHtml(project.pilot_name || "le pilote renseigné")}.</p>
    <p><strong>Montant :</strong> ${escapeHtml(formatAmount(project.amount_cents, project.currency))}</p>
    <p><strong>Délai annoncé :</strong> 7 jours calendaires maximum après paiement et réception des éléments complets.</p>
    <p>Je vais maintenant préparer la vidéo souvenir à partir des informations et photos transmises.</p>
    <p>Si une information manque, je vous recontacterai par email.</p>
    <p>Bien cordialement,<br>Renan<br>Souvenir de Paddock</p>
  `;
  const text = [
    "Bonjour,",
    "",
    `Votre commande Souvenir de Paddock est bien confirmée pour ${project.pilot_name || "le pilote renseigné"}.`,
    `Montant : ${formatAmount(project.amount_cents, project.currency)}`,
    "Délai annoncé : 7 jours calendaires maximum après paiement et réception des éléments complets.",
    "",
    "Je vais maintenant préparer la vidéo souvenir à partir des informations et photos transmises.",
    "Si une information manque, je vous recontacterai par email.",
    "",
    "Bien cordialement,",
    "Renan",
    "Souvenir de Paddock",
  ].join("\n");

  return { subject, html, text };
};

const sendPaymentNotifications = async (project: Project) => {
  const notificationEmail = getOptionalEnv("NOTIFICATION_EMAIL") || defaultNotificationEmail;

  if (!project.owner_notified_at) {
    const email = ownerEmail(project);
    await sendEmail(notificationEmail, email.subject, email.html, email.text);
    await markNotificationSent(project.id, "owner_notified_at");
  }

  const toCustomer = project.customer_email || project.contact_email;
  if (toCustomer && !project.customer_notified_at) {
    const email = customerEmail(project);
    await sendEmail(toCustomer, email.subject, email.html, email.text);
    await markNotificationSent(project.id, "customer_notified_at");
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Méthode non autorisée." }, 405);

  try {
    const body = await request.text();
    await verifyStripeSignature(body, request.headers.get("stripe-signature"));

    const event = JSON.parse(body);
    if (event.type === "checkout.session.completed") {
      const project = await markProjectPaid(event.data.object);
      await sendPaymentNotifications(project);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 400);
  }
});
