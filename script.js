'use strict';

/* ═══════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════ */
const API_BASE  = '/api/weather';
const CDN       = 'https://cdn.jsdelivr.net/npm/three@0.134.0';
const EARTH_R   = 2;        // globe radius (scene units)
const STAR_N    = 7000;     // number of stars

/* ═══════════════════════════════════════════════
   DOM REFS
═══════════════════════════════════════════════ */
const canvas       = document.getElementById('globe-canvas');
const cityInput    = document.getElementById('cityInput');
const searchBtn    = document.getElementById('searchBtn');
const fetchLoader  = document.getElementById('fetchLoader');
const errorToast   = document.getElementById('errorToast');
const errorMsg     = document.getElementById('errorMsg');
const weatherCard  = document.getElementById('weatherCard');
const wcClose      = document.getElementById('wcClose');

/* ═══════════════════════════════════════════════
   THREE.JS SCENE
═══════════════════════════════════════════════ */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x020409, 1);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 800);
camera.position.set(0, 0, 5.5);

/* ─── Lighting ──────────────────────────────── */
// Soft fill — neutral white so the texture colours show correctly
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

// Primary directional (sun) — warm white, offset to create day/night
const sunLight = new THREE.DirectionalLight(0xfff5e4, 1.6);
sunLight.position.set(6, 3, 5);
scene.add(sunLight);

// Faint backlight gives the atmosphere a subtle rim from behind
const backLight = new THREE.DirectionalLight(0x1a3a6b, 0.4);
backLight.position.set(-5, -2, -5);
scene.add(backLight);

/* ─── Texture loader ────────────────────────── */
const loader = new THREE.TextureLoader();

function loadTex(path) {
  return loader.load(
    `${CDN}/examples/textures/planets/${path}`,
    () => {},
    undefined,
    () => console.warn(`Texture failed: ${path}`)   // graceful fail
  );
}

/* ─── Earth group (mesh + atmosphere + clouds) ── */
const earthGroup = new THREE.Group();
scene.add(earthGroup);

// Main globe
const earthMesh = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_R, 72, 72),
  new THREE.MeshPhongMaterial({
    map:       loader.load('https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg'),
    bumpMap:   loader.load('https://threejs.org/examples/textures/earthbump1k.jpg'),
    bumpScale: 0.06,
    specular:  new THREE.Color(0x2244aa),
    shininess: 22,
  })
);
earthGroup.add(earthMesh);

// Atmosphere glow — BackSide shader trick creates the blue rim halo
const atmMesh = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_R * 1.18, 72, 72),
  new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float i = pow(0.78 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.5);
        gl_FragColor = vec4(0.25, 0.55, 1.0, 1.0) * i;
      }
    `,
    blending:    THREE.AdditiveBlending,
    side:        THREE.BackSide,
    transparent: true,
    depthWrite:  false,
  })
);
earthGroup.add(atmMesh);

// Second, softer outer glow ring for more depth
const outerGlow = new THREE.Mesh(
  new THREE.SphereGeometry(EARTH_R * 1.38, 72, 72),
  new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float i = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 6.0);
        gl_FragColor = vec4(0.15, 0.35, 0.9, 0.5) * i;
      }
    `,
    blending:    THREE.AdditiveBlending,
    side:        THREE.BackSide,
    transparent: true,
    depthWrite:  false,
  })
);
earthGroup.add(outerGlow);

