# Hardware

```
hardware/
├── pcb/         KiCad project — schematic + 2-layer PCB layout
└── 3d-prints/   Enclosure parts — ASA body, PETG lens ring, TPU seal
```

## Bill of Materials (main components)

| Component | Part | Source |
|---|---|---|
| MCU | ESP8266-12F | AliExpress |
| USB-Serial | CH340C (SOIC-16) | LCSC / DigiKey |
| Display | GC9A01 1.28" round TFT | AliExpress |
| NFC | NTAG213 sticker | AliExpress |
| Connector | USB-C 2.0 receptacle (SMD) | LCSC |
| Decoupling | 100nF + 10µF caps | — |
| Reset | 10kΩ pull-up on EN | — |

## Ordering

- **PCB** → see [`pcb/`](pcb/) for JLCPCB / PCBWay instructions
- **Enclosure** → see [`3d-prints/`](3d-prints/) for print settings
