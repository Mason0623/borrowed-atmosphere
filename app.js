const API_BASE = "https://cse2004.com/api";
const STORAGE_KEY = "borrowed-atmosphere-entries";

const useLocationBtn = document.querySelector("#use-location-btn");
const toggleManualBtn = document.querySelector("#toggle-manual-btn");
const manualPanel = document.querySelector("#manual-panel");
const cityForm = document.querySelector("#city-form");
const cityInput = document.querySelector("#city-input");

const statusText = document.querySelector("#status-text");
const resultPanel = document.querySelector("#result-panel");
const sceneMeta = document.querySelector("#scene-meta");
const figureNameEl = document.querySelector("#figure-name");
const figureQuoteEl = document.querySelector("#figure-quote");
const matchTagsEl = document.querySelector("#match-tags");
const sceneText = document.querySelector("#scene-text");

const regenerateBtn = document.querySelector("#regenerate-btn");
const saveBtn = document.querySelector("#save-btn");
const speakBtn = document.querySelector("#speak-btn");
const archiveList = document.querySelector("#archive-list");

let currentEntry = null;

const figureArchive = [
  { name: "Joan Didion", quote: "We tell ourselves stories in order to live.", tags: ["evening", "dry", "mild", "interior"] },
  { name: "Virginia Woolf", quote: "I am rooted, but I flow.", tags: ["morning", "clouds", "cool", "interior"] },
  { name: "James Baldwin", quote: "Not everything that is faced can be changed, but nothing can be changed until it is faced.", tags: ["night", "warm", "urban", "intense"] },
  { name: "Franz Kafka", quote: "A book must be the axe for the frozen sea within us.", tags: ["night", "cold", "clouds", "interior"] },
  { name: "Albert Camus", quote: "In the depth of winter, I finally learned that within me there lay an invincible summer.", tags: ["clear", "mild", "open"] },
  { name: "Sylvia Plath", quote: "I took a deep breath and listened to the old brag of my heart.", tags: ["night", "cold", "interior", "intense"] },
  { name: "Maya Angelou", quote: "We delight in the beauty of the butterfly, but rarely admit the changes it has gone through.", tags: ["warm", "clear", "open"] },
  { name: "Anaïs Nin", quote: "We write to taste life twice.", tags: ["night", "rain", "interior", "private"] },
  { name: "Oscar Wilde", quote: "To live is the rarest thing in the world.", tags: ["evening", "urban"] },
  { name: "Patti Smith", quote: "In art and dream may you proceed with abandon.", tags: ["night", "urban", "restless"] },

  { name: "Haruki Murakami", quote: "Memories warm you up from the inside. But they also tear you apart.", tags: ["night", "rain", "mild", "lonely"] },
  { name: "George Orwell", quote: "In a time of deceit telling the truth is a revolutionary act.", tags: ["cold", "clouds", "urban"] },
  { name: "Ernest Hemingway", quote: "The world breaks everyone.", tags: ["clear", "dry", "warm"] },
  { name: "Fyodor Dostoevsky", quote: "The mystery of human existence lies in finding something to live for.", tags: ["cold", "night", "intense"] },
  { name: "Simone de Beauvoir", quote: "Change your life today.", tags: ["clear", "cool", "open"] },
  { name: "Rainer Maria Rilke", quote: "Let everything happen to you: beauty and terror.", tags: ["clouds", "cool", "interior"] },
  { name: "Margaret Atwood", quote: "A word after a word after a word is power.", tags: ["cold", "urban"] },
  { name: "T.S. Eliot", quote: "April is the cruelest month.", tags: ["clouds", "mild"] },
  { name: "Emily Dickinson", quote: "I dwell in possibility.", tags: ["morning", "cool", "interior"] },
  { name: "Jack Kerouac", quote: "The only people for me are the mad ones.", tags: ["night", "urban", "restless"] },

  { name: "Kurt Vonnegut", quote: "So it goes.", tags: ["dry", "mild"] },
  { name: "Toni Morrison", quote: "You wanna fly, you got to give up the thing that weighs you down.", tags: ["warm", "intense"] },
  { name: "Gabriel García Márquez", quote: "No medicine cures what happiness cannot.", tags: ["warm", "rain", "magical"] },
  { name: "Italo Calvino", quote: "Take life lightly.", tags: ["clear", "cool"] },
  { name: "Jean-Paul Sartre", quote: "Freedom is what you do with what’s been done to you.", tags: ["urban", "intense"] },
  { name: "Charles Bukowski", quote: "Find what you love and let it kill you.", tags: ["night", "urban", "rough"] },
  { name: "Octavia Butler", quote: "All that you touch you change.", tags: ["warm"] },
  { name: "Zadie Smith", quote: "Time is how you spend your love.", tags: ["mild", "urban"] },
  { name: "Clarice Lispector", quote: "I write as if to save somebody’s life.", tags: ["interior", "intense"] },
  { name: "Rebecca Solnit", quote: "Hope is an embrace of the unknown.", tags: ["cool", "open"] }
];

