import { parseFit, fmt1, formatDatetime } from "./fit-parser.js";
import { buildSsiString }                from "./ssi-builder.js";
import { connect, sendString, ping, isConnected } from "./usb-serial.js";

// ── State ──────────────────────────────────────────────────────
let state = {
  screen:  "idle",
  dive:    null,
  profile: loadProfile(),
  extras:  loadExtras(),
  ssiStr:  null,
};

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  registerSW();
  loadExternalLibs();

  // Launched from Garmin share intent?
  if (location.search.includes("shared=1")) {
    const file = await getSharedFile();
    if (file) await processFit(file.buffer);
  }

  // No profile yet → go to settings first
  if (!state.profile.userId) {
    showScreen("settings");
  } else {
    showScreen("idle");
  }

  bindEvents();
  startClock();
});

// ── Service Worker ─────────────────────────────────────────────
function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
  }
}

// ── Events ─────────────────────────────────────────────────────
function bindEvents() {
  // File picker (fallback when share target not available)
  document.getElementById("btnPick").addEventListener("click", () =>
    document.getElementById("filePicker").click()
  );
  document.getElementById("filePicker").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (file) await processFit(await file.arrayBuffer());
  });

  // USB
  document.getElementById("btnUsb").addEventListener("click", connectUsb);

  // Send / result screen
  document.getElementById("btnSend").addEventListener("click", sendToEsp);
  document.getElementById("btnDetails").addEventListener("click", () => showScreen("details"));

  // Details screen
  document.getElementById("btnDetailsSend").addEventListener("click", () => { saveExtras(); sendToEsp(); });
  document.getElementById("btnDetailsBack").addEventListener("click", () => showScreen("result"));

  // Settings screen
  document.getElementById("btnSettings").addEventListener("click", () => showScreen("settings"));
  document.getElementById("btnSettingsBack").addEventListener("click", () => showScreen(state.dive ? "result" : "idle"));
  document.getElementById("btnSaveProfile").addEventListener("click", saveProfile);
  // Profile QR: image first, camera fallback
  document.getElementById("btnScanImage").addEventListener("click", startImageScan);
  document.getElementById("btnScanQr").addEventListener("click", startProfileScan);
  document.getElementById("btnWriteNfc").addEventListener("click", writeNfcTag);

  // QR screen
  document.getElementById("btnQrBack").addEventListener("click", () => showScreen("result"));
}

// ── FIT Processing ─────────────────────────────────────────────
async function processFit(buffer) {
  setStatus("⏳ Reading FIT file...");
  await delay(50);

  const dive = parseFit(buffer);
  if (!dive.valid) {
    setStatus("❌ No dive data found — is this a Garmin Dive FIT?");
    return;
  }

  state.dive   = dive;
  state.ssiStr = buildSsiString(dive, state.profile, state.extras);
  updateResultScreen();
  showScreen("result");

  // Auto-send if USB already connected
  if (isConnected()) await sendToEsp();
}

function updateResultScreen() {
  const d  = state.dive;
  const dt = new Date(d.startTimeUnix * 1000);

  document.getElementById("diveDate").textContent =
    dt.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) +
    " · " + dt.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });

  document.getElementById("diveDepth").textContent    = d.maxDepthMeters.toFixed(1) + " m";
  document.getElementById("diveDuration").textContent = (d.durationSeconds / 60).toFixed(1) + " min";
  document.getElementById("diveWaterTemp").textContent = fmt1(d.waterTempCelsius) + " °C";
  document.getElementById("diveAirTemp").textContent   = isNaN(d.airTempCelsius) ? "—" : fmt1(d.airTempCelsius) + " °C";
  document.getElementById("diveMaxTemp").textContent   = fmt1(d.waterTempMaxCelsius) + " °C";
}

