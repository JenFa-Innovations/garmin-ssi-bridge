# PCB

KiCad project for the Dive Transfer main board.

## Stackup

2-layer PCB, 1.6mm FR4.  
All SMD components on top side — bottom side ground plane only.

## Key Design Decisions

- CH340C handles USB-Serial; no separate USB-Serial module needed
- ESP8266-12F soldered via castellated pads on PCB edge
- GC9A01 connected via 7-pin FPC/FFC connector (0.5mm pitch)
- USB-C receptacle wired as USB 2.0 only (CC pins pulled to GND via 5.1kΩ)
- NTAG213 NFC sticker attached to underside of enclosure lid — no PCB antenna needed

## Ordering from JLCPCB

1. Open KiCad → **File → Fabrication Outputs → Gerbers**
2. Export to a ZIP (default settings are fine for JLCPCB)
3. Go to [jlcpcb.com](https://jlcpcb.com) → **Quote Now** → upload ZIP
4. Recommended settings:
   - Layers: 2
   - PCB thickness: 1.6mm
   - Surface finish: HASL (lead-free)
   - Minimum hole size: 0.3mm
5. For SMT assembly: upload BOM + CPL files from KiCad fabrication outputs

## Ordering from PCBWay

1. Same Gerber ZIP as above
2. Go to [pcbway.com](https://pcbway.com) → **PCB Instant Quote**
3. PCBWay supports **shared projects** — once the board is validated,
   upload to PCBWay Community so others can order directly.
   See [pcbway.com/project/](https://www.pcbway.com/project/) for details.

## Shared Project (Community Ordering)

After validating the board:
- PCBWay: publish to Community → anyone can order with one click
- PCBWay handles quantity breaks automatically

> JLCPCB does not have an equivalent public community project feature.  
> For JLCPCB, share the Gerber ZIP via the GitHub repository instead.