useLocationBtn.addEventListener("click", handleUseMyLocation);
toggleManualBtn.addEventListener("click", toggleManualPanel);
cityForm.addEventListener("submit", handleManualSearch);
regenerateBtn.addEventListener("click", handleRegenerate);
saveBtn.addEventListener("click", saveCurrentEntry);
speakBtn.addEventListener("click", speakCurrentEntry);

renderArchive();

function setStatus(message) {
  statusText.textContent = message;
}

function toggleManualPanel() {
  manualPanel.classList.toggle("hidden");
  if (!manualPanel.classList.contains("hidden")) {
    cityInput.focus();
  }
}

async function handleUseMyLocation() {
  setStatus("Listening for your location...");

  try {
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;

    let detectedCity = null;
    try {
      detectedCity = await reverseGeocode(latitude, longitude);
    } catch (error) {
      console.error("reverseGeocode error:", error);
    }

    await buildEntryFromCoordinates({
      latitude,
      longitude,
      cityName: detectedCity,
      sourceLabel: "Your current location"
    });
  } catch (error) {
    console.error("handleUseMyLocation error:", error);
    setStatus("Location access was denied or unavailable. Please enter a city manually instead.");
    manualPanel.classList.remove("hidden");
    cityInput.focus();
  }
}

async function handleManualSearch(event) {
  event.preventDefault();

  const city = cityInput.value.trim();
  if (!city) {
    setStatus("Please enter a city first.");
    return;
  }

  try {
    setStatus("Finding your city in the archive...");
    const geo = await geocodeCity(city);

    await buildEntryFromCoordinates({
      latitude: geo.lat,
      longitude: geo.lng,
      cityName: geo.cityName,
      sourceLabel: "Manual city search"
    });
  } catch (error) {
    console.error("handleManualSearch error:", error);
    setStatus(error.message || "That city could not be found. Please try another one.");
  }
}

async function handleRegenerate() {
  if (!currentEntry) {
    setStatus("Generate a match first.");
    return;
  }

  try {
    setStatus("Searching for a different alignment...");

    const optionalQuote = await maybeGetQuote();
    const figure = chooseFigure(currentEntry.context);
    const scene = generateStory(currentEntry.context, figure, optionalQuote);

    currentEntry.figure = figure;
    currentEntry.scene = scene;
    currentEntry.optionalQuote = optionalQuote;

    renderEntry(currentEntry, true);
    setStatus("A different correspondence has been found.");
  } catch (error) {
    console.error("handleRegenerate error:", error);
    setStatus(error.message || "The match could not be regenerated right now.");
  }
}

function saveCurrentEntry() {
  if (!currentEntry) {
    setStatus("There is nothing to save yet.");
    return;
  }

  const savedEntries = getSavedEntries();
  const entryToSave = {
    id: Date.now(),
    title: currentEntry.figure.name,
    subtitle: `${currentEntry.context.city} · ${currentEntry.context.shortTimeLabel}`,
    meta: currentEntry.meta,
    figure: currentEntry.figure,
    scene: currentEntry.scene,
    optionalQuote: currentEntry.optionalQuote || null,
    context: currentEntry.context
  };

  savedEntries.unshift(entryToSave);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedEntries.slice(0, 12)));
  renderArchive();
  setStatus("This entry has been added to the archive.");
}

