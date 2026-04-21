const STORAGE_KEY = "nutriTrackState";
const USER_KEY = "currentUser";
const API_BASE = "http://127.0.0.1:5000";
const DEFAULT_GOALS = { calories: 2000, protein: 90, carbs: 250, water: 2500 };
const LOCAL_FOOD_DB = {
  rice: { cal: 130, pro: 2.7, carb: 28 },
  roti: { cal: 120, pro: 3, carb: 20 },
  egg: { cal: 155, pro: 13, carb: 1.1 },
  chicken: { cal: 165, pro: 31, carb: 0 },
  paneer: { cal: 265, pro: 18, carb: 1.2 },
  milk: { cal: 42, pro: 3.4, carb: 5 },
  banana: { cal: 89, pro: 1.1, carb: 23 },
  apple: { cal: 52, pro: 0.3, carb: 14 },
  dal: { cal: 116, pro: 9, carb: 20 },
  bread: { cal: 265, pro: 9, carb: 49 },
  pizza: { cal: 266, pro: 11, carb: 33 },
  burger: { cal: 295, pro: 17, carb: 30 },
  noodles: { cal: 138, pro: 4.5, carb: 25 },
  pasta: { cal: 131, pro: 5, carb: 25 },
  salad: { cal: 33, pro: 2, carb: 6 },
  oats: { cal: 389, pro: 16.9, carb: 66.3 },
  yogurt: { cal: 59, pro: 10, carb: 3.6 },
  tofu: { cal: 144, pro: 17.3, carb: 2.8 },
  potato: { cal: 77, pro: 2, carb: 17 },
  idli: { cal: 146, pro: 4.5, carb: 29 },
  dosa: { cal: 184, pro: 4.3, carb: 29 },
  upma: { cal: 156, pro: 4, carb: 24 },
  poha: { cal: 130, pro: 2.6, carb: 25 },
  "peanut butter": { cal: 588, pro: 25, carb: 20 },
  rajma: { cal: 127, pro: 8.7, carb: 22.8 },
  "kidney beans": { cal: 127, pro: 8.7, carb: 22.8 },
  chole: { cal: 164, pro: 8.9, carb: 27.4 },
  chickpeas: { cal: 164, pro: 8.9, carb: 27.4 },
  omelette: { cal: 154, pro: 11, carb: 1.7 },
  biryani: { cal: 180, pro: 6, carb: 25 },
  samosa: { cal: 262, pro: 4.2, carb: 24 },
  "pav bhaji": { cal: 151, pro: 3.6, carb: 20 },
  "grilled fish": { cal: 128, pro: 26, carb: 0 },
  "ice cream": { cal: 207, pro: 3.5, carb: 24 },
  khichdi: { cal: 105, pro: 3.4, carb: 18 },
  paratha: { cal: 260, pro: 5.5, carb: 33 },
  "aloo paratha": { cal: 265, pro: 6, carb: 36 },
  "curd rice": { cal: 132, pro: 3.1, carb: 21 },
  pakora: { cal: 312, pro: 6.5, carb: 27 },
  vada: { cal: 220, pro: 7, carb: 25 },
  "dal makhani": { cal: 170, pro: 7.3, carb: 18 },
  "palak paneer": { cal: 140, pro: 6.5, carb: 7 },
  "butter chicken": { cal: 220, pro: 15, carb: 6 },
  "tandoori chicken": { cal: 190, pro: 27, carb: 3 },
  dosa: { cal: 184, pro: 4.3, carb: 29 },
  uttapam: { cal: 180, pro: 5, carb: 29 },
  sambar: { cal: 58, pro: 2.2, carb: 9 },
  rasam: { cal: 35, pro: 1.2, carb: 5 },
  lassi: { cal: 98, pro: 3.3, carb: 15 },
  jalebi: { cal: 459, pro: 4.6, carb: 56 },
  gulab: { cal: 380, pro: 4, carb: 54 },
  barfi: { cal: 420, pro: 7, carb: 45 }
};

const todayKey = getLocalDateKey();
const state = loadState();
let charts = [];
let backendStatus = { available: false, apiKeyConfigured: false };

