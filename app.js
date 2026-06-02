const form = document.querySelector("#storyForm");
const storyOutput = document.querySelector("#generatedStory");
const printStory = document.querySelector("#printStory");
const photoInput = document.querySelector("#photos");
const photoPreview = document.querySelector("#photoPreview");
const exampleVideo = document.querySelector("#exampleVideo");
const toggleExtraQuestionsButton = document.querySelector("#toggleExtraQuestions");
const extraQuestions = document.querySelector("#extraQuestions");
const submitProjectButton = document.querySelector("#submitProject");
const generateStoryButton = document.querySelector("#generateStory");
const offerSummary = document.querySelector("#offerSummary");
const appStatus = document.querySelector("#appStatus");
const contactEmailLink = document.querySelector("#contactEmailLink");
const contactCopyStatus = document.querySelector("#contactCopyStatus");
const offerButtons = document.querySelectorAll(".offer-card");
const testExampleButtons = document.querySelectorAll(".test-example-button");
const stepCards = document.querySelectorAll(".step-card[data-step]");
const stepToggleButtons = document.querySelectorAll("[data-step-toggle]");
const nextStepButtons = document.querySelectorAll("[data-next-step]");
const showPaymentButton = document.querySelector("[data-show-payment]");
const paymentPanel = document.querySelector("#paymentPanel");

const appConfig =
  window.SOUVENIR_DE_PADDOCK_CONFIG ||
  window.PADDOCK_LEGENDE_CONFIG ||
  window.PILOT_APP_CONFIG ||
  {};
const hasSupabaseConfig = Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
const draftStorageKey = "souvenirDePaddockDraftV4";

const fields = [
  "pilotName",
  "discipline",
  "videoLength",
  "webNotes",
  "startStory",
  "vehicleAndPlaces",
  "proudMoment",
  "hardMoment",
  "familyMessage",
  "contactEmail",
  "careerHighlights",
  "keyPeople",
  "funnyAnecdote",
  "rituals",
  "advice",
];

const offers = {
  short: {
    name: "Vidéo courte",
    duration: "environ 1 minute",
    price: "79\u00a0€",
    target: "120 à 160 mots",
  },
};