function speakCurrentEntry() {
  if (!currentEntry) {
    setStatus("Generate a match before reading it aloud.");
    return;
  }

  if (!("speechSynthesis" in window)) {
    setStatus("Speech synthesis is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const fullText = `Tonight, your atmosphere leans toward ${currentEntry.figure.name}. ${currentEntry.figure.quote}. ${currentEntry.scene}`;

  const utterance = new SpeechSynthesisUtterance(fullText);
  utterance.rate = 0.94;
  utterance.pitch = 1;
  utterance.lang = "en-US";

  window.speechSynthesis.speak(utterance);
  setStatus("Reading the entry aloud...");
}

async function buildEntryFromCoordinates({
  latitude,
  longitude,
  cityName = null,
  sourceLabel = ""
}) {
  setStatus("Studying the sky...");

  try {
    const weatherData = await getWeather(latitude, longitude);
    console.log("Weather API response:", weatherData);

    const weather = extractWeatherData(weatherData);
    const displayCity = shortenLocationName(
      cityName || inferCityName(weatherData) || "Unknown Place"
    );
    const now = new Date();

    const context = {
      city: displayCity,
      latitude,
      longitude,
      timeLabel: formatLongTime(now),
      shortTimeLabel: formatShortTime(now),
      hour: now.getHours(),
      temperature: weather.temperatureText,
      tempNumber: weather.tempNumber,
      description: weather.conditionText,
      weatherType: weather.weatherType,
      tempBand: weather.tempBand,
      partOfDay: getPartOfDay(now.getHours()),
      shortWeatherLabel: weather.shortLabel,
      weatherTheme: weather.theme,
      sourceLabel
    };

    setTheme(weather.theme);
    setStatus("Looking through the archive...");

    const optionalQuote = await maybeGetQuote();
    const figure = chooseFigure(context);
    const scene = generateStory(context, figure, optionalQuote);

    currentEntry = {
      meta: `${displayCity} · ${context.timeLabel} · ${weather.temperatureText} · ${weather.conditionText}`,
      figure,
      scene,
      optionalQuote,
      context
    };

    renderEntry(currentEntry);
    setStatus("Your correspondence is ready.");
  } catch (error) {
    console.error("buildEntryFromCoordinates error:", error);
    setStatus(error.message || "Something went wrong while building the entry.");
  }
}

function renderEntry(entry, isRegenerated = false) {
  sceneMeta.textContent = entry.meta;
  figureNameEl.textContent = entry.figure.name;
  figureQuoteEl.textContent = `“${entry.figure.quote}”`;
  matchTagsEl.textContent = buildMatchTags(entry.context, entry.figure);

  sceneText.textContent = "";
  void sceneText.offsetWidth;
  sceneText.style.animation = "none";
  sceneText.textContent = entry.scene;
  void sceneText.offsetWidth;
  sceneText.style.animation = "";

  resultPanel.classList.remove("hidden");

  if (!isRegenerated) {
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function buildMatchTags(context, figure) {
  const parts = [context.partOfDay, context.weatherType, context.tempBand];

  if (figure.tags.includes("urban")) parts.push("urban");
  if (figure.tags.includes("interior")) parts.push("interior");
  if (figure.tags.includes("intense")) parts.push("intense");
  if (figure.tags.includes("open")) parts.push("open");

  return parts.join(" / ");
}

function renderArchive() {
  const entries = getSavedEntries();

  if (entries.length === 0) {
    archiveList.innerHTML = `<p class="empty-archive">No saved entries yet.</p>`;
    return;
  }

  archiveList.innerHTML = "";

  entries.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "archive-item";

    button.innerHTML = `
      <span class="archive-title">${escapeHtml(entry.title)}</span>
      <span class="archive-subtitle">${escapeHtml(entry.subtitle)}</span>
    `;

    button.addEventListener("click", () => {
      currentEntry = entry;
      setTheme(entry.context?.weatherTheme || "theme-clear");
      renderEntry(currentEntry);
      setStatus("A saved entry has been reopened.");
    });

    archiveList.appendChild(button);
  });
}

function getSavedEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    console.error("getSavedEntries error:", error);
    return [];
  }
}

