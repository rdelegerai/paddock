import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type Answers = Record<string, string>;

type StorySettings = {
  target: string;
  maxWords: number;
  maxOutputTokens: number;
};

const storySettingsByLength: Record<string, StorySettings> = {
  short: {
    target: "120 à 160 mots, pour une vidéo d'environ 1 minute.",
    maxWords: 165,
    maxOutputTokens: 320,
  },
  standard: {
    target: "240 à 330 mots, pour une vidéo de 2 minutes environ.",
    maxWords: 340,
    maxOutputTokens: 620,
  },
  long: {
    target: "320 à 430 mots, pour une vidéo d'environ 3 minutes.",
    maxWords: 440,
    maxOutputTokens: 820,
  },
};

const storyStructureByLength: Record<string, string> = {
  short:
    "Structure 1 minute : présenter le pilote, raconter les débuts, citer les voitures/lieux essentiels, raconter le grand souvenir, évoquer une difficulté ou anecdote, remercier les proches, conclure sur le message final.",
  long:
    "Structure 3 minutes : suivre le même arc que la vidéo courte, mais développer davantage la chronologie, les saisons ou périodes importantes, les voitures et lieux, l'ambiance d'équipe, une anecdote secondaire, les proches, puis la transmission finale.",
  standard:
    "Structure intermédiaire : suivre l'arc de la vidéo courte avec un peu plus de détails sur les voitures, les lieux et les proches.",
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

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erreur inconnue.";

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const getTemperature = () => {
  const raw = Deno.env.get("OPENAI_TEMPERATURE") || "0.6";
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0.6;
  return Math.min(Math.max(value, 0), 1);
};

const getOpenAiText = async (answers: Answers, offer: Record<string, string>) => {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY manquant dans les secrets Supabase.");

  const model = Deno.env.get("OPENAI_STORY_MODEL") || Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
  const selectedLength = answers.videoLength || "short";
  const settings = storySettingsByLength[selectedLength] || storySettingsByLength.short;
  const structure = storyStructureByLength[selectedLength] || storyStructureByLength.short;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: getTemperature(),
      max_output_tokens: settings.maxOutputTokens,
      instructions:
        "Tu écris pour Souvenir de Paddock, un service de vidéos souvenirs pour pilotes de compétition automobile historique. Tu rédiges une voix off en français, prête à être lue. Le style est sobre, humain, précis, chaleureux, jamais commercial. Évite les formules creuses. Privilégie les faits concrets, les personnes, les voitures, les paddocks, les circuits et les émotions simples. N'invente aucun fait. Si une information est incertaine, formule-la prudemment. Ne mets pas de titres, de listes, ni de markdown. Si des notes libres ou une biographie longue sont fournies, utilise-les comme matière source : extrais les faits utiles, ne recopie pas tout. Respecte strictement le nombre maximal de mots transmis.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(
                {
                  objectif: "Créer une narration prête à être lue en voix off.",
                  longueur: settings.target,
                  nombre_maximal_de_mots: settings.maxWords,
                  offre: offer,
                  structure_recommandee: structure,
                  reponses_questionnaire: answers,
                  consignes:
                    "Écris en paragraphes courts. Garde une narration fluide, en troisième personne. Suis la structure recommandée, sans titres visibles. Donne plus de poids au moment de fierté, à la difficulté ou anecdote, aux proches et au message final. Les champs supplémentaires sont optionnels : utilise-les seulement s'ils enrichissent vraiment la narration. Ne dépasse pas le nombre maximal de mots.",
                },
                null,
                2
              ),
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Erreur OpenAI.");
  }

  const story = extractOutputText(data);
  if (!story) throw new Error("OpenAI n'a pas renvoyé de texte exploitable.");

  return {
    story,
    model,
    target: settings.target,
    maxWords: settings.maxWords,
    wordCount: wordCount(story),
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Méthode non autorisée." }, 405);

  try {
    const { answers, offer } = await request.json();
    if (!answers || typeof answers !== "object") {
      return jsonResponse({ error: "answers est obligatoire." }, 400);
    }

    const result = await getOpenAiText(answers, offer || {});
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});



