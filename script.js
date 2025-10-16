// Diagnostic startup log and global error handlers
try {
  console.log('script.js loading...');
} catch (e) {}

// Capture uncaught errors and unhandled promise rejections early so they show in console
window.addEventListener('error', function (ev) {
  try { console.error('Uncaught error:', ev.error || ev.message, ev); } catch (e) {}
});
window.addEventListener('unhandledrejection', function (ev) {
  try { console.error('Unhandled promise rejection:', ev.reason); } catch (e) {}
});

// API Key (from config.js). Create a `config.js` with window.APP_CONFIG = { apiKey: '...' }
const apiKey = (window.APP_CONFIG && window.APP_CONFIG.apiKey) ? window.APP_CONFIG.apiKey : null;
const hasApiKey = !!apiKey;
if (!hasApiKey) {
  try { console.warn('No API key found. Add a config.js with window.APP_CONFIG.apiKey'); } catch (e) {}
}

// Helper: write to runtime debug banner if present
function setRuntimeDebug(msg, visible = true) {
  try {
    const el = document.getElementById('runtimeDebug');
    if (!el) return;
    el.textContent = msg;
    el.style.display = visible ? 'block' : 'none';
  } catch (e) {}
}

const form = document.getElementById("formSearch");
const cityInput = document.getElementById("inputCity");
const errorMsg = document.getElementById("errorMsg");
const weatherResult = document.getElementById("weatherResult");
const loading = document.getElementById("spinner");
const coordReadout = document.getElementById('coordsText');
const fetchStatus = document.getElementById('statusText');
const copyCoordsBtn = document.getElementById('btnCopyCoords');

const cityName = document.getElementById("cityName");
const weatherIcon = document.getElementById("weatherIcon");
const temperature = document.getElementById("temperature");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const feelsLike = document.getElementById("feelsLike");
const pressure = document.getElementById("pressure");


// Suggestions container
const suggestions = document.getElementById("listSuggestions");
const lastCityContainer = document.getElementById("lastCityContainer");
const lastCitySpan = document.getElementById("lastCity");
const clearLastBtn = document.getElementById("btnClearLast");
const submitBtn = form.querySelector('button[type="submit"]');

// restore last city from localStorage (if any)
const saved = localStorage.getItem('lastCity');
if (saved) {
  lastCitySpan.textContent = saved;
  lastCityContainer.style.display = 'block';
}

// Unit toggle: default metric (Celsius)
const unitToggle = document.getElementById('toggleUnit');
const unitLabel = document.getElementById('labelUnit');
let units = localStorage.getItem('units') || 'metric'; // 'metric' or 'imperial'
if (units === 'imperial') {
  unitToggle.checked = true;
  unitLabel.textContent = '°F';
} else {
  unitToggle.checked = false;
  unitLabel.textContent = '°C';
}

unitToggle.addEventListener('change', () => {
  units = unitToggle.checked ? 'imperial' : 'metric';
  unitLabel.textContent = unitToggle.checked ? '°F' : '°C';
  localStorage.setItem('units', units);

  // if we have a visible weather result, re-fetch for current city in new units
  if (weatherResult.style.display === 'block') {
    // try to use displayed city text, but prefer last saved city
    const last = localStorage.getItem('lastCity');
    if (last) getWeatherByCity(last);
  }
});

// Search by City
form.addEventListener("submit", function (event) 
{
  event.preventDefault();
  const city = cityInput.value.trim();

  if (city === "") 
 {
    showError("Please enter a city name.");
    return;
  }
  getWeatherByCity(city);
});

//  "Use My Location" button
document.getElementById("locBtn").addEventListener("click", () => 
{
  if (navigator.geolocation) 
{
    navigator.geolocation.getCurrentPosition(
      (pos) => 
      {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        getWeatherByCoords(lat, lon);
      },
      () => 
      {
        showError("Location access denied. Please enable GPS.");
      }
    );
  } 
  else 
  {
    showError("Geolocation not supported by your browser.");
  }
});

//  Fetch weather by City Name
async function getWeatherByCity(city) 
{
  if (!hasApiKey) { showError('API key missing. Create `config.js` from `config.example.js` and add your OpenWeatherMap key.'); return; }
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=${units}`;
  if (fetchStatus) fetchStatus.textContent = 'Fetching weather...';
  if (loading) loading.style.display = 'inline-block';
  fetchWeather(url);

  // also fetch forecast (5 day/3 hour) to show forecast and hourly chart
  try {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=${units}`;
    fetchForecast(forecastUrl);
  } catch (e) {
    console.error('Forecast fetch error', e);
  }
}