function setTheme(themeName) {
  document.body.classList.remove("theme-clear", "theme-rain", "theme-cloudy", "theme-warm");
  document.body.classList.add(themeName || "theme-clear");
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
}

async function geocodeCity(city) {
  const url = `${API_BASE}/geocode?address=${encodeURIComponent(city)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Geocoding request failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log("Geocode API response:", data);

  const firstResult = data?.results?.[0];
  const lat = firstResult?.geometry?.location?.lat;
  const lng = firstResult?.geometry?.location?.lng;
  const formattedAddress = firstResult?.formatted_address;

  if (lat == null || lng == null) {
    throw new Error("No matching city was found.");
  }

  return {
    lat,
    lng,
    cityName: formattedAddress || city
  };
}

async function reverseGeocode(latitude, longitude) {
  const url = `${API_BASE}/geocode?address=${encodeURIComponent(`${latitude},${longitude}`)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Reverse geocoding failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log("Reverse geocode response:", data);

  const firstResult = data?.results?.[0];
  return firstResult?.formatted_address || null;
}

async function getWeather(latitude, longitude) {
  const url = `${API_BASE}/weather?latitude=${latitude}&longitude=${longitude}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Weather request failed with status ${response.status}: ${errorText}`);
  }

  return await response.json();
}