const testExamples = {
  circuit: {
    pilotName: "Henri Marchal",
    birthYear: "1949",
    discipline: "Formule Ford historique",
    period: "de 1974 à 2008",
    cityClub: "Dijon, Bourgogne, ASA Beaune",
    contactEmail: "test+circuit@example.com",
    videoLength: "short",
    webNotes:
      "Pilote fictif de Formule Ford historique. Parcours inspiré des clubs français de monoplaces anciennes, sans personne réelle.",
    startStory:
      "Henri a découvert la compétition en aidant un ami mécanicien sur les circuits de Prenois et Magny-Cours. En 1974, après plusieurs week-ends passés dans les paddocks, il achète une vieille monoplace et prend son premier départ en amateur.",
    vehicleAndPlaces:
      "Formule Ford Crosslé 32F, Royale RP24, puis Van Diemen RF80. Circuits marquants : Dijon-Prenois, Charade, Nogaro, Magny-Cours et Le Castellet.",
    proudMoment:
      "Son plus beau souvenir reste une victoire de classe à Dijon-Prenois, devant sa famille et plusieurs amis de club, après une course très disputée sous la pluie.",
    hardMoment:
      "À Nogaro, une casse de boîte de vitesses l'a obligé à abandonner alors qu'il était en tête de sa catégorie. Il a reconstruit la voiture avec deux amis pendant l'hiver et est revenu courir la saison suivante.",
    familyMessage:
      "Il reste surtout Claire, ses enfants, les mécaniciens bénévoles et les amis de paddock : ceux qui ont fait de cette aventure une histoire partagée.",
    careerHighlights:
      "Participation régulière aux trophées historiques de Formule Ford entre les années 1990 et 2000. Plusieurs podiums de classe, une victoire à Dijon-Prenois, et une fidélité particulière aux courses de clubs.",
    keyPeople:
      "Claire, son épouse, qui tenait les chronos ; Jean-Mi, mécanicien de toujours ; Patrick, compagnon de route sur les déplacements ; ses enfants Paul et Elise.",
    funnyAnecdote:
      "Un matin à Charade, Henri est parti vers la prégrille avec les gants de jardinage de son mécanicien au lieu de ses gants de course. Toute l'équipe l'a appelé 'le jardinier de la Formule Ford' pendant des années.",
    rituals:
      "Toujours vérifier lui-même la pression des pneus, toucher le volant avant de fermer le harnais, puis boire un café très serré avec l'équipe.",
    advice:
      "Commencer humblement, écouter les anciens, respecter la mécanique et ne jamais confondre courage et précipitation.",
  },
  rallye: {
    pilotName: "Lucien Valory",
    birthYear: "1952",
    discipline: "rallye historique",
    period: "de 1978 à 2015",
    cityClub: "Albi, Tarn, ASA du Vignoble",
    contactEmail: "test+rallye@example.com",
    videoLength: "short",
    webNotes:
      "Pilote fictif de rallye et course de côte historique. Parcours inventé pour tester une vidéo courte d'une minute.",
    startStory:
      "Lucien a commencé par suivre les rallyes régionaux au bord des routes avec son père. En 1978, il prépare une Simca Rallye 2 dans le garage familial et s'engage sur ses premières épreuves locales avec un ami d'enfance comme copilote.",
    vehicleAndPlaces:
      "Simca Rallye 2, Alpine A110 1300, Opel Kadett GTE, puis BMW 2002 en historique. Lieux marquants : Montagne Noire, Cévennes, routes du Tarn, course de côte de Saint-Antonin et rallyes VHRS du Sud-Ouest.",
    proudMoment:
      "Son moment le plus fort reste un podium au rallye de la Montagne Noire, obtenu après une nuit de pluie et de brouillard où il a gardé un rythme propre sans abîmer la voiture.",
    hardMoment:
      "Une sortie de route dans une épingle des Cévennes a stoppé sa saison pendant plusieurs mois. La voiture était très abîmée, mais l'équipe l'a reconstruite patiemment et Lucien est revenu avec plus de prudence.",
    familyMessage:
      "Lucien veut transmettre à sa famille que ces années de course n'étaient pas seulement une affaire de chronos, mais une histoire d'amitié, de patience et de souvenirs partagés.",
    careerHighlights:
      "Débuts en rallye régional à la fin des années 1970, plusieurs saisons en groupe 2, retour en historique dans les années 2000, participations régulières en VHRS et en course de côte. Réputé pour finir les rallyes et préserver la mécanique.",
    keyPeople:
      "Marc, copilote des débuts ; son frère André, qui préparait les moteurs ; Martine, présente sur presque toutes les assistances ; les amis de l'ASA du Vignoble.",
    funnyAnecdote:
      "Lors d'un rallye dans le Tarn, l'équipe d'assistance a attendu Lucien au mauvais village. Il est arrivé au parc fermé avec un sandwich offert par des spectateurs et l'histoire est devenue un classique du club.",
    rituals:
      "Relire les trois premières pages de notes avant de monter dans la voiture, garder une petite clé de 13 dans la poche de combinaison, et ne jamais changer de casque pendant une saison qui se passe bien.",
    advice:
      "Apprendre à finir avant de vouloir gagner. Une voiture bien ramenée au parc fermé apprend plus qu'un abandon spectaculaire.",
  },
};

let activeTestExampleKey = "";
let selectedPhotoFiles = [];


const getInput = (id) => document.querySelector(`#${id}`);
const getValue = (id) => getInput(id)?.value.trim() || "";
const isChecked = (id) => Boolean(getInput(id)?.checked);

const setStatus = (message, type = "") => {
  appStatus.textContent = message;
  appStatus.className = `app-status ${type}`.trim();
};

const scrollToElement = (element, block = "start") => {
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block });
};

const showPaymentReturnStatus = () => {
  const payment = new URLSearchParams(window.location.search).get("payment");

  if (payment === "success") {
    setStatus("Paiement confirmé. Votre dossier a bien été transmis. Vous allez recevoir un email de confirmation avec le lien vers votre facture.", "success");
    window.setTimeout(() => scrollToElement(appStatus, "center"), 120);
  }
  if (payment === "cancelled") {
    setStatus("Paiement annulé. Votre dossier n'a pas été payé.", "error");
    window.setTimeout(() => scrollToElement(appStatus, "center"), 120);
  }
};