/* ─── Star field ────────────────────────────── */
(function buildStars() {
  const pos  = new Float32Array(STAR_N * 3);
  const size = new Float32Array(STAR_N);

  for (let i = 0; i < STAR_N; i++) {
    // Distribute uniformly on a large sphere shell
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 90 + Math.random() * 130;

    pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);

    size[i] = Math.random();  // 0..1 — used for opacity variation
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(size, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aSize;
      varying float vAlpha;
      void main() {
        vAlpha = 0.4 + aSize * 0.6;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (aSize * 1.8 + 0.4) * (300.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        // Smooth circular point
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float a = (1.0 - d * d) * vAlpha;
        gl_FragColor = vec4(1.0, 1.0, 1.0, a);
      }
    `,
    blending:    THREE.AdditiveBlending,
    transparent: true,
    depthWrite:  false,
  });

  scene.add(new THREE.Points(geo, mat));
}());

/* ─── OrbitControls ─────────────────────────── */
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping   = true;
controls.dampingFactor   = 0.06;
controls.rotateSpeed     = 0.45;
controls.zoomSpeed       = 0.9;
controls.minDistance     = 2.8;
controls.maxDistance     = 9;
controls.enablePan       = false;
controls.autoRotate      = true;
controls.autoRotateSpeed = 0.25;

// Pause auto-rotate while user interacts, resume after 3 s of idle
let resumeTimer = null;

function pauseAutoRotate() {
  controls.autoRotate = false;
  clearTimeout(resumeTimer);
}

function scheduleResumeAutoRotate() {
  clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => { controls.autoRotate = true; }, 3000);
}

renderer.domElement.addEventListener('mousedown',  pauseAutoRotate);
renderer.domElement.addEventListener('touchstart', pauseAutoRotate, { passive: true });
renderer.domElement.addEventListener('mouseup',    scheduleResumeAutoRotate);
renderer.domElement.addEventListener('touchend',   scheduleResumeAutoRotate);

/* ─── City marker ───────────────────────────── */
let markerDot  = null;   // small bright sphere
let markerRing = null;   // expanding ping ring
let ringPhase  = 0;      // 0..1 phase for ring animation

// Convert geographic coordinates to a 3-D position on the Earth sphere.
// Formula as specified:  x = r·cos(lat)·cos(lon),  y = r·sin(lat),  z = r·cos(lat)·sin(lon)
// Three.js SphereGeometry maps sin(lon) onto -Z, so Z is negated to keep the pin
// sitting on top of the correct country in the texture.
function latLonToVec3(lat, lon, radius) {
  const latR = lat * (Math.PI / 180);
  const lonR = lon * (Math.PI / 180);
  return new THREE.Vector3(
     radius * Math.cos(latR) * Math.cos(lonR),   // x
     radius * Math.sin(latR),                     // y
    -radius * Math.cos(latR) * Math.sin(lonR)    // z  (negated for Three.js sphere winding)
  );
}

function placeMarker(lat, lon) {
  // Clean up previous marker
  if (markerDot)  { earthGroup.remove(markerDot);  markerDot  = null; }
  if (markerRing) { earthGroup.remove(markerRing); markerRing = null; }

  const surfacePos = latLonToVec3(lat, lon, EARTH_R + 0.025);

  // Glowing dot
  markerDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 20, 20),
    new THREE.MeshBasicMaterial({
      color:    0xff3355,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  markerDot.position.copy(surfacePos);
  earthGroup.add(markerDot);

  // Ping ring — a flat ring tangent to the sphere surface at the city
  markerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.04, 0.068, 48),
    new THREE.MeshBasicMaterial({
      color:       0xff3355,
      side:        THREE.DoubleSide,
      transparent: true,
      opacity:     1,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    })
  );
  markerRing.position.copy(surfacePos);
  // Orient the ring so its +Z axis points outward from the Earth surface
  markerRing.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    surfacePos.clone().normalize()
  );
  earthGroup.add(markerRing);
  ringPhase = 0;
}

/* ─── Globe rotation to face city ──────────── */
// We smoothly interpolate earthGroup.rotation to bring the searched
// city's longitude to the camera side.
let targetRotY = null;
let targetRotX = null;

function rotateToCityLon(lat, lon) {
  // After the Z-negation above, the city sits at:
  //   px = r·cos(lat)·cos(lon),  pz = -r·cos(lat)·sin(lon)
  // Rotating earthGroup around Y by θ maps z_world = -px·sin(θ) + pz·cos(θ).
  // Maximising z_world gives:  θ = atan2(-px, pz) = atan2(-cos(lon), -sin(lon))
  const lonR = lon * (Math.PI / 180);
  targetRotY = Math.atan2(-Math.cos(lonR), -Math.sin(lonR));
  targetRotX = -lat * (Math.PI / 180) * 0.35;   // gentle latitude tilt
  pauseAutoRotate();
}

function lerpAngle(current, target, t) {
  // Shortest-path lerp on the circle
  let delta = ((target - current) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  return current + delta * t;
}

/* ─── Render loop ───────────────────────────── */
const clock = new THREE.Clock();

(function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();  // seconds since last frame

  controls.update();

  // Smooth Earth rotation toward city
  if (targetRotY !== null) {
    earthGroup.rotation.y = lerpAngle(earthGroup.rotation.y, targetRotY, 0.035);
    earthGroup.rotation.x += (targetRotX - earthGroup.rotation.x) * 0.035;

    const distY = Math.abs(lerpAngle(earthGroup.rotation.y, targetRotY, 1) - earthGroup.rotation.y);
    if (distY < 0.002 && Math.abs(earthGroup.rotation.x - targetRotX) < 0.002) {
      earthGroup.rotation.y = targetRotY;
      earthGroup.rotation.x = targetRotX;
      targetRotY = null;
      scheduleResumeAutoRotate();
    }
  }

  // Animate ping ring: expand and fade
  if (markerRing) {
    ringPhase = (ringPhase + dt * 0.8) % 1;
    const s = 1 + ringPhase * 2.8;
    markerRing.scale.setScalar(s);
    markerRing.material.opacity = (1 - ringPhase) * 0.85;
  }

  // Pulse the dot slightly
  if (markerDot) {
    const p = 0.75 + Math.sin(clock.elapsedTime * 3) * 0.25;
    markerDot.material.opacity = p;
  }

  renderer.render(scene, camera);
}());

/* ─── Window resize ─────────────────────────── */
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ═══════════════════════════════════════════════
   WEATHER API
═══════════════════════════════════════════════ */
function kelvinToCelsius(k) { return Math.round(k - 273.15); }
function mpsToKmh(mps)      { return Math.round(mps * 3.6); }

function formatSunTime(unix, tzOffset) {
  const d = new Date((unix + tzOffset) * 1000);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDate(unix, tzOffset) {
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date((unix + tzOffset) * 1000);
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

/* ═══════════════════════════════════════════════
   UI STATE
═══════════════════════════════════════════════ */
let errorHideTimer = null;

function showLoader() {
  fetchLoader.hidden  = false;
  errorToast.hidden   = true;
  weatherCard.classList.remove('visible');
}

function hideLoader() {
  fetchLoader.hidden = true;
}

function showError(text) {
  hideLoader();
  errorMsg.textContent = text;
  errorToast.hidden    = false;
  clearTimeout(errorHideTimer);
  errorHideTimer = setTimeout(() => { errorToast.hidden = true; }, 4500);
}

function populateCard(data) {
  const { name, sys, weather, main, wind, visibility, dt, timezone, coord } = data;

  document.getElementById('wcCity').textContent    = name;
  document.getElementById('wcCountry').textContent = sys.country;
  document.getElementById('wcCond').textContent    = weather[0].description;
  document.getElementById('wcDate').textContent    = formatDate(dt, timezone);
  document.getElementById('wcIcon').src            = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
  document.getElementById('wcTemp').textContent    = `${kelvinToCelsius(main.temp)}°`;
  document.getElementById('wcFeels').textContent   = `${kelvinToCelsius(main.feels_like)}°C`;
  document.getElementById('wcHumidity').textContent= `${main.humidity}%`;
  document.getElementById('wcWind').textContent    = `${mpsToKmh(wind.speed)} km/h`;
  document.getElementById('wcRange').textContent   =
    `${kelvinToCelsius(main.temp_max)}° / ${kelvinToCelsius(main.temp_min)}°`;
  document.getElementById('wcPressure').textContent= `${main.pressure} hPa`;
  document.getElementById('wcVisibility').textContent =
    visibility ? `${(visibility / 1000).toFixed(1)} km` : '—';
  document.getElementById('wcSun').textContent =
    `${formatSunTime(sys.sunrise, timezone)} · ${formatSunTime(sys.sunset, timezone)}`;

  // Show card with entrance animation
  weatherCard.hidden = false;
  // Force reflow so the transition plays
  void weatherCard.offsetWidth;
  weatherCard.classList.add('visible');

  // Drop a pin on the globe and rotate to face the city
  placeMarker(coord.lat, coord.lon);
  rotateToCityLon(coord.lat, coord.lon);
}

async function fetchWeather(city) {
  city = city.trim();
  if (!city) return;

  showLoader();

  try {
    const res = await fetch(`${API_BASE}?city=${encodeURIComponent(city)}`);

    if (res.status === 404) { showError(`"${city}" not found — check the spelling`); return; }
    if (res.status === 401) { showError('Invalid API key'); return; }
    if (!res.ok)            { showError(`Server error (${res.status}) — try again`); return; }

    const data = await res.json();
    hideLoader();
    populateCard(data);

  } catch (err) {
    showError(
      err.name === 'TypeError'
        ? 'No connection — check your internet'
        : 'Something went wrong — try again'
    );
  }
}

/* ═══════════════════════════════════════════════
   EVENT WIRING
═══════════════════════════════════════════════ */
searchBtn.addEventListener('click', () => fetchWeather(cityInput.value));

cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchWeather(cityInput.value);
});

wcClose.addEventListener('click', () => {
  weatherCard.classList.remove('visible');
  setTimeout(() => { weatherCard.hidden = true; }, 450);
});

// Auto-focus search input on load
cityInput.focus();
