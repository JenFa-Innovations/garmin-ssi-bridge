// ============================================================
// TFT_eSPI User Setup - GC9A01 Round Display + ESP8266
// Pins for ESP-12F via hardware SPI
// ============================================================

#define GC9A01_DRIVER

#define TFT_WIDTH  240
#define TFT_HEIGHT 240

// SPI Pins (ESP8266 Hardware SPI)
#define TFT_MOSI 13   // D7
#define TFT_SCLK 14   // D5
#define TFT_CS   15   // D8
#define TFT_DC    2   // D4
#define TFT_RST   0   // D3  (oder -1 wenn RST an 3.3V)
// TFT_BL not needed — backlight wired directly to 3.3V

#define LOAD_GLCD
#define LOAD_FONT2

#define SPI_FREQUENCY  40000000
#define SPI_READ_FREQUENCY  20000000