// ── USB / CH340 ────────────────────────────────────────────────
async function connectUsb() {
  try {
    setStatus("🔌 Connecting to CH340...");
    await connect();
    await ping();
    document.getElementById("btnUsb").textContent = "✓ ESP connected";
    document.getElementById("btnUsb").style.borderColor = "#005500";
    document.getElementById("btnUsb").style.color = "#00aa44";
    setStatus("✅ ESP connected");
  } catch (e) {
    setStatus("❌ USB error: " + e.message);
  }
}

// ── Send to ESP ────────────────────────────────────────────────
async function sendToEsp() {
  if (!state.dive) return;
  state.ssiStr = buildSsiString(state.dive, state.profile, state.extras);

  if (!isConnected()) {
    // Mock mode: show QR directly on phone
    setStatus("📱 No ESP connected — showing QR on screen");
    showQr(state.ssiStr);
    return;
  }

  try {
    setStatus("📡 Sending to ESP...");
    await sendString(state.ssiStr);
    showScreen("qr");
    setStatus("✅ QR displayed on ESP — scan with SSI app!");
  } catch (e) {
    setStatus("❌ Send error: " + e.message);
  }
}

// ── QR Display ─────────────────────────────────────────────────
function showQr(str) {
  showScreen("qr");
  const el = document.getElementById("qrCanvas");
  el.innerHTML = "";
  new window.QRCode(el, {
    text: str, width: 260, height: 260,
    correctLevel: window.QRCode.CorrectLevel.L,
  });
  document.getElementById("ssiPreview").textContent = str;
}

// ── Profile ─────────────────────────────────────────────────────
function saveProfile() {
  state.profile = {
    userId:    document.getElementById("inputUserId").value.trim(),
    firstName: document.getElementById("inputFirstName").value.trim(),
    lastName:  document.getElementById("inputLastName").value.trim(),
  };
  localStorage.setItem("profile", JSON.stringify(state.profile));
  setStatus("✅ Profile saved");
  setTimeout(() => showScreen(state.dive ? "result" : "idle"), 600);
}

function loadProfile() {
  try { return JSON.parse(localStorage.getItem("profile")) || {}; } catch { return {}; }
}

function saveExtras() {
  state.extras = {
    siteId:         document.getElementById("inputSite").value.trim(),
    visMeter:       document.getElementById("inputVis").value.trim(),
    varWeatherId:   document.getElementById("inputWeather").value.trim()   || "1",
    varEntryId:     document.getElementById("inputEntry").value.trim()     || "35",
    varWaterBodyId: document.getElementById("inputWaterBody").value.trim() || "52",
    varWaterTypeId: document.getElementById("inputWaterType").value.trim() || "4",
    varCurrentId:   document.getElementById("inputCurrent").value.trim()   || "6",
    varSurfaceId:   document.getElementById("inputSurface").value.trim()   || "10",
    varDiveTypeId:  document.getElementById("inputDiveType").value.trim()  || "24",
  };
  localStorage.setItem("extras", JSON.stringify(state.extras));
}

function loadExtras() {
  try { return JSON.parse(localStorage.getItem("extras")) || {}; } catch { return {}; }
}

// ── NFC Tag Write ──────────────────────────────────────────────
async function writeNfcTag() {
  if (!("NDEFReader" in window)) {
    alert("Web NFC is only supported in Chrome on Android.");
    return;
  }
  const url = location.origin + "/";
  setStatus("📡 Hold NFC tag to phone...");
  try {
    const ndef = new NDEFReader();
    await ndef.write({ records: [{ recordType: "url", data: url }] });
    setStatus("✅ NFC tag written! URL: " + url);
  } catch (e) {
    setStatus("❌ NFC error: " + e.message);
  }
}

// ── SSI Profile QR — scan from image (primary) ────────────────
function waitForJsQR(timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (window.jsQR) { resolve(); return; }
    const start = Date.now();
    const poll = setInterval(() => {
      if (window.jsQR) { clearInterval(poll); resolve(); }
      else if (Date.now() - start > timeout) { clearInterval(poll); reject(); }
    }, 100);
  });
}

