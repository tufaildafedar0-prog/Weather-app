# Weather Forecast App

Quick notes for reviewers and for running locally.

Setup
- Copy `config.example.js` to `config.js` and replace `YOUR_OPENWEATHERMAP_API_KEY_HERE` with your OpenWeatherMap API key.
- Start a local web server (e.g., Live Server extension in VS Code or `npx http-server`).

Files added/changed for submission
- `config.example.js` — example config. Do NOT commit your real API key; create `config.js` locally.

Offline fallback
- The app saves the last successful weather response in `localStorage` under `lastWeather`. If the network fetch fails, the app will render the cached weather automatically (if available).

Notes
- The service worker caches app shell assets. When testing changes to the SW or manifest, unregister the service worker and clear site data in DevTools to avoid stale caching.
