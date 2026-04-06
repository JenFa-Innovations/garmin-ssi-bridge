# ESP Firmware

ESP8266-12F + GC9A01 1.28" round TFT.  
Receives an SSI string over USB-Serial and renders it as a QR code.

## Dependencies (Arduino Library Manager)

| Library | Author |
|---|---|
| TFT_eSPI | Bodmer |
| qrcode | ricmoo |

## Pin Mapping

| ESP8266-12F | GC9A01 |
|---|---|
| GPIO13 (D7) | SDA (MOSI) |
| GPIO14 (D5) | SCL (SCLK) |
| GPIO15 (D8) | CS |
| GPIO2  (D4) | DC |
| GPIO0  (D3) | RST |
| 3.3V | VCC + BL |
| GND | GND |

## Setup

1. Copy `User_Setup.h` into your TFT_eSPI library folder (overwrites existing)
2. Open `firmware.ino` in Arduino IDE
3. Board: **Generic ESP8266 Module** or **NodeMCU 1.0**
4. Flash

## Serial Protocol

```
Receive: PING\n          → reply OK, show "Connected!"
Receive: dive;noid;...\n → render QR, reply OK
Receive: anything else   → reply ERR
```

## QR Rendering

The GC9A01 is a round display (240×240 px).  
The QR code is centered inside the largest inscribed square (~170×170 px) so all three finder patterns remain fully visible.