async function maybeGetQuote() {
  try {
    const response = await fetch(`${API_BASE}/quotes/random`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Optional quote fetch failed:", error);
    return null;
  }
}

function extractWeatherData(data) {
  const possibleTemperature =
    data?.temperature?.degrees ??
    data?.current_weather?.temperature ??
    data?.current?.temperature_2m ??
    data?.current?.temp_f ??
    data?.current?.temp_c ??
    data?.temp;

  const possibleCondition =
    data?.weatherCondition?.description?.text ??
    data?.weather ??
    data?.description ??
    data?.current?.condition?.text ??
    data?.current?.weather ??
    data?.summary;

  let tempNumber = null;
  if (typeof possibleTemperature === "number") {
    tempNumber = Math.round(possibleTemperature);
  } else if (typeof possibleTemperature === "string") {
    const match = possibleTemperature.match(/-?\d+/);
    tempNumber = match ? Number(match[0]) : null;
  }

  const temperatureText = tempNumber != null ? `${tempNumber}°F` : "Unknown temperature";
  const conditionText = typeof possibleCondition === "string" ? possibleCondition : "Unspecified weather";
  const normalizedCondition = conditionText.toLowerCase();

  let theme = "theme-clear";
  let weatherType = "clear";

  if (
    normalizedCondition.includes("rain") ||
    normalizedCondition.includes("storm") ||
    normalizedCondition.includes("drizzle") ||
    normalizedCondition.includes("shower")
  ) {
    theme = "theme-rain";
    weatherType = "rain";
  } else if (
    normalizedCondition.includes("cloud") ||
    normalizedCondition.includes("fog") ||
    normalizedCondition.includes("mist") ||
    normalizedCondition.includes("overcast")
  ) {
    theme = "theme-cloudy";
    weatherType = normalizedCondition.includes("fog") || normalizedCondition.includes("mist") ? "fog" : "clouds";
  } else if (
    normalizedCondition.includes("sun") ||
    normalizedCondition.includes("clear")
  ) {
    theme = "theme-warm";
    weatherType = "clear";
  } else if (
    normalizedCondition.includes("dry")
  ) {
    theme = "theme-clear";
    weatherType = "dry";
  }

  let tempBand = "mild";
  if (tempNumber != null) {
    if (tempNumber < 45) tempBand = "cold";
    else if (tempNumber < 60) tempBand = "cool";
    else if (tempNumber < 75) tempBand = "mild";
    else if (tempNumber < 88) tempBand = "warm";
    else tempBand = "hot";
  }

  return {
    tempNumber,
    temperatureText,
    conditionText,
    shortLabel: `${temperatureText} · ${conditionText}`,
    theme,
    weatherType,
    tempBand
  };
}

function inferCityName(data) {
  return data?.location?.city || data?.city || data?.resolvedAddress || null;
}

function shortenLocationName(location) {
  if (!location) return "Unknown Place";
  const parts = location.split(",").map(part => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  return location;
}

function getPartOfDay(hour) {
  if (hour < 5) return "late-night";
  if (hour < 11) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 20) return "evening";
  return "night";
}

function chooseFigure(context) {
  const contextTags = [
    context.partOfDay,
    context.weatherType,
    context.tempBand
  ];

  const scored = figureArchive.map((figure) => {
    let score = 0;

    figure.tags.forEach((tag) => {
      if (contextTags.includes(tag)) score += 3;

      if (tag === "interior" && context.partOfDay === "night") score += 1;
      if (tag === "urban" && context.partOfDay !== "morning") score += 1;
      if (tag === "open" && context.weatherType === "clear") score += 1;
      if (tag === "rain" && context.weatherType === "rain") score += 2;
      if (tag === "clouds" && context.weatherType === "clouds") score += 2;
    });

    return { figure, score };
  });

  const max = Math.max(...scored.map((item) => item.score));
  const pool = scored.filter((item) => item.score >= max - 1).map((item) => item.figure);

  return pickRandom(pool);
}

function generateStory(context, figure, optionalQuote) {
  const storyGenerators = {
    "Franz Kafka": () =>
      `The ${context.partOfDay} feels slightly misplaced. ${context.city} continues, but something in it refuses to align. The air—${context.description.toLowerCase()} at ${context.temperature}—presses quietly against everything. Nothing has happened, exactly, and yet the scene seems arranged as if it expects your error. The street offers its usual explanations, though none of them feel binding. A person could stand under weather like this for ten minutes and come away altered without knowing by what.`,

    "Haruki Murakami": () =>
      `It is a ${context.description.toLowerCase()} ${context.partOfDay} in ${context.city}. The temperature rests at ${context.temperature}. Somewhere, something is missing, though you can't quite say what. The city seems complete enough from the outside, but a small private absence has entered the frame. You notice a light, a passing car, the sound of someone shutting a door a little too carefully. It all feels ordinary, which is usually when the stranger currents begin to move beneath things.`,

    "Joan Didion": () =>
      `${context.city}, ${context.partOfDay}. ${context.temperature}. The air is ${context.description.toLowerCase()}. You notice things. The way the weather refuses drama. The way the hour remains composed while something in it loosens. Nothing here asks to be interpreted, and yet interpretation begins anyway. There are evenings that flatter you with clarity and evenings that leave you alone with your own arrangement of facts. This one belongs to the latter category.`,

    "James Baldwin": () =>
      `The ${context.partOfDay} in ${context.city} carries weight. ${context.description} air, ${context.temperature}. You feel it not as weather, exactly, but as an atmosphere that has already taken your measure. The street stays visible, the buildings remain themselves, but the scene refuses innocence. Nothing in the hour appears theatrical, and that is precisely why it asks for honesty. Some nights are decorative; this one is not. This one expects you to face what it has quietly brought into view.`,

    "Virginia Woolf": () =>
      `The ${context.partOfDay} drifts through ${context.city}, ${context.description.toLowerCase()} and soft. The temperature—${context.temperature}—barely matters except as another delicate pressure laid upon the mind. Everything seems to move, quietly, inward. The passing world does not disappear, but it grows porous, threaded through with thought. There are moments when consciousness becomes the true landscape and the city merely supplies its outlines. This is one of them.`,

    "Sylvia Plath": () =>
      `The ${context.partOfDay} settles over ${context.city} like a held breath. ${context.description}. ${context.temperature}. Something in it hums beneath the surface, and the hum is not external. The weather does not announce itself; it enters more privately than that, taking its place among the thoughts already waiting in the room of the mind. There is a sharpness in ordinary things tonight, a bright pressure under the skin of the hour. Even stillness appears to be working toward something.`,

    "Albert Camus": () =>
      `${context.city} at ${context.partOfDay}. ${context.temperature}. The air is ${context.description.toLowerCase()}, and yet everything feels strangely clear, as if meaning could almost be grasped and then just as quickly withdrawn. The world offers surfaces, light, structure. It does not promise coherence. Still, under weather like this, a person might briefly mistake lucidity for peace. The difference reveals itself only later.`,

    "Anaïs Nin": () =>
      `${context.description} air wraps around ${context.city} in the ${context.partOfDay}. ${context.temperature}. It feels close, intimate, as if the weather had come not to cover the city but to touch it. The moment narrows. Sound softens. Things ordinarily held at a distance begin to move nearer—not physically, perhaps, but with the unmistakable pressure of recognition. There are moods that illuminate the world and moods that dissolve the boundary between the world and the self. This one belongs to the second kind.`,

    "Jack Kerouac": () =>
      `${context.city}, ${context.partOfDay}. ${context.temperature} and ${context.description.toLowerCase()}. The streets feel alive, like something is about to begin, or else has already begun somewhere just ahead of you. You can feel movement in the edges of the hour: headlights, footsteps, unfinished plans, the possibility of not going home yet. Weather like this has persuaded better people than you to keep moving long after they meant to stop.`,

    "Frida default": () =>
      `In ${context.city}, the ${context.partOfDay} settles in at ${context.temperature}. The air is ${context.description.toLowerCase()}, and something about it lingers longer than it should.`
  };

  let mainText = (storyGenerators[figure.name] || storyGenerators["Frida default"])();

  const reflectiveLine = buildReflectiveLine(context, figure);
  const closingLine = buildClosingLine(context);

  if (optionalQuote?.text) {
    mainText += ` Somewhere in the mind, another sentence lingers for a moment—“${optionalQuote.text}.” It does not explain the scene; it only deepens it.`;
  }

  return `${mainText} ${reflectiveLine} ${closingLine}`;
}

function buildReflectiveLine(context, figure) {
  const pools = {
    interior: [
      `Whatever this hour is withholding, it is withholding it with precision.`,
      `The scene feels less public than it did a few minutes ago.`,
      `You have the sense that attention itself has changed the arrangement of things.`
    ],
    urban: [
      `The city keeps moving, but not quickly enough to avoid becoming symbolic.`,
      `Under this kind of sky, even traffic seems to carry intention.`,
      `The buildings remain indifferent; the hour does not.`
    ],
    intense: [
      `Nothing visible insists on importance, which is usually how importance arrives.`,
      `The pressure in the scene is slight but unmistakable.`,
      `It is one of those moments that appears modest until memory edits it later.`
    ],
    open: [
      `There is room in the air tonight for consequence to arrive gently.`,
      `The weather leaves space for thought, and thought rarely leaves things untouched.`,
      `Clarity is never harmless for very long.`
    ],
    default: [
      `For now, the hour remains legible only in fragments.`,
      `The atmosphere offers no conclusion, only alignment.`,
      `You do not yet know what the moment means, only that it has begun to mean something.`
    ]
  };

  if (figure.tags.includes("interior")) return pickRandom(pools.interior);
  if (figure.tags.includes("urban")) return pickRandom(pools.urban);
  if (figure.tags.includes("intense")) return pickRandom(pools.intense);
  if (figure.tags.includes("open")) return pickRandom(pools.open);
  return pickRandom(pools.default);
}

function buildClosingLine(context) {
  const pools = {
    night: [
      `Usually, what happens next will look small from the outside.`,
      `The important nights rarely identify themselves in advance.`,
      `Nothing in the street will explain itself. That does not mean nothing is happening.`
    ],
    evening: [
      `Evening is generous with ambiguity and unforgiving about timing.`,
      `A scene like this can remain ordinary right up until it no longer is.`,
      `There are hours that pass and hours that gather. This one is gathering.`
    ],
    morning: [
      `Morning still pretends to be innocent, even when it has already chosen a direction.`,
      `The day has not announced its terms yet, but it has begun to draft them.`,
      `At this hour, what matters is often still disguised as atmosphere.`
    ],
    afternoon: [
      `By afternoon, the day has acquired enough shape to begin resisting you.`,
      `Nothing dramatic is required for a turning point to occur.`,
      `Somewhere inside this plainness, a shift has already started.`
    ],
    "late-night": [
      `This late, the city feels less like a place than a confession withheld.`,
      `The hour narrows everything except consequence.`,
      `Late-night weather is often only another word for exposure.`
    ]
  };

  return pickRandom(pools[context.partOfDay] || pools.night);
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function formatLongTime(date) {
  return date.toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function formatShortTime(date) {
  return date.toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
