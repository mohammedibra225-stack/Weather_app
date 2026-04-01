const API_KEY = (window.APP_CONFIG?.OPENWEATHER_API_KEY || '').trim();
let map = null, marker = null, mapTileLayer = null;
let forecastData = {};
let activeDayIdx = null;
let currentTheme = 'dark';

// ── DOM refs ──
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const themeToggle = document.getElementById('themeToggle');
const loader = document.getElementById('loader');
const placeholder = document.getElementById('placeholder');
const weatherContent = document.getElementById('weatherContent');
const errorToast = document.getElementById('errorToast');
const THEME_STORAGE_KEY = 'weather-theme';

// ── Search trigger ──
searchBtn.addEventListener('click', doSearch);
cityInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
themeToggle.addEventListener('click', toggleTheme);
initTheme();

async function doSearch() {
  const city = cityInput.value.trim();
  if (!city) { showError('Veuillez entrer une ville.'); return; }
  if (!API_KEY) {
    showError('Clé API manquante. Ajoutez votre clé dans config.js (OPENWEATHER_API_KEY).');
    return;
  }
  showLoading();
  try {
    const [current, forecast] = await Promise.all([
      fetchCurrent(city),
      fetchForecast(city)
    ]);
    hideError();
    displayAll(current, forecast);
  } catch (e) {
    showError(e.message || 'Impossible de récupérer les données.');
  } finally {
    hideLoading();
  }
}

// ── API calls ──
async function fetchCurrent(city) {
  const r = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=fr`
  );
  if (!r.ok) throw new Error('Ville introuvable. Vérifiez le nom et réessayez.');
  return r.json();
}

async function fetchForecast(city) {
  const r = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=fr&cnt=40`
  );
  if (!r.ok) throw new Error('Impossible de récupérer les prévisions.');
  return r.json();
}

// ── Main display ──
function displayAll(current, forecast) {
  placeholder.style.display = 'none';
  weatherContent.style.display = 'block';

  // Current weather
  document.getElementById('cityName').textContent = current.name;
  document.getElementById('countryDate').textContent =
    `${current.sys.country} · ${formatDate(new Date())}`;
  document.getElementById('mainEmoji').textContent = emoji(current.weather[0].id);
  document.getElementById('tempVal').textContent = Math.round(current.main.temp);
  document.getElementById('mainDesc').textContent = current.weather[0].description;
  document.getElementById('feelsLike').textContent = `Ressenti ${Math.round(current.main.feels_like)}°C`;
  document.getElementById('humidity').textContent = `${current.main.humidity}%`;
  document.getElementById('visibility').textContent = `${(current.visibility / 1000).toFixed(1)} km`;
  document.getElementById('pressure').textContent = `${current.main.pressure} hPa`;
  document.getElementById('clouds').textContent = `${current.clouds.all}%`;

  // Wind
  const wspeedKmh = Math.round(current.wind.speed * 3.6);
  document.getElementById('windSpeed').textContent = wspeedKmh;
  const deg = current.wind.deg || 0;
  document.getElementById('compassNeedle').style.transform =
    `translateX(-50%) translateY(-100%) rotate(${deg}deg)`;
  document.getElementById('windDirName').textContent = degToDir(deg);
  const gust = current.wind.gust ? Math.round(current.wind.gust * 3.6) + ' km/h' : 'N/A';
  document.getElementById('windGust').textContent = gust;
  const pct = Math.min((wspeedKmh / 120) * 100, 100);
  document.getElementById('windBar').style.width = pct + '%';
  document.getElementById('beaufortLabel').textContent = beaufortLabel(wspeedKmh);

  // Map
  initMap(current.coord.lat, current.coord.lon, current.name);

  // Forecast grouped by day
  forecastData = groupByDay(forecast.list);
  const days = Object.keys(forecastData).slice(0, 5);
  buildDayCards(days);

  // Show first day hourly by default
  activeDayIdx = 0;
  showHourly(days[0]);
  highlightDay(0);
}

// ── Forecast days ──
function groupByDay(list) {
  const groups = {};
  list.forEach(item => {
    const d = item.dt_txt.split(' ')[0];
    if (!groups[d]) groups[d] = [];
    groups[d].push(item);
  });
  return groups;
}

