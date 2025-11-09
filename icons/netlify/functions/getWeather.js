import fetch from "node-fetch";

export async function handler(event) {
  const { city, lat, lon, type = "weather", units = "metric", q, limit } = event.queryStringParameters;
  const apiKey = process.env.OPENWEATHER_API_KEY; // Make sure this matches what you add in Netlify

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Missing API key in serverless function." })
    };
  }

  let url = "";
  if (type === "geo") {
    url = `https://api.openweathermap.org/geo/1.0/direct?q=${q}&limit=${limit || 5}&appid=${apiKey}`;
  } else if (lat && lon) {
    url = `https://api.openweathermap.org/data/2.5/${type}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
  } else if (city) {
    url = `https://api.openweathermap.org/data/2.5/${type}?q=${city}&appid=${apiKey}&units=${units}`;
  } else {
    return { statusCode: 400, body: JSON.stringify({ message: "Missing location parameters." }) };
  }

  const res = await fetch(url);
  const data = await res.json();

  return {
    statusCode: res.status,
    body: JSON.stringify(data)
  };
}
