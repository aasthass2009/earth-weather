# 🌍 Earth Weather

A 3D interactive weather globe that lets you search any city and see real-time weather data pinned directly on a rotating Earth.

**[Live Demo →](https://earth-weather-two.vercel.app/)**

---

## Features

- Photorealistic 3D Earth with atmosphere glow, bump mapping, and star field
- Real-time weather — temperature, humidity, wind, pressure, visibility, sunrise/sunset
- Animated city pin with expanding ping ring drops on the searched location
- Globe smoothly rotates to face the searched city
- Drag to rotate, scroll to zoom, auto-rotates when idle
- API key never exposed to the browser — proxied through a serverless function

---

## Tech Stack

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| 3D Rendering | [Three.js r134](https://threejs.org/)                |
| Weather Data | [OpenWeatherMap API](https://openweathermap.org/api) |
| Deployment   | [Vercel](https://vercel.com/) + Serverless Functions |
| Frontend     | Vanilla JS, HTML, CSS — no build step                |

---

## Running Locally

The API key is kept server-side. Local development requires the [Vercel CLI](https://vercel.com/docs/cli) to run the serverless function.

**1. Clone the repo**

```bash
git clone https://github.com/aasthass2009/earth-weather.git
cd earth-weather
```

**2. Set up your API key**

Create a `.env.local` file in the project root:

```
OPENWEATHER_API_KEY=your_key_here
```

Get a free key at [openweathermap.org/api](https://openweathermap.org/api).

**3. Start the dev server**

```bash
npm i -g vercel   # one-time install
vercel dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
earth-weather/
├── api/
│   └── weather.js       # Serverless function — proxies OpenWeatherMap, keeps API key secret
├── index.html           # App shell, UI markup, script loading order
├── style.css            # All styles — layout, animations, weather card
├── script.js            # Three.js scene setup, globe, weather fetching, UI logic
└── .gitignore           # Excludes .env, .env.local
```

**Request flow:**

```
Browser → /api/weather?city=London → api/weather.js → OpenWeatherMap API
```

---

## Screenshots

<img width="780" height="935" alt="image" src="https://github.com/user-attachments/assets/9614ea6a-c4c1-4f0d-b45f-041b9e5986f8" />

<img width="795" height="981" alt="image" src="https://github.com/user-attachments/assets/cacb763b-44a5-4f89-80d9-0a589fd85103" />

----------
