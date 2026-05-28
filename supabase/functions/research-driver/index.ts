import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type ResearchResult = {
  summary: string;
  confidence: "low" | "medium" | "high";
  prefill: Record<string, string>;
  sources: Array<{ title: string; url: string }>;
};

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

const prefillFields = [
  "discipline",
  "period",
  "cityClub",
  "startStory",
  "vehicleAndPlaces",
  "proudMoment",
  "hardMoment",
  "familyMessage",
];

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erreur inconnue.";

const stripInlineCitations = (value: unknown) =>
  String(value || "")
    .replace(/\s*\(\[[^\]]+\]\([^)]+\)\)/g, "")
    .replace(/\s*\[[^\]]+\]\([^)]+\)/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanUrl = (value: unknown) => {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    url.searchParams.delete("utm_source");
    return url.toString();
  } catch {
    return "";
  }
};

const stripDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const uniqueValues = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean)));

const buildSearchHints = (pilotName: string, birthYear: string, discipline: string, cityClub: string, period: string) => {
  const cleanName = pilotName.replace(/\s+/g, " ").trim();
  const parts = cleanName.split(" ").filter(Boolean);
  const firstName = parts[0] || cleanName;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
  const reversedName = lastName ? `${lastName} ${firstName}` : cleanName;
  const upperReversedName = lastName ? `${lastName.toUpperCase()} ${firstName}` : cleanName.toUpperCase();
  const noAccentName = stripDiacritics(cleanName);
  const noAccentReversedName = stripDiacritics(reversedName);
  const noAccentUpperReversedName = stripDiacritics(upperReversedName);

  return uniqueValues([
    `site:formulaford1600.fr "${cleanName}"`,
    `site:formulaford1600.fr "${noAccentName}"`,
    `site:formulaford1600.fr "${noAccentUpperReversedName}"`,
    `site:newsclassicracing.com "${cleanName}"`,
    `site:newsclassicracing.com "${noAccentName}"`,
    `site:mragnotti.com "${noAccentUpperReversedName}"`,
    `site:finecars.cc "${noAccentUpperReversedName}"`,
    `site:anevip.org "${noAccentReversedName}"`,
    `site:citroen-en-competition.fr "${noAccentName}"`,
    `"${cleanName}" "Club Kent"`,
    `"${noAccentName}" "Club Kent"`,
    `"${cleanName}" "Formule Kent"`,
    `"${noAccentName}" "Formule Ford Kent"`,
    `"${cleanName}" "Grac MT6"`,
    `"${noAccentName}" "Grac MT6"`,
    `"${cleanName}" "Royale"`,
    `"${noAccentName}" "Royale"`,
    `"${cleanName}"`,
    `"${noAccentName}"`,
    `"${reversedName}"`,
    `"${noAccentReversedName}"`,
    `"${upperReversedName}"`,
    `"${noAccentUpperReversedName}"`,
    `"${noAccentUpperReversedName}" engagés`,
    `"${noAccentUpperReversedName}" classement`,
    `"${noAccentUpperReversedName}" résultats`,
    `"${noAccentUpperReversedName}" PDF`,
    birthYear ? `"${noAccentName}" "${birthYear}"` : "",
    discipline ? `"${noAccentName}" "${discipline}"` : "",
    cityClub ? `"${noAccentName}" "${cityClub}"` : "",
    period ? `"${noAccentName}" "${period}"` : "",
    `${cleanName} pilote auto`,
    `${noAccentName} pilote auto`,
  ]).slice(0, 24);
};

const extractOutputText = (payload: any) => {
  if (typeof payload.output_text === "string") return payload.output_text.trim();

  const parts: string[] = [];
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
};

