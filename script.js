// API Key (from OpenWeatherMap)
const apiKey = "dff29f41b8f3646f7af65f935118f0d5"; //  working key

const form = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const errorMsg = document.getElementById("errorMsg");
const weatherResult = document.getElementById("weatherResult");

const cityName = document.getElementById("cityName");
const weatherIcon = document.getElementById("weatherIcon");
const temperature = document.getElementById("temperature");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const feelsLike = document.getElementById("feelsLike");
const pressure = document.getElementById("pressure");

// Suggestions container
const suggestions = document.getElementById("suggestions");

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
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  fetchWeather(url);
}

//  Fetch weather by Coordinates
async function getWeatherByCoords(lat, lon) 
{
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  fetchWeather(url);
}

//  Reusable fetch function
async function fetchWeather(url) 
{
  try {
    const response = await fetch(url);
    if (!response.ok) 
    {
      showError("Unable to fetch weather. Try again.");
      return;
    }
    const data = await response.json();
    displayWeather(data);
  } 
  catch (error) 
  {
    showError("⚠️ Network error. Please try again.");
  }
}

// Display weather data
function displayWeather(data) 
{
  errorMsg.style.display = "none";

  cityName.textContent = `${data.name}, ${data.sys.country}`;
  temperature.textContent = `${Math.round(data.main.temp)}°C`;
  description.textContent = data.weather[0].description;

  weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  humidity.textContent = `${data.main.humidity}%`;
  wind.textContent = `${data.wind.speed} m/s`;
  feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
  pressure.textContent = `${data.main.pressure} hPa`;

  weatherResult.style.display = "block";
}

//  Show error messages
function showError(message) 
{
  errorMsg.textContent = message;
  errorMsg.style.display = "block";
  weatherResult.style.display = "none";
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