const startExampleVideo = () => {
  if (!exampleVideo) return;
  exampleVideo.muted = true;
  exampleVideo.play().catch(() => {
    // Some browsers still block autoplay; native controls remain available.
  });
};
const setBusy = (isBusy) => {
  form.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy;
  });
};
const setButtonLoading = (button, isLoading, loadingText) => {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent.trim();
    button.classList.add("is-loading");
    button.textContent = loadingText;
    button.setAttribute("aria-busy", "true");
    return;
  }

  button.classList.remove("is-loading");
  button.textContent = button.dataset.originalText || button.textContent;
  button.removeAttribute("aria-busy");
  delete button.dataset.originalText;
};

const sentence = (text, fallback) => {
  const value = text.trim();
  if (!value) return fallback;
  return value.endsWith(".") || value.endsWith("!") || value.endsWith("?") ? value : `${value}.`;
};

const getSelectedOffer = () => offers.short;

const getAnswers = () => {
  const answers = fields.reduce((data, field) => {
    data[field] = getValue(field);
    return data;
  }, {});

  answers.videoLength = "short";
  answers.careerHighlights = "";
  answers.funnyAnecdote = "";
  answers.rituals = "";
  answers.advice = "";

  answers.firstVehicle = getValue("vehicleAndPlaces");
  answers.keyPlaces = getValue("vehicleAndPlaces");
  answers.favoriteCar = getValue("vehicleAndPlaces");
  answers.emotionalMemory = getValue("familyMessage");
  answers.acceptTerms = isChecked("acceptTerms") ? "true" : "";
  answers.acceptDelay = isChecked("acceptDelay") ? "true" : "";
  answers.acceptImageRights = isChecked("acceptImageRights") ? "true" : "";
  return answers;
};

const callEdgeFunction = async (functionName, payload) => {
  if (!hasSupabaseConfig) throw new Error("Supabase n'est pas configuré dans config.js.");

  const supabaseUrl = appConfig.supabaseUrl.replace(/\/$/, "");
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: appConfig.supabaseAnonKey,
      Authorization: `Bearer ${appConfig.supabaseAnonKey}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erreur Supabase ${response.status}`);
  return data;
};

const callMultipartEdgeFunction = async (functionName, formData) => {
  if (!hasSupabaseConfig) throw new Error("Supabase n'est pas configuré dans config.js.");

  const supabaseUrl = appConfig.supabaseUrl.replace(/\/$/, "");
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      apikey: appConfig.supabaseAnonKey,
      Authorization: `Bearer ${appConfig.supabaseAnonKey}`,
    },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erreur Supabase ${response.status}`);
  return data;
};

const uploadProjectPhotos = async (projectId, files) => {
  const uploaded = [];
  for (const [index, file] of files.entries()) {
    setStatus(`Envoi des photos en cours : ${index + 1}/${files.length} - ${file.name}`, "loading");
    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("file", file);
    const data = await callMultipartEdgeFunction("upload-photo", formData);
    uploaded.push(data.media);
  }
  return uploaded;
};

const createCheckoutSession = async (projectId) => {
  const data = await callEdgeFunction("create-checkout-session", { projectId });
  if (!data.checkoutUrl) throw new Error("Stripe n'a pas renvoyé de lien de paiement.");
  return data.checkoutUrl;
};

const buildLocalStory = () => {
  const name = getValue("pilotName") || "ce pilote";
  const birthYear = getValue("birthYear");
  const discipline = getValue("discipline") || "compétition automobile historique";
  const period = getValue("period");
  const intro = period
    ? `Voici l'histoire de ${name}, pilote de ${discipline}, ${period}${birthYear ? `, né en ${birthYear}` : ""}.`
    : `Voici l'histoire de ${name}, pilote de ${discipline}${birthYear ? `, né en ${birthYear}` : ""}.`;

  const startStory = sentence(getValue("startStory"), "Tout a commencé par une passion simple pour les moteurs et les départs.");
  const vehicleAndPlaces = sentence(getValue("vehicleAndPlaces"), "Les voitures, les circuits et les paddocks ont laissé des souvenirs forts.");
  const proudMoment = sentence(getValue("proudMoment"), "Un moment de fierté résume ce que la compétition représentait pour lui.");
  const hardMoment = sentence(getValue("hardMoment"), "La course a aussi apporté des difficultés et des anecdotes que l'on n'oublie pas.");
  const familyMessage = sentence(
    getValue("familyMessage"),
    "Il reste surtout les visages des proches, de l'équipe et des amis de paddock : ceux qui ont fait de cette aventure une histoire partagée."
  );
  const keyPeople = sentence(getValue("keyPeople"), "");

  return `${intro}\n\n${startStory}\n\n${vehicleAndPlaces}\n\n${proudMoment}\n\n${hardMoment}${keyPeople ? `\n\n${keyPeople}` : ""}\n\n${familyMessage}`;
};