const extractJson = (text: string, birthYear = ""): ResearchResult => {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("La recherche n'a pas renvoyé de JSON exploitable.");
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  const resultRoot = parsed?.prefill || parsed?.summary || parsed?.sources ? parsed : parsed?.format_attendu || parsed;
  const rawPrefill = resultRoot.prefill && typeof resultRoot.prefill === "object" ? resultRoot.prefill : {};
  const prefill: Record<string, string> = {};

  for (const field of prefillFields) {
    prefill[field] = stripInlineCitations(rawPrefill[field]);
  }

  const sources = Array.isArray(resultRoot.sources)
    ? resultRoot.sources
        .map((source: any) => ({
          title: stripInlineCitations(source?.title || source?.url),
          url: cleanUrl(source?.url),
        }))
        .filter((source) => source.url)
        .slice(0, 8)
    : [];
  const summary = stripInlineCitations(resultRoot.summary);
  const resultText = JSON.stringify(resultRoot);
  let confidence: "low" | "medium" | "high" = ["low", "medium", "high"].includes(resultRoot.confidence)
    ? resultRoot.confidence
    : "low";

  if (confidence === "high" && (sources.length < 2 || (birthYear && !resultText.includes(birthYear)))) {
    confidence = "medium";
  }

  const hasQuestionPrefill = ["startStory", "vehicleAndPlaces", "proudMoment", "hardMoment", "familyMessage"].some(
    (field) => prefill[field],
  );
  if (summary && sources.length && confidence !== "low" && !hasQuestionPrefill) {
    prefill.vehicleAndPlaces = summary;
  }

  return {
    summary,
    confidence,
    prefill,
    sources,
  };
};

