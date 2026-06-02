import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type Answers = Record<string, string>;

const offerAmountCents = 7900;
const offerCurrency = "eur";

const toIntOrNull = (value?: string) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const isAccepted = (value?: string) => value === "true";

const isValidEmail = (value?: string) => {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erreur inconnue.";

const insertProject = async (
  answers: Answers,
  generatedStory: string,
  photoFiles: unknown[]
) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variables Supabase serveur manquantes.");
  }

  const customerEmail = answers.contactEmail?.trim() || "";
  if (!isValidEmail(customerEmail)) {
    throw new Error("Email client obligatoire ou invalide.");
  }
  if (!isAccepted(answers.acceptTerms)) {
    throw new Error("Acceptation des CGV obligatoire.");
  }
  if (!isAccepted(answers.acceptDelay)) {
    throw new Error("Confirmation du délai obligatoire.");
  }
  if (!isAccepted(answers.acceptImageRights)) {
    throw new Error("Confirmation droit à l'image obligatoire.");
  }

  const acceptedAt = new Date().toISOString();

  const response = await fetch(`${supabaseUrl}/rest/v1/video_projects`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      status: "draft",
      pilot_name: answers.pilotName || "",
      birth_year: toIntOrNull(answers.birthYear),
      discipline: answers.discipline || null,
      practice_period: answers.period || null,
      selected_offer: answers.videoLength || "short",
      contact_name: answers.contactName || null,
      contact_email: customerEmail,
      customer_email: customerEmail,
      payment_status: "unpaid",
      amount_cents: offerAmountCents,
      currency: offerCurrency,
      accepted_terms_at: acceptedAt,
      accepted_delay_at: acceptedAt,
      accepted_image_rights_at: acceptedAt,
      generated_story: generatedStory,
      final_story: generatedStory,
      web_notes: answers.webNotes || null,
      answers,
      photo_files: photoFiles || [],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || "Erreur insertion Supabase.");
  }

  return Array.isArray(data) ? data[0] : data;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Méthode non autorisée." }, 405);

  try {
    const { answers, generatedStory, photoFiles = [] } = await request.json();
    if (!answers || typeof answers !== "object") {
      return jsonResponse({ error: "answers est obligatoire." }, 400);
    }
    if (!generatedStory || typeof generatedStory !== "string") {
      return jsonResponse({ error: "generatedStory est obligatoire." }, 400);
    }

    const project = await insertProject(answers, generatedStory, photoFiles);
    return jsonResponse({ project });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