const generateStory = async () => {
  if (!hasSupabaseConfig) return buildLocalStory();
  const data = await callEdgeFunction("generate-story", {
    answers: getAnswers(),
    offer: getSelectedOffer(),
  });
  return data.story || buildLocalStory();
};

const updateOfferSummary = () => {
  if (!offerSummary) return;
  const offer = getSelectedOffer();
  offerSummary.textContent = `Offre de lancement : ${offer.name.toLowerCase()} d'${offer.duration} - ${offer.price}.`;
};

const updateWordCount = () => {
  printStory.textContent = storyOutput.value;
};

const getPhotoKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

const renderPhotoPreview = () => {
  photoPreview.replaceChildren();
  selectedPhotoFiles.forEach((file, index) => {
    const figure = document.createElement("figure");
    const removeButton = document.createElement("button");
    const image = document.createElement("img");
    const caption = document.createElement("figcaption");

    removeButton.type = "button";
    removeButton.className = "photo-remove";
    removeButton.setAttribute("aria-label", `Supprimer ${file.name}`);
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => {
      selectedPhotoFiles.splice(index, 1);
      renderPhotoPreview();
    });

    image.src = URL.createObjectURL(file);
    image.alt = file.name;
    image.onload = () => URL.revokeObjectURL(image.src);
    caption.textContent = file.name;

    figure.append(removeButton, image, caption);
    photoPreview.append(figure);
  });
};

const addSelectedPhotos = (files) => {
  const existingKeys = new Set(selectedPhotoFiles.map(getPhotoKey));
  Array.from(files).forEach((file) => {
    const key = getPhotoKey(file);
    if (existingKeys.has(key)) return;
    selectedPhotoFiles.push(file);
    existingKeys.add(key);
  });
  renderPhotoPreview();
};

const saveDraft = () => {
  const data = getAnswers();
  data.generatedStory = storyOutput.value;
  localStorage.setItem(draftStorageKey, JSON.stringify(data));
};

const fillForm = (data) => {
  fields.forEach((field) => {
    const input = getInput(field);
    if (input && data[field] !== undefined) input.value = data[field];
  });

  ["acceptTerms", "acceptDelay", "acceptImageRights"].forEach((field) => {
    const input = getInput(field);
    if (input && data[field] !== undefined) input.checked = data[field] === "true";
  });
};

const setExtraQuestionsVisible = (isVisible) => {
  if (!extraQuestions) return;
  extraQuestions.hidden = !isVisible;
  toggleExtraQuestionsButton?.setAttribute("aria-expanded", String(isVisible));
  if (toggleExtraQuestionsButton) {
    toggleExtraQuestionsButton.textContent = isVisible ? "Masquer les détails" : "Ajouter plus de détails";
  }
};

const updateQuestionnaireMode = () => {
  const videoLengthInput = getInput("videoLength");
  if (videoLengthInput) videoLengthInput.value = "short";
  form.classList.remove("is-long-format");
  setExtraQuestionsVisible(false);
};
const openStep = (step) => {
  const stepValue = String(step);
  stepCards.forEach((card) => {
    const isOpen = card.dataset.step === stepValue;
    card.classList.toggle("is-open", isOpen);
    const toggle = card.querySelector("[data-step-toggle]");
    if (toggle) toggle.setAttribute("aria-expanded", String(isOpen));
  });
};

const openStepAndScroll = (step) => {
  openStep(step);
  window.setTimeout(() => {
    scrollToElement(document.querySelector(`.step-card[data-step="${step}"]`), "start");
  }, 80);
};

const closeStep = (step) => {
  const card = document.querySelector(`.step-card[data-step="${step}"]`);
  if (!card) return;
  card.classList.remove("is-open");
  const toggle = card.querySelector("[data-step-toggle]");
  if (toggle) toggle.setAttribute("aria-expanded", "false");
};

const closeAllSteps = () => {
  stepCards.forEach((card) => {
    card.classList.remove("is-open");
    const toggle = card.querySelector("[data-step-toggle]");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  });
  if (paymentPanel) paymentPanel.hidden = true;
};