const braveSearch = async (apiKey: string, query: string): Promise<SearchResult[]> => {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("country", "fr");
  url.searchParams.set("search_lang", "fr");
  url.searchParams.set("spellcheck", "1");
  url.searchParams.set("safesearch", "moderate");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erreur Brave Search ${response.status}: ${text.slice(0, 160)}`);
  }

  const data = await response.json();
  return (data.web?.results || [])
    .map((result: any) => ({
      title: stripInlineCitations(result.title),
      url: cleanUrl(result.url),
      snippet: stripInlineCitations([result.description, ...(result.extra_snippets || [])].filter(Boolean).join(" ")),
    }))
    .filter((result: SearchResult) => result.url && result.title);
};

const isRelevantResult = (result: SearchResult, pilotName: string) => {
  const name = stripDiacritics(pilotName).toLowerCase();
  const parts = name.split(" ").filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts[parts.length - 1] || "";
  const haystack = stripDiacritics(`${result.title} ${result.url} ${result.snippet}`).toLowerCase();
  const trustedDomains = ["formulaford1600.fr", "newsclassicracing.com", "mragnotti.com", "finecars.cc", "anevip.org", "citroen-en-competition.fr"];
  const isTrustedDomain = trustedDomains.some((domain) => haystack.includes(domain));

  if (lastName && haystack.includes(lastName)) return true;
  if (firstName && lastName && haystack.includes(firstName) && isTrustedDomain) return true;
  return false;
};

const collectBraveResults = async (apiKey: string, searchHints: string[], pilotName: string) => {
  const results = new Map<string, SearchResult>();

  for (const query of searchHints) {
    const batch = await braveSearch(apiKey, query);
    for (const result of batch) {
      if (!results.has(result.url) && isRelevantResult(result, pilotName)) results.set(result.url, result);
    }
    if (results.size >= 14) break;
  }

  return Array.from(results.values()).slice(0, 14);
};

const buildOpenAiPayload = (
  model: string,
  payload: Record<string, string>,
  searchHints: string[],
  braveResults: SearchResult[],
) => {
  const pilotName = payload.pilotName || "";
  const birthYear = payload.birthYear || "";
  const discipline = payload.discipline || "compétition automobile historique";
  const cityClub = payload.cityClub || "";
  const period = payload.period || "";
  const hasBraveResults = braveResults.length > 0;

  const baseInput = {
    mission:
      "Préremplir un questionnaire très court pour une vidéo souvenir de pilote. Si des informations publiques fiables sont trouvées, transforme-les en réponses directement utilisables dans les champs du formulaire. Les champs doivent rester sobres et faciles à corriger par une personne âgée.",
    pilote: {
      nom: pilotName,
      annee_naissance: birthYear,
      discipline,
      ville_club_region: cityClub,
      periode: period,
    },
    requetes_utilisees: searchHints,
    resultats_recherche_brave: braveResults,
    format_attendu: {
      summary: "Résumé en 2 à 4 phrases maximum, sans liens.",
      confidence: "low | medium | high",
      prefill: {
        discipline: "Discipline principale trouvée, si elle précise mieux le choix utilisateur.",
        period: "Années ou période de pratique trouvées.",
        cityClub: "Ville, région, ASA, écurie ou club trouvé.",
        startStory: "Débuts du pilote, première discipline, première période ou premier fait public identifié.",
        vehicleAndPlaces: "Véhicules, circuits, clubs, lieux, championnats ou disciplines trouvés.",
        proudMoment: "Titre, victoire, podium, classement, participation ou course marquante trouvé.",
        hardMoment: "Difficulté, accident, abandon ou anecdote marquante seulement si vraiment trouvée ; sinon chaîne vide.",
        familyMessage: "Message final seulement si une information publique le justifie ; sinon chaîne vide.",
      },
      sources: [{ title: "Titre source", url: "URL" }],
    },
  };

  return {
    model,
    ...(hasBraveResults
      ? {}
      : {
          tools: [
            {
              type: "web_search",
              user_location: {
                type: "approximate",
                country: "FR",
              },
            },
          ],
          tool_choice: "auto",
          include: ["web_search_call.action.sources"],
        }),
    max_output_tokens: 1700,
    temperature: 0.2,
    instructions: hasBraveResults
      ? "Tu aides à préparer une vidéo souvenir pour un pilote de compétition automobile historique. Utilise prioritairement les résultats Brave fournis. N'invente rien. Si les résultats citent le nom exact ou une variante sans accent dans un contexte automobile, tu peux les utiliser. L'année de naissance est un indice d'homonymie, pas un filtre obligatoire. Quand des informations fiables existent, remplis prefill avec des réponses courtes aux questions du formulaire : débuts, véhicules/lieux, moment marquant, difficulté/anecdote si trouvée, message final seulement si justifié. Ne laisse un champ vide que si aucun élément public ne permet de le remplir sans invention. Réponds uniquement en JSON valide, sans markdown, avec les clés top-level exactes summary, confidence, prefill et sources. Les sources doivent venir uniquement des résultats fournis. Ne mets jamais de liens ou citations dans summary ou prefill."
      : "Tu aides à préparer une vidéo souvenir pour un pilote de compétition automobile historique. Cherche uniquement des informations publiques utiles. Essaie explicitement les variantes de requêtes fournies, surtout la forme NOM Prénom, sans accents, les PDF, listes d'engagés, classements et résultats. Ne conclus pas trop vite sur les pilotes amateurs ou historiques. L'année de naissance est un indice d'homonymie, pas un filtre obligatoire. Attention aux homonymes : si l'identité est incertaine, indique une confiance low et reste prudent. N'invente rien. Quand des informations fiables existent, remplis prefill avec des réponses courtes aux questions du formulaire : débuts, véhicules/lieux, moment marquant, difficulté/anecdote si trouvée, message final seulement si justifié. Ne laisse un champ vide que si aucun élément public ne permet de le remplir sans invention. Réponds uniquement en JSON valide, sans markdown, avec les clés top-level exactes summary, confidence, prefill et sources. Ne mets jamais de liens ou citations dans summary ou prefill ; mets les liens seulement dans sources.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(baseInput, null, 2),
          },
        ],
      },
    ],
  };
};

const searchPilot = async (payload: Record<string, string>) => {
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiApiKey) throw new Error("OPENAI_API_KEY manquant dans les secrets Supabase.");

  const model = Deno.env.get("OPENAI_RESEARCH_MODEL") || Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
  const searchHints = buildSearchHints(
    payload.pilotName || "",
    payload.birthYear || "",
    payload.discipline || "compétition automobile historique",
    payload.cityClub || "",
    payload.period || "",
  );
  const braveApiKey = Deno.env.get("BRAVE_SEARCH_API_KEY");
  const braveResults = braveApiKey ? await collectBraveResults(braveApiKey, searchHints, payload.pilotName || "") : [];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildOpenAiPayload(model, payload, searchHints, braveResults)),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Erreur OpenAI pendant la recherche.");
  }

  return {
    ...extractJson(extractOutputText(data), payload.birthYear || ""),
    model,
    searchProvider: braveResults.length ? "brave" : "openai_web_search",
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Méthode non autorisée." }, 405);

  try {
    const payload = await request.json();
    if (!payload?.pilotName) return jsonResponse({ error: "pilotName est obligatoire." }, 400);

    const result = await searchPilot(payload);
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});