function startImageScan() {
  const picker = document.getElementById("qrImagePicker");
  picker.value = "";
  picker.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("⏳ Reading QR from image...");

    try {
      setStatus("⏳ Waiting for QR library...");
      await waitForJsQR(8000);
    } catch {
      setStatus("❌ QR library failed to load — check your internet connection");
      return;
    }

    // Draw image onto canvas → jsQR
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      const ctx    = canvas.getContext("2d");

      // Try multiple scales — jsQR works best around 600–1200px wide
      const scales = [1, 2, 0.5, 1.5, 3];
      for (const scale of scales) {
        canvas.width  = Math.round(img.naturalWidth  * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(data.data, data.width, data.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code) { handleProfileQr(code.data); return; }
      }
      setStatus("❌ No QR code found in image — try a clearer screenshot");
    };
    img.onerror = () => setStatus("❌ Could not load image");
    img.src = url;
  };
  picker.click();
}

// ── SSI Profile QR — live camera (fallback) ────────────────────
function startProfileScan() {
  const overlay = document.getElementById("scanOverlay");
  overlay.style.display = "flex";
  let stream;

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(s => {
      stream = s;
      const video = document.getElementById("scanVideo");
      video.srcObject = s;
      video.play();
      scan();
    })
    .catch(() => {
      setStatus("❌ Camera not available");
      overlay.style.display = "none";
    });

  function scan() {
    if (!stream) return;
    const video  = document.getElementById("scanVideo");
    const canvas = document.getElementById("scanCanvas");
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      if (window.jsQR) {
        const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(img.data, img.width, img.height);
        if (code) { handleProfileQr(code.data); stop(); return; }
      }
    }
    requestAnimationFrame(scan);
  }

  function stop() {
    stream?.getTracks().forEach(t => t.stop());
    overlay.style.display = "none";
  }

  document.getElementById("btnStopScan").onclick = stop;
}

function handleProfileQr(raw) {
  const pairs = {};
  raw.split(";").forEach(p => {
    const [k, v] = p.split(":");
    if (k && v !== undefined) pairs[k.trim()] = v.trim();
  });
  if (pairs.user_master_id) document.getElementById("inputUserId").value    = pairs.user_master_id;
  if (pairs.user_firstname)  document.getElementById("inputFirstName").value = pairs.user_firstname;
  if (pairs.user_lastname)   document.getElementById("inputLastName").value  = pairs.user_lastname;
  setStatus("✅ Profile loaded from QR");
}

// ── Screen Management ──────────────────────────────────────────
function showScreen(name) {
  state.screen = name;
  document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
  document.getElementById("screen-" + name).style.display = "flex";

  if (name === "settings") {
    document.getElementById("inputUserId").value    = state.profile.userId    || "";
    document.getElementById("inputFirstName").value = state.profile.firstName || "";
    document.getElementById("inputLastName").value  = state.profile.lastName  || "";
  }
  if (name === "qr" && state.ssiStr) showQr(state.ssiStr);
}

window.showScreenGlobal = showScreen;

// ── Shared File from IDB ───────────────────────────────────────
function getSharedFile() {
  return new Promise(res => {
    const req = indexedDB.open("DiveTransfer", 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore("files");
    req.onsuccess = e => {
      const db    = e.target.result;
      const tx    = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const get   = store.get("pending");
      get.onsuccess = () => { store.delete("pending"); res(get.result || null); };
      get.onerror   = () => res(null);
    };
    req.onerror = () => res(null);
  });
}

// ── Helpers ────────────────────────────────────────────────────
function setStatus(msg) {
  document.getElementById("statusMsg").textContent = msg;
}

function loadExternalLibs() {
  ["./qrcode.js", "./jsqr.js"].forEach(src => {
    const s = document.createElement("script");
    s.src = src;
    document.head.appendChild(s);
  });
}

function startClock() {
  const el  = document.getElementById("clock");
  const pad = n => String(n).padStart(2, "0");
  const tick = () => {
    const now = new Date();
    el.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes());
  };
  tick();
  setInterval(tick, 10000);
}

const delay = ms => new Promise(r => setTimeout(r, ms));
