import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const bucket = "pilot-photos";
const maxFileSize = 50 * 1024 * 1024;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erreur inconnue.";

const cleanFileName = (name: string) => {
  const fallback = "photo";
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return cleaned || fallback;
};

const encodeObjectPath = (path: string) =>
  path.split("/").map((part) => encodeURIComponent(part)).join("/");

const insertMediaRow = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: Record<string, unknown>
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/project_media`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || "Erreur insertion média.");
  }

  return Array.isArray(data) ? data[0] : data;
};

const uploadToStorage = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  objectPath: string,
  file: File
) => {
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: file,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Erreur upload photo.");
  }

  return data;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Méthode non autorisée." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Variables Supabase serveur manquantes.");
    }

    const formData = await request.formData();
    const projectId = String(formData.get("projectId") || "");
    const file = formData.get("file");

    if (!projectId) return jsonResponse({ error: "projectId est obligatoire." }, 400);
    if (!(file instanceof File)) return jsonResponse({ error: "file est obligatoire." }, 400);
    if (!file.type.startsWith("image/")) {
      return jsonResponse({ error: "Seules les images sont acceptées." }, 400);
    }
    if (file.size > maxFileSize) {
      return jsonResponse({ error: "Image trop lourde. Limite : 50 MB." }, 400);
    }

    const safeName = cleanFileName(file.name);
    const objectPath = `${projectId}/${crypto.randomUUID()}-${safeName}`;

    await uploadToStorage(supabaseUrl, serviceRoleKey, objectPath, file);
    const media = await insertMediaRow(supabaseUrl, serviceRoleKey, {
      project_id: projectId,
      bucket,
      object_path: objectPath,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    });

    return jsonResponse({ media });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
