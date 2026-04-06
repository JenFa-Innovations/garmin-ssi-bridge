# Software

```
software/
├── esp/   ESP8266 Arduino firmware
└── pwa/   Progressive Web App (Chrome on Android)
```

The two components communicate over USB-Serial at 115200 baud:

| Direction | Message | Meaning |
|---|---|---|
| PWA → ESP | `PING\n` | Connection test |
| ESP → PWA | `OK\n` | Acknowledged |
| PWA → ESP | `<ssi-string>\n` | Render this as QR |
| ESP → PWA | `OK\n` | QR displayed |