//  Fetch weather by Coordinates
async function getWeatherByCoords(lat, lon) 
{
  if (!hasApiKey) { showError('API key missing. Create `config.js` from `config.example.js` and add your OpenWeatherMap key.'); return; }
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
  if (fetchStatus) fetchStatus.textContent = 'Fetching weather...';
  if (loading) loading.style.display = 'inline-block';
  fetchWeather(url);

  // also fetch forecast by coordinates
  try {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
    fetchForecast(forecastUrl);
  } catch (e) {
    console.error('Forecast fetch error', e);
  }
}

//  Reusable fetch function
async function fetchWeather(url) 
{
  // show loading and disable submit to prevent duplicate requests
  if (loading) loading.style.display = 'block';
  if (submitBtn) submitBtn.disabled = true;
  console.log('Fetching weather:', url);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // try to parse message from API
      let msg = 'Unable to fetch weather. Try again.';
      try {
        const err = await response.json();
        if (err && err.message) msg = err.message;
      } 
      catch (e) 
      {
        // ignore parse errors
      }

      // handle common statuses
      if (response.status === 404) msg = 'City not found. Check the spelling.';
      if (response.status === 401) msg = 'Invalid API key. Please check your API key.';

      showError(msg);
      return;
    }

    const data = await response.json();
    displayWeather(data);
    // cache last successful weather (simple localStorage fallback)
    try { localStorage.setItem('lastWeather', JSON.stringify(data)); } catch(e){}
    // update coord readout from response coordinates
    try {
      if (data.coord && coordReadout) {
        coordReadout.textContent = `Lat: ${data.coord.lat.toFixed(6)}, Lon: ${data.coord.lon.toFixed(6)}`;
        if (copyCoordsBtn) copyCoordsBtn.style.display = 'inline-block';
      }
    } catch(e) {}
    if (fetchStatus) fetchStatus.textContent = 'Weather updated';
  } catch (error) {
    console.error('Fetch error:', error);
    // On network error, try to render last cached weather if available
    try {
      const cached = localStorage.getItem('lastWeather');
      if (cached) {
        const parsed = JSON.parse(cached);
        displayWeather(parsed);
        if (fetchStatus) fetchStatus.textContent = 'Offline: showing last cached weather';
        return;
      }
    } catch (e) { /* ignore */ }
    showError('⚠️ Network error. Please check your connection and try again.');
  } finally {
    if (loading) loading.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
  }
}

// Copy coords button
if (copyCoordsBtn) {
  copyCoordsBtn.addEventListener('click', () => {
    const txt = coordReadout ? coordReadout.textContent : '';
    if (!txt) return;
    navigator.clipboard?.writeText(txt).then(() => {
      if (fetchStatus) fetchStatus.textContent = 'Coordinates copied';
      setTimeout(() => { if (fetchStatus) fetchStatus.textContent = ''; }, 1500);
    }).catch(() => {
      if (fetchStatus) fetchStatus.textContent = 'Copy failed';
    });
  });
}

// Fetch forecast (5 day / 3 hour) and process it
async function fetchForecast(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    // parse forecast into daily summaries and hourly points
    const daily = summarizeDailyForecast(data.list);
    renderForecastCards(daily);
    const hourly = takeNext24Hours(data.list);
    renderHourlyChart(hourly);
  } catch (e) {
    console.error('Error fetching forecast', e);
  }
}

// Helper: reduce 3-hour entries into daily summary (date, icon, min/max)
function summarizeDailyForecast(list) {
  const days = {};
  list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const key = d.toISOString().slice(0,10); // YYYY-MM-DD
    if (!days[key]) days[key] = { temps: [], icons: {}, date: key };
    days[key].temps.push(item.main.temp);
    const icon = item.weather[0].icon;
    days[key].icons[icon] = (days[key].icons[icon] || 0) + 1;
  });

  // convert to array with min/max and most common icon
  return Object.values(days).map(day => {
    const min = Math.min(...day.temps);
    const max = Math.max(...day.temps);
    const icon = Object.keys(day.icons).reduce((a,b) => day.icons[a] > day.icons[b] ? a : b);
    return { date: day.date, min, max, icon };
  }).slice(0,5); // take first 5 days
}

