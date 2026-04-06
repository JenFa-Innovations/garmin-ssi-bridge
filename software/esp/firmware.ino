// ============================================================
// Garmin → SSI QR Display
// ESP8266-12F + GC9A01 1.28" Round TFT
//
// Libraries (Arduino Library Manager):
//   - TFT_eSPI  by Bodmer
//   - qrcode    by ricmoo
//
// IMPORTANT: copy User_Setup.h into the TFT_eSPI library folder!
// ============================================================

#include <TFT_eSPI.h>
#include "qrcode.h"

TFT_eSPI tft = TFT_eSPI();

#define DISPLAY_W 240
#define DISPLAY_H 240

// QR Version 5 supports up to ~100 chars; ECC_LOW is fine for scanning
#define QR_VERSION 5

void setup() {
  Serial.begin(115200);
  tft.init();
  tft.setRotation(0);
  showWaiting();
}

void loop() {
  // Wait for SSI string from app (newline-terminated)
  if (Serial.available()) {
    String data = Serial.readStringUntil('\n');
    data.trim();

    if (data.length() > 0) {
      if (data == "PING") {
        Serial.println("OK");
        showConnected();
      } else if (data.startsWith("dive;")) {
        drawQRCode(data);
        Serial.println("OK");
      } else {
        Serial.println("ERR");
      }
    }
  }
}

void drawQRCode(const String& ssiString) {
  tft.fillScreen(TFT_WHITE);

  QRCode qrcode;
  uint8_t* buf = new uint8_t[qrcode_getBufferSize(QR_VERSION)];

  int err = qrcode_initText(&qrcode, buf, QR_VERSION, ECC_LOW, ssiString.c_str());
  if (err != 0) {
    showError("String too long!");
    delete[] buf;
    return;
  }

  // Fit QR into inscribed square of the round display
  // Inscribed square diameter = display_diameter / sqrt(2) ≈ 170px
  int maxPx  = 170;
  int scale  = maxPx / qrcode.size;
  if (scale < 1) scale = 1;

  int qrPx    = qrcode.size * scale;
  int offsetX = (DISPLAY_W - qrPx) / 2;
  int offsetY = (DISPLAY_H - qrPx) / 2;

  for (uint8_t y = 0; y < qrcode.size; y++) {
    for (uint8_t x = 0; x < qrcode.size; x++) {
      uint16_t color = qrcode_getModule(&qrcode, x, y) ? TFT_BLACK : TFT_WHITE;
      tft.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale, color);
    }
  }

  delete[] buf;
}

void showWaiting() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
  tft.drawString("Plug in & export",  DISPLAY_W / 2, DISPLAY_H / 2 - 12, 2);
  tft.drawString("FIT from Garmin",   DISPLAY_W / 2, DISPLAY_H / 2 + 10, 2);
}

void showConnected() {
  tft.fillScreen(TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.drawString("Connected!", DISPLAY_W / 2, DISPLAY_H / 2, 2);
  delay(800);
  showWaiting();
}

void showError(const char* msg) {
  tft.fillScreen(TFT_RED);
  tft.setTextDatum(MC_DATUM);
  tft.setTextColor(TFT_WHITE, TFT_RED);
  tft.drawString(msg, DISPLAY_W / 2, DISPLAY_H / 2, 2);
}