const toggleStep = (step) => {
  const card = document.querySelector(`.step-card[data-step="${step}"]`);
  if (!card) return;
  if (card.classList.contains("is-open")) {
    closeStep(step);
    return;
  }
  openStep(step);
};

const updateTestExampleButtons = () => {
  testExampleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.example === activeTestExampleKey);
  });
};

const clearQuestionnaire = () => {
  fields.forEach((field) => {
    const input = getInput(field);
    if (!input) return;
    input.value = field === "videoLength" ? "short" : "";
  });

  storyOutput.value = "";
  printStory.textContent = "";
  selectedPhotoFiles = [];
  photoInput.value = "";
  renderPhotoPreview();
  updateQuestionnaireMode();
  closeAllSteps();
  activeTestExampleKey = "";
  updateTestExampleButtons();
  updateOfferSelection();
  updateOfferSummary();
  updateWordCount();
  localStorage.removeItem(draftStorageKey);
};

const applyTestExample = (key) => {
  if (activeTestExampleKey === key) {
    clearQuestionnaire();
    setStatus("Questionnaire vidé. Vous pouvez repartir de zéro.", "success");
    return;
  }

  const example = testExamples[key];
  if (!example) return;

  fillForm(example);
  storyOutput.value = "";
  printStory.textContent = "";
  updateQuestionnaireMode();
  openStep("1");
  activeTestExampleKey = key;
  updateTestExampleButtons();
  updateOfferSelection();
  updateOfferSummary();
  updateWordCount();
  saveDraft();
  setStatus("Exemple fictif chargé. Cliquez à nouveau sur le même bouton pour vider le questionnaire.", "success");
};

const updateOfferSelection = () => {
  const videoLengthInput = getInput("videoLength");
  if (videoLengthInput) videoLengthInput.value = "short";
  const selectedLength = "short";
  offerButtons.forEach((button) => {
    button.classList.toggle("selected", button.dataset.length === selectedLength);
  });
};

const loadDraft = () => {
  const rawDraft = localStorage.getItem(draftStorageKey);
  if (!rawDraft) return;

  try {
    const data = JSON.parse(rawDraft);
    fillForm(data);
    updateQuestionnaireMode();
    if (!getValue("vehicleAndPlaces") && (data.firstVehicle || data.keyPlaces || data.favoriteCar)) {
      getInput("vehicleAndPlaces").value = [data.firstVehicle, data.keyPlaces, data.favoriteCar].filter(Boolean).join(" ");
    }
    if (data.generatedStory) storyOutput.value = data.generatedStory;
    updateOfferSelection();
    updateOfferSummary();
    updateWordCount();
  } catch {
    localStorage.removeItem(draftStorageKey);
  }
};

const validateBeforeFinalSubmit = () => {
  if (!storyOutput.value.trim()) return "Générez ou écrivez d'abord le texte final.";
  if (selectedPhotoFiles.length < 10) return "Ajoutez au moins 10 photos avant de valider le dossier.";
  if (!getValue("contactEmail")) return "Ajoutez votre email avant de valider le dossier.";
  if (!getInput("contactEmail")?.checkValidity()) return "Ajoutez une adresse email valide.";
  if (!isChecked("acceptTerms")) return "Vous devez accepter les CGV avant de valider le dossier.";
  if (!isChecked("acceptDelay")) return "Vous devez confirmer le délai maximum de 7 jours.";
  if (!isChecked("acceptImageRights")) return "Vous devez confirmer l'information sur le droit à l'image.";
  return "";
};


form.addEventListener("submit", (event) => event.preventDefault());

form.addEventListener("input", () => {
  saveDraft();
  updateWordCount();
  updateOfferSummary();
});

stepToggleButtons.forEach((button) => {
  button.addEventListener("click", () => toggleStep(button.dataset.stepToggle));
});

const validateQuestionnaireAndGenerateStory = async (button) => {
  setBusy(true);
  setButtonLoading(button, true, "Génération du texte...");
  setStatus(hasSupabaseConfig ? "Génération du texte en cours..." : "Mode local : génération sans IA.");

  try {
    storyOutput.value = await generateStory();
    updateWordCount();
    saveDraft();
    openStepAndScroll("2");
    setStatus("Texte généré. Vous pouvez le relire et le corriger.", "success");
  } catch (error) {
    storyOutput.value = buildLocalStory();
    updateWordCount();
    saveDraft();
    openStepAndScroll("2");
    setStatus(`IA indisponible, texte local généré à la place. ${error.message}`, "error");
  } finally {
    setButtonLoading(button, false);
    setBusy(false);
  }
};

