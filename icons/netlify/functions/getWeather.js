// netlify/functions/getWeather.js
import fetch from 'node-fetch';

export async function handler(event) {
  const API_KEY = process.env.WEATHER_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured: missing API key' }) };
  }

  const qs = event.queryStringParameters || {};
  const type = (qs.type || 'weather').toLowerCase();

  // geo (geocoding) uses different endpoint and query param q
  if (type === 'geo') {
    const q = qs.q;
    const limit = qs.limit || 5;
    if (!q) return { statusCode: 400, body: JSON.stringify({ error: 'Missing q parameter for geocoding' }) };
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=${limit}&appid=${API_KEY}`;
    try {
      const r = await fetch(url);
      const data = await r.json();
      return { statusCode: r.status || 200, body: JSON.stringify(data) };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Geocoding fetch failed' }) };
    }
  }

  // weather or forecast: can accept city or lat/lon
  let url;
  if (qs.city) {
    const city = qs.city;
    if (type === 'forecast') {
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${qs.units || 'metric'}`;
    } else {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${qs.units || 'metric'}`;
    }
  } else if (qs.lat && qs.lon) {
    const lat = qs.lat;
    const lon = qs.lon;
    if (type === 'forecast') {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${qs.units || 'metric'}`;
    } else {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${qs.units || 'metric'}`;
    }
  } else {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing city or lat/lon' }) };
  }

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    return { statusCode: resp.status || 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch weather' }) };
  }
}
