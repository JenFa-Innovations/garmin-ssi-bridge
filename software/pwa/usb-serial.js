// WebUSB Serial communication with CH340 / CH341
// Vendor ID 0x1A86 = QinHeng Electronics

const CH340_VENDOR  = 0x1A86;
const CH340_PRODUCT = 0x7523;
const CH341_PRODUCT = 0x5523;
const BAUD_RATE     = 115200;

let device = null;
let epOut  = null;

export async function connect() {
  device = await navigator.usb.requestDevice({
    filters: [
      { vendorId: CH340_VENDOR, productId: CH340_PRODUCT },
      { vendorId: CH340_VENDOR, productId: CH341_PRODUCT },
    ]
  });

  await device.open();
  await device.selectConfiguration(1);

  // Find interface with Bulk OUT endpoint
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const out = alt.endpoints.find(e => e.direction === "out" && e.type === "bulk");
      if (out) {
        epOut = out;
        await device.claimInterface(iface.interfaceNumber);
        await initCH340();
        return;
      }
    }
  }
  throw new Error("No Bulk-OUT endpoint found");
}

// CH340 vendor-specific initialization (set baud rate to 115200)
async function initCH340() {
  const out = { requestType: "vendor", recipient: "device" };

  await device.controlTransferOut({ ...out, request: 0xA1, value: 0, index: 0 }, new Uint8Array(2));
  await device.controlTransferOut({ ...out, request: 0x9A, value: 0x1312, index: 0xD982 }, new Uint8Array(0));
  await device.controlTransferOut({ ...out, request: 0xA1, value: 0, index: 0 }, new Uint8Array(2));
  // 8N1
  await device.controlTransferOut({ ...out, request: 0x9A, value: 0x2518, index: 0x0050 }, new Uint8Array(0));
}

export async function sendString(str) {
  if (!device || !epOut) throw new Error("Not connected");
  const data = new TextEncoder().encode(str + "\n");
  await device.transferOut(epOut.endpointNumber, data);
}

export async function ping() {
  await sendString("PING");
  await new Promise(r => setTimeout(r, 800));
}

export function isConnected() {
  return device !== null && device.opened;
}

export async function disconnect() {
  if (device) {
    try { await device.close(); } catch {}
    device = null;
    epOut  = null;
  }
}
