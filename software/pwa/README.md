# PWA — Dive Transfer

Progressive Web App. No installation required — just a URL.

## Features

- **Share target** — appears in Android share sheet when exporting FIT from Garmin app
- **FIT parser** — reads Garmin binary dive log format
- **SSI builder** — generates correct SSI QR string (reverse-engineered from real MK3i export)
- **WebUSB** — communicates with ESP8266 via CH340 USB-Serial adapter
- **Web NFC** — writes app URL to NFC sticker on device housing
- **Offline** — service worker caches all assets
- **Mock mode** — shows QR directly on phone if no ESP is connected

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell + all screen layouts |
| `app.js` | Main logic (share intent, USB, NFC, QR display) |
| `fit-parser.js` | Garmin FIT binary parser |
| `ssi-builder.js` | SSI QR string builder |
| `usb-serial.js` | WebUSB communication with CH340 |
| `sw.js` | Service worker (offline + share target handler) |
| `manifest.json` | PWA manifest with share target registration |

## Deployment (GitHub Pages)

```bash
# From the repo root:
git push origin main
# Enable Pages in GitHub → Settings → Pages → Source: main
# App runs at https://YOUR_USER.github.io/REPO_NAME/
```

HTTPS is required for WebUSB and Web NFC — GitHub Pages provides this automatically.

## Browser Support

Chrome on Android is required for WebUSB, Web NFC, and the share target.  
All other browsers fall back to mock mode (QR shown on screen).

## First-Time Setup

1. Open app → ⚙ Settings
2. Tap **Scan SSI profile QR** — point camera at your SSI app profile QR
3. Tap **Write NFC tag** — hold NTAG213 sticker to phone
4. Stick the NFC sticker onto the device housing