// Helper: take next 24 hours of points (approx 8 entries of 3h)
function takeNext24Hours(list) {
  return list.slice(0, 8).map(item => ({
    time: new Date(item.dt * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
    temp: item.main.temp
  }));
}

// Render forecast cards into #forecastCards
function renderForecastCards(days) {
  const container = document.getElementById('forecastCards');
  if (!container) return;
  container.innerHTML = '';
  days.forEach(d => {
    const el = document.createElement('div');
    el.className = 'day-card me-3';
    const day = new Date(d.date).toLocaleDateString(undefined, {weekday:'short'});
    el.innerHTML = `
      <div class="forecast-day">${day}</div>
      <img src="https://openweathermap.org/img/wn/${d.icon}@2x.png" alt="icon" style="width:60px;height:60px">
      <div class="forecast-temp">${Math.round(d.max)} / ${Math.round(d.min)} ${units==='metric'?'°C':'°F'}</div>
    `;
    container.appendChild(el);
  });
}

// Render hourly chart using Chart.js
let hourlyChart = null;
function renderHourlyChart(points) {
  const ctx = document.getElementById('hourlyChart');
  if (!ctx) return;
  const labels = points.map(p => p.time);
  const data = points.map(p => p.temp);

  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `Temperature (${units==='metric'?'°C':'°F'})`,
        data,
        borderColor: 'rgba(45,93,255,0.9)',
        backgroundColor: 'rgba(45,93,255,0.1)',
        tension: 0.3,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      // keep aspect ratio to avoid repeated resize/layout thrash
      maintainAspectRatio: true,
      scales: { y: { beginAtZero: false } }
    }
  };

  // destroy previous chart if exists
  if (hourlyChart) hourlyChart.destroy();
  // ensure the canvas has a stable height before creating the chart
  try { ctx.style.display = 'block'; ctx.style.height = '220px'; } catch(e){}
  hourlyChart = new Chart(ctx, config);
}

// Display weather data
function displayWeather(data) 
{
  errorMsg.style.display = "none";

  cityName.textContent = `${data.name}, ${data.sys.country}`;
  temperature.textContent = `${Math.round(data.main.temp)}${units==='metric'?'°C':'°F'}`;
  description.textContent = data.weather[0].description;

  weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  humidity.textContent = `${data.main.humidity}%`;
  wind.textContent = `${data.wind.speed} ${units==='metric'?'m/s':'mph'}`;
  feelsLike.textContent = `${Math.round(data.main.feels_like)}${units==='metric'?'°C':'°F'}`;
  pressure.textContent = `${data.main.pressure} hPa`;

  weatherResult.style.display = "block";


  // if coordinates available, show map pin
  try {
    const lat = data.coord.lat;
    const lon = data.coord.lon;
    showMap(lat, lon, `${data.name}, ${data.sys.country}`, Math.round(data.main.temp));
  } catch (e) { /* ignore if no coords */ }

  // save last searched city
  try {
    const label = `${data.name}, ${data.sys.country}`;
    localStorage.setItem('lastCity', label);
    lastCitySpan.textContent = label;
    lastCityContainer.style.display = 'block';
  } catch (e) {
    // ignore storage errors
  }
}

//  Show error messages
function showError(message) 
{
  errorMsg.textContent = message;
  errorMsg.style.display = "block";
  weatherResult.style.display = "none";
  // auto-hide after a while
  if (loading) loading.style.display = 'none';
  if (submitBtn) submitBtn.disabled = false;

  if (window._errorTimeout) clearTimeout(window._errorTimeout);
  window._errorTimeout = setTimeout(() => {
    errorMsg.style.display = 'none';
  }, 6000);
}