function getLocalDateKey(offset = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offset);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadState() {
  const fallback = {
    goals: { ...DEFAULT_GOALS },
    entries: [],
    favorites: [],
    water: {},
    legacyMealMigrated: false
  };

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const nextState = parsed && typeof parsed === "object" ? parsed : fallback;
    nextState.goals = { ...DEFAULT_GOALS, ...(nextState.goals || {}) };
    nextState.entries = Array.isArray(nextState.entries) ? nextState.entries : [];
    nextState.favorites = Array.isArray(nextState.favorites) ? nextState.favorites : [];
    nextState.water = nextState.water && typeof nextState.water === "object" ? nextState.water : {};
    nextState.legacyMealMigrated = Boolean(nextState.legacyMealMigrated);
    return nextState;
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function migrateLegacyMeal() {
  if (state.legacyMealMigrated) {
    return;
  }

  try {
    const legacyMeal = JSON.parse(localStorage.getItem("meal") || "null");
    if (legacyMeal && (legacyMeal.cal || legacyMeal.pro || legacyMeal.carb)) {
      state.entries.push({
        id: `legacy-${Date.now()}`,
        name: "Imported total",
        qty: 100,
        cal: Number(legacyMeal.cal) || 0,
        pro: Number(legacyMeal.pro) || 0,
        carb: Number(legacyMeal.carb) || 0,
        mealType: "Imported",
        note: "Migrated from the previous project version.",
        source: "migration",
        date: todayKey,
        time: formatTime()
      });
    }
  } catch {
    // Ignore invalid legacy storage.
  }

  state.legacyMealMigrated = true;
  localStorage.removeItem("meal");
  saveState();
}

function currentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function requireAuth() {
  const protectedPages = ["calculator.html", "dashboard.html", "awareness.html", "logout.html"];
  if (protectedPages.includes(currentPage()) && !getCurrentUser()) {
    window.location.href = "login.html";
  }
}

function getTodayEntries() {
  return state.entries.filter((entry) => entry.date === todayKey);
}

function calculateTotals(entries = getTodayEntries()) {
  return entries.reduce(
    (acc, entry) => {
      acc.cal += Number(entry.cal) || 0;
      acc.pro += Number(entry.pro) || 0;
      acc.carb += Number(entry.carb) || 0;
      return acc;
    },
    { cal: 0, pro: 0, carb: 0 }
  );
}

function formatPercent(value, target) {
  if (!target) {
    return 0;
  }
  return Math.min(Math.round((value / target) * 100), 100);
}

function setProgress(id, value, target) {
  const element = document.getElementById(id);
  if (element) {
    element.style.width = `${formatPercent(value, target)}%`;
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getWaterToday() {
  return Number(state.water[todayKey] || 0);
}

function addWater(amount) {
  state.water[todayKey] = getWaterToday() + amount;
  saveState();
  updateCalculatorPage();
}

function resetWater() {
  state.water[todayKey] = 0;
  saveState();
  updateCalculatorPage();
}

function buildFoodSuggestions() {
  const dataList = document.getElementById("foodSuggestions");
  if (!dataList) {
    return;
  }

  const items = [...new Set([...Object.keys(LOCAL_FOOD_DB), ...state.favorites.map((item) => item.name.toLowerCase())])];
  dataList.innerHTML = items.map((item) => `<option value="${escapeHtml(item)}"></option>`).join("");
}

function renderFavorites() {
  const container = document.getElementById("favoritesList");
  if (!container) {
    return;
  }

  if (!state.favorites.length) {
    container.innerHTML = `<div class="empty-state">Save foods you eat often to add them faster.</div>`;
    return;
  }

  container.innerHTML = state.favorites
    .map(
      (favorite, index) => `
        <div class="history-item">
          <div>
            <strong>${escapeHtml(favorite.name)}</strong>
            <div class="meta mt-1">${favorite.qty}g default portion</div>
          </div>
          <div class="flex gap-2">
            <button class="btn-ghost" onclick="useFavorite(${index})">Use</button>
            <button class="btn-danger" onclick="removeFavorite(${index})">Delete</button>
          </div>
        </div>
      `
    )
    .join("");
}

function saveCurrentAsFavorite() {
  const name = document.getElementById("foodName")?.value.trim();
  const qty = parseFloat(document.getElementById("quantity")?.value) || 100;
  if (!name) {
    alert("Enter a food name first, then save it as a favorite.");
    return;
  }

  const normalized = name.toLowerCase();
  const existing = state.favorites.find((item) => item.name.toLowerCase() === normalized);
  if (existing) {
    existing.qty = qty;
  } else {
    state.favorites.unshift({ name, qty });
  }

  state.favorites = state.favorites.slice(0, 8);
  saveState();
  renderFavorites();
  buildFoodSuggestions();
}

function useFavorite(index) {
  const favorite = state.favorites[index];
  if (!favorite) {
    return;
  }

  const foodName = document.getElementById("foodName");
  const quantity = document.getElementById("quantity");
  if (foodName) {
    foodName.value = favorite.name;
  }
  if (quantity) {
    quantity.value = favorite.qty;
  }
}

function removeFavorite(index) {
  state.favorites.splice(index, 1);
  saveState();
  renderFavorites();
  buildFoodSuggestions();
}

function getMealSuggestions(type) {
  if (type === "protein") {
    return "Try eggs, paneer, Greek yogurt, dal, chicken, tofu, or milk with fruit.";
  }
  return "A quick balanced meal could be roti or rice with dal and salad, or a sandwich with fruit and milk.";
}

function applyPreset(type) {
  const box = document.getElementById("aiSuggestion");
  if (box) {
    box.textContent = getMealSuggestions(type);
  }
}

function estimateFromLocalDb(name, qty) {
  const lowered = name.toLowerCase();
  for (const [food, macros] of Object.entries(LOCAL_FOOD_DB)) {
    if (lowered.includes(food)) {
      return {
        cal: (macros.cal / 100) * qty,
        pro: (macros.pro / 100) * qty,
        carb: (macros.carb / 100) * qty,
        fallback: true,
        source: "browser_fallback",
        note: `Estimated offline from local match: ${food}`
      };
    }
  }

  if (lowered.includes("juice")) {
    return { cal: 45 * qty / 100, pro: 0.5 * qty / 100, carb: 11 * qty / 100, fallback: true, source: "browser_fallback", note: "Estimated offline beverage value" };
  }

  return { cal: 180 * qty / 100, pro: 6 * qty / 100, carb: 25 * qty / 100, fallback: true, source: "browser_fallback", note: "Estimated offline general value" };
}

async function fetchNutrition(name, qty) {
  const query = `${qty}g ${name}`;

  try {
    const response = await fetch(`${API_BASE}/nutrition?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || "Unable to fetch nutrition.");
    }

    const cal = Number(data.cal) || 0;
    const pro = Number(data.pro) || 0;
    const carb = Number(data.carb) || 0;
    return {
      cal: data.fallback ? (cal / 100) * qty : cal,
      pro: data.fallback ? (pro / 100) * qty : pro,
      carb: data.fallback ? (carb / 100) * qty : carb,
      fallback: Boolean(data.fallback),
      source: data.source || (data.fallback ? "backend_fallback" : "api"),
      note: data.note || ""
    };
  } catch {
    return estimateFromLocalDb(name, qty);
  }
}

async function handleFoodInput() {
  const name = document.getElementById("foodName")?.value.trim();
  const qty = parseFloat(document.getElementById("quantity")?.value);
  const mealType = document.getElementById("mealType")?.value || "Snack";
  const note = document.getElementById("mealNote")?.value.trim() || "";

  if (!name || Number.isNaN(qty) || qty <= 0) {
    alert("Please enter a valid food name and quantity.");
    return;
  }

  document.getElementById("loader")?.classList.remove("hidden");

  try {
    const data = await fetchNutrition(name, qty);
    state.entries.unshift({
      id: `${Date.now()}`,
      name,
      qty,
      cal: Number(data.cal) || 0,
      pro: Number(data.pro) || 0,
      carb: Number(data.carb) || 0,
      mealType,
      note: note || data.note || "",
      source: data.source || "unknown",
      date: todayKey,
      time: formatTime()
    });

    saveState();
    updateCalculatorPage();
    updateDashboardPage();

    document.getElementById("foodName").value = "";
    document.getElementById("quantity").value = "";
    document.getElementById("mealNote").value = "";
    updateFoodSourceHint(data.source, data.note);
  } finally {
    document.getElementById("loader")?.classList.add("hidden");
  }
}

function updateFoodSourceHint(source, note) {
  const hint = document.getElementById("foodSourceHint");
  if (!hint) {
    return;
  }

  const labelMap = {
    api: "Live API result used",
    local_database: "Backend local database estimate used",
    backend_fallback: "Backend fallback estimate used",
    browser_fallback: "Offline browser estimate used",
    migration: "Migrated project data"
  };

  hint.textContent = note ? `${labelMap[source] || "Nutrition source used"} - ${note}` : (labelMap[source] || "Nutrition source used");
  hint.classList.remove("hidden");
}

function removeEntry(id) {
  const index = state.entries.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    state.entries.splice(index, 1);
    saveState();
    updateCalculatorPage();
    updateDashboardPage();
  }
}

function renderHistory(containerId, entries, withDelete = false) {
  const list = document.getElementById(containerId);
  if (!list) {
    return;
  }

  if (!entries.length) {
    list.innerHTML = `<div class="empty-state">No meals added for today yet.</div>`;
    return;
  }

  list.innerHTML = entries
    .map(
      (entry) => `
        <div class="${containerId === "list" ? "food-item" : "history-item"}">
          <div>
            <strong>${escapeHtml(entry.name)}</strong>
            <div class="meta mt-1">${entry.mealType} - ${entry.qty}g - ${entry.time}</div>
            ${entry.note ? `<div class="meta mt-1">${escapeHtml(entry.note)}</div>` : ""}
          </div>
          <div class="text-right">
            <div class="font-semibold">${Math.round(entry.cal)} kcal</div>
            <div class="meta mt-1">${entry.pro.toFixed(1)}g pro - ${entry.carb.toFixed(1)}g carbs</div>
            ${withDelete ? `<button class="btn-ghost mt-3" onclick="removeEntry('${entry.id}')">Remove</button>` : ""}
          </div>
        </div>
      `
    )
    .join("");
}

function generateSuggestion(totals) {
  const messages = [];

  if (totals.cal < state.goals.calories * 0.65) {
    messages.push("Calories are still low for the day. One more balanced meal would help.");
  } else if (totals.cal > state.goals.calories * 1.12) {
    messages.push("Calories are above target, so keep your next meal lighter.");
  } else {
    messages.push("Calories look reasonably aligned with your target.");
  }

  if (totals.pro < state.goals.protein * 0.75) {
    messages.push("Protein is behind target. Eggs, paneer, dal, yogurt, tofu, or chicken would help.");
  } else {
    messages.push("Protein is in a healthy range for the day.");
  }

  if (totals.carb > state.goals.carbs * 1.1) {
    messages.push("Carbs are running high, so pair your next meal with more protein or vegetables.");
  } else {
    messages.push("Carbs look manageable.");
  }

  if (getWaterToday() < state.goals.water * 0.5) {
    messages.push("Hydration is still low. Add some water this afternoon.");
  }

  return messages.join(" ");
}

function updateCalculatorPage() {
  const result = document.getElementById("result");
  if (!result) {
    return;
  }

  const totals = calculateTotals();
  const entries = getTodayEntries();
  const water = getWaterToday();

  result.innerHTML = `
    <div class="grid grid-cols-3 gap-3 text-center">
      <div class="stat-card">
        <div class="stat-number">${Math.round(totals.cal)}</div>
        <div class="meta mt-1">Calories</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${totals.pro.toFixed(1)}</div>
        <div class="meta mt-1">Protein</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${totals.carb.toFixed(1)}</div>
        <div class="meta mt-1">Carbs</div>
      </div>
    </div>
  `;

  renderHistory("list", entries, true);
  renderFavorites();
  buildFoodSuggestions();

  setText("currentDateLabel", new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }));
  setProgress("progressBar", totals.cal, state.goals.calories);
  setProgress("proteinBar", totals.pro, state.goals.protein);
  setProgress("carbBar", totals.carb, state.goals.carbs);
  setProgress("waterBar", water, state.goals.water);

  setText("calorieProgressLabel", `${formatPercent(totals.cal, state.goals.calories)}%`);
  setText("proteinProgressLabel", `${formatPercent(totals.pro, state.goals.protein)}%`);
  setText("carbProgressLabel", `${formatPercent(totals.carb, state.goals.carbs)}%`);
  setText("waterProgressLabel", `${formatPercent(water, state.goals.water)}%`);
  setText("waterStatus", `${water} ml`);
  setText("aiSuggestion", generateSuggestion(totals));

  const goalCalories = document.getElementById("goalCalories");
  const goalProtein = document.getElementById("goalProtein");
  const goalCarbs = document.getElementById("goalCarbs");
  if (goalCalories) {
    goalCalories.value = state.goals.calories;
  }
  if (goalProtein) {
    goalProtein.value = state.goals.protein;
  }
  if (goalCarbs) {
    goalCarbs.value = state.goals.carbs;
  }
}

function saveGoals() {
  const calories = Number(document.getElementById("goalCalories")?.value);
  const protein = Number(document.getElementById("goalProtein")?.value);
  const carbs = Number(document.getElementById("goalCarbs")?.value);

  if (!calories || !protein || !carbs) {
    alert("Please enter valid daily goals.");
    return;
  }

  state.goals = { ...state.goals, calories, protein, carbs };
  saveState();
  updateCalculatorPage();
  updateDashboardPage();
}

function buildInsights(totals, entries) {
  const insights = [];

  if (!entries.length) {
    return ["Start by adding your first meal today to unlock insights."];
  }

  const mealTypes = new Set(entries.map((entry) => entry.mealType));
  if (mealTypes.size < 3) {
    insights.push("Meals are logged in only a few categories. Logging breakfast, lunch, dinner, and snacks gives better insight.");
  }

  if (totals.pro < state.goals.protein * 0.7) {
    insights.push("Protein is the biggest improvement area today. Add a protein-focused snack or dinner side.");
  }

  if (totals.cal > state.goals.calories * 1.15) {
    insights.push("Calories are well above target. A lighter next meal with more fiber would help.");
  }

  if (getWaterToday() < state.goals.water * 0.5) {
    insights.push("Water intake is behind goal. Add 500 to 750 ml over the next part of the day.");
  }

  if (entries.some((entry) => /sweet|cake|chocolate|pizza|burger/i.test(entry.name))) {
    insights.push("You logged at least one comfort-style food today. Pairing it with protein or produce can improve balance.");
  }

  insights.push("The tracker can still estimate foods even if the live API is unavailable.");
  return insights.slice(0, 5);
}

function calculateBalanceScore(totals) {
  const calorieScore = 100 - Math.min(Math.abs(totals.cal - state.goals.calories) / state.goals.calories, 1) * 45;
  const proteinScore = Math.min((totals.pro / state.goals.protein) * 100, 100);
  const carbScore = 100 - Math.min(Math.abs(totals.carb - state.goals.carbs) / state.goals.carbs, 1) * 35;
  const waterScore = Math.min((getWaterToday() / state.goals.water) * 100, 100);
  return Math.max(0, Math.round((calorieScore + proteinScore + carbScore + waterScore) / 4));
}

function destroyCharts() {
  charts.forEach((chart) => chart.destroy());
  charts = [];
}

function getWeeklyEntriesSummary() {
  const result = [];
  for (let offset = -6; offset <= 0; offset += 1) {
    const dateKey = getLocalDateKey(offset);
    const dayEntries = state.entries.filter((entry) => entry.date === dateKey);
    result.push({
      dateKey,
      label: new Date(dateKey).toLocaleDateString([], { weekday: "short" }),
      totals: calculateTotals(dayEntries),
      count: dayEntries.length
    });
  }
  return result;
}

function renderWeeklySummary() {
  const container = document.getElementById("weeklySummary");
  if (!container) {
    return;
  }

  const items = getWeeklyEntriesSummary();
  container.innerHTML = items
    .map((item) => {
      const percent = formatPercent(item.totals.cal, state.goals.calories);
      return `
        <div class="history-item">
          <div>
            <strong>${item.label}</strong>
            <div class="meta mt-1">${item.count} logged item${item.count === 1 ? "" : "s"}</div>
          </div>
          <div class="w-44">
            <div class="meta text-right mb-2">${Math.round(item.totals.cal)} kcal</div>
            <div class="progress-shell"><div class="progress-bar" style="width:${percent}%;"></div></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderWeeklyChart(items) {
  const canvas = document.getElementById("chart4");
  if (!canvas) {
    return;
  }

  charts.push(
    new Chart(canvas, {
      type: "line",
      data: {
        labels: items.map((item) => item.label),
        datasets: [
          {
            label: "Calories",
            data: items.map((item) => Math.round(item.totals.cal)),
            borderColor: "#c5663f",
            backgroundColor: "rgba(197, 102, 63, 0.14)",
            tension: 0.35,
            fill: true
          },
          {
            label: "Protein",
            data: items.map((item) => Number(item.totals.pro.toFixed(1))),
            borderColor: "#2d7b6f",
            backgroundColor: "rgba(45, 123, 111, 0.1)",
            tension: 0.35,
            fill: false
          }
        ]
      },
      options: {
        plugins: {
          legend: { position: "bottom" }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    })
  );
}

function calculateStreak() {
  let streak = 0;
  let offset = 0;
  while (true) {
    const key = getLocalDateKey(-offset);
    const hasEntry = state.entries.some((entry) => entry.date === key);
    if (!hasEntry) {
      break;
    }
    streak += 1;
    offset += 1;
  }
  return streak;
}

function updateDashboardPage() {
  if (!document.getElementById("chart1")) {
    return;
  }

  const entries = getTodayEntries();
  const totals = calculateTotals(entries);
  const balanceScore = calculateBalanceScore(totals);
  const insights = buildInsights(totals, entries);
  const weeklyItems = getWeeklyEntriesSummary();

  setText("dashboardDateLabel", new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", year: "numeric" }));
  setText("cal", Math.round(totals.cal));
  setText("pro", `${totals.pro.toFixed(1)}g`);
  setText("carb", `${totals.carb.toFixed(1)}g`);

  setText("calMeta", `${formatPercent(totals.cal, state.goals.calories)}% of ${state.goals.calories} kcal goal`);
  setText("proMeta", `${formatPercent(totals.pro, state.goals.protein)}% of ${state.goals.protein}g goal`);
  setText("carbMeta", `${formatPercent(totals.carb, state.goals.carbs)}% of ${state.goals.carbs}g goal`);

  setProgress("dashboardCalorieBar", totals.cal, state.goals.calories);
  setProgress("dashboardProteinBar", totals.pro, state.goals.protein);
  setProgress("dashboardCarbBar", totals.carb, state.goals.carbs);

  setText("dashboardCalorieLabel", `${Math.round(totals.cal)} / ${state.goals.calories}`);
  setText("dashboardProteinLabel", `${totals.pro.toFixed(1)} / ${state.goals.protein}g`);
  setText("dashboardCarbLabel", `${totals.carb.toFixed(1)} / ${state.goals.carbs}g`);
  setText("streakValue", `${calculateStreak()} day${calculateStreak() === 1 ? "" : "s"}`);

  setText("balanceScore", `${balanceScore}/100`);
  setText(
    "balanceSummary",
    balanceScore >= 80
      ? "This is a strong nutrition day so far."
      : balanceScore >= 60
        ? "Your day is fairly balanced, with a little room to tighten one or two areas."
        : "The tracker sees a few gaps today, mostly around goals, water, and meal balance."
  );

  setText("mealCountLabel", `${entries.length} item${entries.length === 1 ? "" : "s"} logged`);
  renderHistory("dashboardHistory", entries.slice(0, 5), false);
  renderWeeklySummary();

  const analysis = document.getElementById("analysis");
  if (analysis) {
    analysis.innerHTML = insights.map((item) => `<div class="tip-item"><div>${escapeHtml(item)}</div></div>`).join("");
  }

  destroyCharts();

  charts.push(
    new Chart(document.getElementById("chart1"), {
      type: "doughnut",
      data: {
        labels: ["Protein", "Carbs", "Estimated fats"],
        datasets: [{
          data: [totals.pro || 1, totals.carb || 1, Math.max(1, totals.cal * 0.035)],
          backgroundColor: ["#2d7b6f", "#f0b44d", "#c5663f"]
        }]
      },
      options: { plugins: { legend: { position: "bottom" } } }
    })
  );

  charts.push(
    new Chart(document.getElementById("chart2"), {
      type: "bar",
      data: {
        labels: ["Consumed", "Target"],
        datasets: [{
          label: "Calories",
          data: [Math.round(totals.cal), state.goals.calories],
          backgroundColor: ["#c5663f", "#d9c4aa"]
        }]
      },
      options: { plugins: { legend: { display: false } } }
    })
  );

  charts.push(
    new Chart(document.getElementById("chart3"), {
      type: "radar",
      data: {
        labels: ["Calories", "Protein", "Carbs", "Water"],
        datasets: [{
          label: "Score",
          data: [
            formatPercent(totals.cal, state.goals.calories),
            formatPercent(totals.pro, state.goals.protein),
            formatPercent(totals.carb, state.goals.carbs),
            formatPercent(getWaterToday(), state.goals.water)
          ],
          backgroundColor: "rgba(45, 123, 111, 0.18)",
          borderColor: "#2d7b6f",
          pointBackgroundColor: "#2d7b6f"
        }]
      },
      options: {
        scales: {
          r: {
            suggestedMin: 0,
            suggestedMax: 100,
            ticks: { display: false }
          }
        }
      }
    })
  );

  renderWeeklyChart(weeklyItems);
}

async function checkBackendHealth() {
  const statusEl = document.getElementById("apiStatus");
  if (!statusEl) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    backendStatus = {
      available: Boolean(response.ok),
      apiKeyConfigured: Boolean(data.api_key_configured)
    };

    if (backendStatus.available && backendStatus.apiKeyConfigured) {
      statusEl.textContent = "Backend connected - live API enabled";
    } else if (backendStatus.available) {
      statusEl.textContent = "Backend connected - using fallback estimates unless API key is added";
    } else {
      statusEl.textContent = "Backend unavailable - browser offline estimates will be used";
    }
  } catch {
    backendStatus = { available: false, apiKeyConfigured: false };
    statusEl.textContent = "Backend unavailable - browser offline estimates will be used";
  }
}

function updateAuthLink() {
  const link = document.getElementById("authLink");
  if (!link) {
    return;
  }

  if (getCurrentUser()) {
    link.textContent = "Logout";
    link.href = "logout.html";
  } else {
    link.textContent = "Login";
    link.href = "login.html";
  }
}

function login() {
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;

  if (email === "user@gmail.com" && password === "1234") {
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        email,
        name: "Demo User",
        loginAt: new Date().toISOString()
      })
    );
    window.location.href = "index.html";
  } else {
    alert("Invalid credentials. Use the demo login shown on the page.");
  }
}

function logout() {
  localStorage.removeItem(USER_KEY);
  window.location.href = "login.html";
}

function resetData() {
  if (confirm("Clear all of today's entries?")) {
    state.entries = state.entries.filter((entry) => entry.date !== todayKey);
    saveState();
    updateCalculatorPage();
    updateDashboardPage();
  }
}

window.handleFoodInput = handleFoodInput;
window.removeEntry = removeEntry;
window.resetData = resetData;
window.saveGoals = saveGoals;
window.applyPreset = applyPreset;
window.login = login;
window.logout = logout;
window.addWater = addWater;
window.resetWater = resetWater;
window.saveCurrentAsFavorite = saveCurrentAsFavorite;
window.useFavorite = useFavorite;
window.removeFavorite = removeFavorite;

window.addEventListener("DOMContentLoaded", async () => {
  migrateLegacyMeal();
  requireAuth();
  updateAuthLink();
  buildFoodSuggestions();
  updateCalculatorPage();
  updateDashboardPage();
  await checkBackendHealth();
});