const validateFinalText = () => {
  if (!storyOutput.value.trim()) {
    setStatus("Le texte final est vide. Revenez au questionnaire pour le générer.", "error");
    return;
  }
  openStepAndScroll("3");
  setStatus("");
};

nextStepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.nextStep === "2") {
      validateQuestionnaireAndGenerateStory(button);
      return;
    }
    if (button.dataset.nextStep === "3") {
      validateFinalText();
      return;
    }
    openStepAndScroll(button.dataset.nextStep);
  });
});

showPaymentButton?.addEventListener("click", () => {
  if (selectedPhotoFiles.length < 10) {
    setStatus("Ajoutez au moins 10 photos avant de valider cette étape.", "error");
    return;
  }

  if (paymentPanel) {
    paymentPanel.hidden = false;
    scrollToElement(paymentPanel, "start");
  }
  setStatus("");
});

testExampleButtons.forEach((button) => {
  button.addEventListener("click", () => applyTestExample(button.dataset.example));
});

offerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    getInput("videoLength").value = button.dataset.length;
    updateOfferSelection();
    updateQuestionnaireMode();
    updateOfferSummary();
    saveDraft();
  });
});

generateStoryButton?.addEventListener("click", async () => {
  setBusy(true);
  setButtonLoading(generateStoryButton, true, "Génération en cours...");
  setStatus(hasSupabaseConfig ? "Génération du texte en cours..." : "Mode local : génération sans IA.");

  try {
    storyOutput.value = await generateStory();
    updateWordCount();
    saveDraft();
    setStatus("Texte généré. Vous pouvez le corriger directement avant validation.", "success");
    openStepAndScroll("2");
    storyOutput.focus();
  } catch (error) {
    storyOutput.value = buildLocalStory();
    updateWordCount();
    saveDraft();
    openStepAndScroll("2");
    setStatus(`IA indisponible, texte local généré à la place. ${error.message}`, "error");
  } finally {
    setButtonLoading(generateStoryButton, false);
    setBusy(false);
  }
});


submitProjectButton.addEventListener("click", async () => {
  const validationError = validateBeforeFinalSubmit();
  if (validationError) {
    setStatus(validationError, "error");
    return;
  }

  if (!hasSupabaseConfig) {
    setStatus("Supabase n'est pas encore configuré. Le dossier reste en brouillon local.", "error");
    return;
  }

  setBusy(true);
  setButtonLoading(submitProjectButton, true, "Envoi en cours...");
  setStatus("Enregistrement du dossier...", "loading");

  try {
    const files = selectedPhotoFiles;
    const photoFiles = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    }));

    const data = await callEdgeFunction("submit-project", {
      answers: getAnswers(),
      generatedStory: storyOutput.value,
      photoFiles,
    });
    const projectId = data.project?.id || "";
    let uploadedCount = 0;

    if (projectId && files.length) {
      const uploadedPhotos = await uploadProjectPhotos(projectId, files);
      uploadedCount = uploadedPhotos.length;
    }

    setStatus(`Dossier enregistré. Photos envoyées : ${uploadedCount}. Ouverture du paiement...`, "success");
    const checkoutUrl = await createCheckoutSession(projectId);
    window.location.href = checkoutUrl;
  } catch (error) {
    setStatus(`Impossible d'enregistrer le dossier. ${error.message}`, "error");
  } finally {
    setButtonLoading(submitProjectButton, false);
    setBusy(false);
  }
});

photoInput.addEventListener("change", () => {
  addSelectedPhotos(photoInput.files);
  photoInput.value = "";
});

contactEmailLink?.addEventListener("click", async (event) => {
  const email = contactEmailLink.dataset.copyEmail || contactEmailLink.textContent.trim();
  if (!email) return;

  event.preventDefault();

  try {
    await navigator.clipboard.writeText(email);
    if (contactCopyStatus) contactCopyStatus.textContent = "Email copié.";
  } catch {
    window.location.href = `mailto:${email}`;
  }
});

startExampleVideo();
closeAllSteps();
loadDraft();
updateOfferSelection();
updateQuestionnaireMode();
updateOfferSummary();
updateWordCount();
showPaymentReturnStatus();