// ✅ Autocomplete Suggestions (Geocoding API)
cityInput.addEventListener("input", async () => 
{
  const query = cityInput.value.trim();

  if (query.length < 2) 
  {
    suggestions.style.display = "none";
    return;
  }

  try 
  {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    suggestions.innerHTML = "";

    if (data.length === 0) 
    {
      suggestions.style.display = "none";
      return;
    }

    data.forEach((place) => 
    {
      const li = document.createElement("li");
      li.classList.add("list-group-item", "list-group-item-action");
      li.textContent = `${place.name}, ${place.state ? place.state + ", " : ""}${place.country}`;

      li.addEventListener("click", () => 
      {
        cityInput.value = li.textContent;
        suggestions.style.display = "none";
        form.dispatchEvent(new Event("submit")); // auto search
      });

      suggestions.appendChild(li);
    });

    suggestions.style.display = "block";
  } 
  catch (err) 
  {
    console.error("Error fetching suggestions:", err);
    suggestions.style.display = "none";
  }
});

// ✅ Hide suggestions when clicking outside
document.addEventListener("click", (e) => 
{
  if (!cityInput.contains(e.target) && !suggestions.contains(e.target)) 
  {
    suggestions.style.display = "none";
  }
});

// Clear last saved city
if (clearLastBtn) {
  clearLastBtn.addEventListener('click', () => {
    localStorage.removeItem('lastCity');
    lastCitySpan.textContent = '-';
    lastCityContainer.style.display = 'none';
  });
}

// ---------- Map integration (Leaflet) ----------
let map = null;
let draggableMarker = null;
// Initialize map on load with a default view and a draggable marker
function initMap() {
  const defaultLat = 20.5937; // center of India as a friendly default
  const defaultLon = 78.9629;
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  // create map if not exists
  if (!map) {
    map = L.map('map').setView([defaultLat, defaultLon], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  }

  // create a draggable marker at center
  if (!draggableMarker) {
    draggableMarker = L.marker([defaultLat, defaultLon], {draggable: true}).addTo(map);
    draggableMarker.bindPopup('Drag me to update weather').openPopup();

    // provide feedback when dragging starts
    draggableMarker.on('dragstart', function () {
      if (fetchStatus) fetchStatus.textContent = 'Dragging...';
      if (loading) loading.style.display = 'inline-block';
    });

    // when drag ends, fetch weather for the new location
    draggableMarker.on('dragend', function (e) {
      const pos = e.target.getLatLng();
      // center map on new pos
      map.setView([pos.lat, pos.lng], map.getZoom());
      // update coord readout
      if (coordReadout) coordReadout.textContent = `Lat: ${pos.lat.toFixed(6)}, Lon: ${pos.lng.toFixed(6)}`;
      if (copyCoordsBtn) copyCoordsBtn.style.display = 'inline-block';
      // fetch weather by coords
      if (fetchStatus) fetchStatus.textContent = 'Fetching weather...';
      getWeatherByCoords(pos.lat, pos.lng);
    });
  }
}
function showMap(lat, lon, title = '', temp = null) {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;
  // make sure map container is visible
  mapEl.style.display = 'block';

  // initialize map once
  if (!map) {
    map = L.map('map').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  } else {
    map.setView([lat, lon], 10);
  }
  // if draggable marker exists, move it; otherwise create it
  if (draggableMarker) {
    draggableMarker.setLatLng([lat, lon]);
    draggableMarker.setPopupContent(`<strong>${title}</strong><br>${temp !== null ? temp + (units==='metric'?' °C':' °F') : ''}`);
    draggableMarker.openPopup();
  } else {
    draggableMarker = L.marker([lat, lon], {draggable: true}).addTo(map);
    draggableMarker.bindPopup(`<strong>${title}</strong><br>${temp !== null ? temp + (units==='metric'?' °C':' °F') : ''}`);
    draggableMarker.on('dragend', function(e){
      const pos = e.target.getLatLng(); map.setView([pos.lat, pos.lng], map.getZoom()); getWeatherByCoords(pos.lat, pos.lng);
    });
    draggableMarker.openPopup();
  }
  // Leaflet needs to invalidate size when container visibility/layout changes
  try {
    setTimeout(() => { if (map) map.invalidateSize(); }, 250);
  } catch (e) {}
}

// Register service worker for PWA (if supported)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('SW registered', reg.scope);
    }).catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}

// Initialize map and draggable marker once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    initMap();
    console.log('DOMContentLoaded: initMap called');
    setRuntimeDebug(hasApiKey ? 'JS running — API key present' : 'JS running — API key MISSING (check config.js)');
    // Theme/compact/print controls removed as per user request
  } catch (e) {
    console.error('Error initializing map', e);
  }
});

// (Toolbar handlers registered on DOMContentLoaded)