function buildDayCards(days) {
  const grid = document.getElementById('daysGrid');
  grid.innerHTML = '';
  days.forEach((day, i) => {
    const items = forecastData[day];
    const noon = items.find(x => x.dt_txt.includes('12:00')) || items[0];
    const maxT = Math.max(...items.map(x => x.main.temp_max));
    const minT = Math.min(...items.map(x => x.main.temp_min));
    const d = new Date(day + 'T12:00:00');

    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <div class="day-name">${dayNames(d)}</div>
      <div class="day-date">${d.getDate()}/${d.getMonth() + 1}</div>
      <span class="day-emoji">${emoji(noon.weather[0].id)}</span>
      <div class="day-high">${Math.round(maxT)}°</div>
      <div class="day-low">${Math.round(minT)}°</div>
    `;
    card.addEventListener('click', () => {
      activeDayIdx = i;
      highlightDay(i);
      showHourly(day);
    });
    grid.appendChild(card);
  });
}

function highlightDay(i) {
  document.querySelectorAll('.day-card').forEach((c, idx) => {
    c.classList.toggle('active', idx === i);
  });
}

// ── Hourly ──
function showHourly(day) {
  const items = forecastData[day];
  const section = document.getElementById('hourlySection');
  const inner = document.getElementById('hourlyInner');
  const title = document.getElementById('hourlyTitle');

  section.style.display = 'block';
  const d = new Date(day + 'T12:00:00');
  title.textContent = `Météo par heure · ${dayNames(d)} ${d.getDate()}/${d.getMonth() + 1}`;
  inner.innerHTML = '';

  items.forEach(item => {
    const t = item.dt_txt.split(' ')[1].substring(0, 5);
    const temp = Math.round(item.main.temp);
    const windKmh = Math.round(item.wind.speed * 3.6);
    const pop = item.pop ? Math.round(item.pop * 100) : 0;

    const card = document.createElement('div');
    card.className = 'hour-card';
    card.innerHTML = `
      <div class="hour-time">${t}</div>
      <span class="hour-emoji">${emoji(item.weather[0].id)}</span>
      <div class="hour-temp">${temp}°</div>
      <div class="hour-wind">💨 ${windKmh} km/h</div>
      ${pop > 0 ? `<div class="hour-pop">🌧 ${pop}%</div>` : ''}
    `;
    inner.appendChild(card);
  });
}

// ── Theme ──
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = (savedTheme === 'light' || savedTheme === 'dark')
    ? savedTheme
    : (prefersDark ? 'dark' : 'light');
  applyTheme(initialTheme, false);
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

function applyTheme(theme, persist = true) {
  currentTheme = theme;
  document.body.setAttribute('data-theme', theme);
  updateThemeToggleLabel();
  if (persist) localStorage.setItem(THEME_STORAGE_KEY, theme);
  updateMapTheme();
}

function updateThemeToggleLabel() {
  if (currentTheme === 'dark') {
    themeToggle.textContent = '☀️ Clair';
    themeToggle.setAttribute('title', 'Passer en mode clair');
    themeToggle.setAttribute('aria-label', 'Passer en mode clair');
    themeToggle.setAttribute('aria-pressed', 'true');
    return;
  }
  themeToggle.textContent = '🌙 Sombre';
  themeToggle.setAttribute('title', 'Passer en mode sombre');
  themeToggle.setAttribute('aria-label', 'Passer en mode sombre');
  themeToggle.setAttribute('aria-pressed', 'false');
}

function createMapTileLayer(theme) {
  const style = theme === 'light' ? 'light_all' : 'dark_all';
  return L.tileLayer(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`, { maxZoom: 19 });
}

function updateMapTheme() {
  if (!map) return;
  if (mapTileLayer) map.removeLayer(mapTileLayer);
  mapTileLayer = createMapTileLayer(currentTheme);
  mapTileLayer.addTo(map);
}

// ── Map ──
function initMap(lat, lon, name) {
  if (!map) {
    map = L.map('map', { zoomControl: true, attributionControl: false }).setView([lat, lon], 10);
    updateMapTheme();
  } else {
    map.setView([lat, lon], 10);
  }
  if (marker) map.removeLayer(marker);
  const icon = L.divIcon({
    html: `<div style="background:rgba(79,195,247,0.9);width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(79,195,247,0.8)"></div>`,
    iconAnchor: [8, 8],
    className: ''
  });
  marker = L.marker([lat, lon], { icon }).addTo(map);
  marker.bindPopup(`<b>${name}</b>`).openPopup();
}

// ── Helpers ──
function emoji(id) {
  if (id >= 200 && id < 300) return '⛈️';
  if (id >= 300 && id < 400) return '🌦️';
  if (id >= 500 && id < 600) return '🌧️';
  if (id >= 600 && id < 700) return '❄️';
  if (id >= 700 && id < 800) return '🌫️';
  if (id === 800)             return '☀️';
  if (id > 800 && id < 900)  return '☁️';
  return '🌡️';
}

function degToDir(deg) {
  const dirs = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
  return dirs[Math.round(deg / 45) % 8];
}

function beaufortLabel(kmh) {
  if (kmh < 2)   return 'Calme (Beaufort 0)';
  if (kmh < 6)   return 'Très légère brise (1)';
  if (kmh < 12)  return 'Légère brise (2)';
  if (kmh < 20)  return 'Petite brise (3)';
  if (kmh < 29)  return 'Jolie brise (4)';
  if (kmh < 39)  return 'Brise fraîche (5)';
  if (kmh < 50)  return 'Vent frais (6)';
  if (kmh < 62)  return 'Grand vent frais (7)';
  if (kmh < 75)  return 'Coup de vent (8)';
  if (kmh < 89)  return 'Fort coup de vent (9)';
  if (kmh < 103) return 'Tempête (10)';
  if (kmh < 118) return 'Violente tempête (11)';
  return 'Ouragan (12)';
}

function dayNames(d) {
  return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()];
}

function formatDate(d) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── UI states ──
function showLoading() {
  loader.style.display = 'block';
  weatherContent.style.display = 'none';
  placeholder.style.display = 'none';
}
function hideLoading() { loader.style.display = 'none'; }
function showError(msg) { errorToast.textContent = msg; errorToast.style.display = 'block'; }
function hideError() { errorToast.style.display = 'none'; }
