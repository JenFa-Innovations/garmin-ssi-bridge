// FIT Binary Parser for Garmin dive logs (JavaScript)
// Reads Session (global mesg 18) and Dive Summary (global mesg 268) messages

const FIT_EPOCH = 631065600; // Seconds between Unix epoch and FIT epoch (1989-12-31)

export function parseFit(buffer) {
  const raw  = new Uint8Array(buffer);
  const view = new DataView(buffer);

  const result = {
    startTimeUnix:       0,
    durationSeconds:     0,
    maxDepthMeters:      0,
    waterTempCelsius:    NaN,
    waterTempMaxCelsius: NaN,
    airTempCelsius:      NaN,
    valid:               false,
  };

  if (raw.length < 14) return result;

  const headerSize = raw[0];
  const dataSize   = view.getUint32(4, true);
  const dataEnd    = headerSize + dataSize;
  const localDefs  = {};
  let pos = headerSize;

  while (pos < dataEnd - 2) {
    const recHdr = raw[pos++];

    // Compressed timestamp record — skip
    if (recHdr & 0x80) {
      const lt = (recHdr >> 5) & 0x03;
      if (localDefs[lt]) pos += localDefs[lt].totalSize;
      continue;
    }

    const isDef    = !!(recHdr & 0x40);
    const hasDevDt = !!(recHdr & 0x20);
    const localNum =    recHdr & 0x0F;

    if (isDef) {
      pos++; // reserved
      const le        = raw[pos++] === 0;
      const globalNum = le ? view.getUint16(pos, true) : view.getUint16(pos, false);
      pos += 2;
      const numFields = raw[pos++];

      const def = { globalNum, le, fields: [], totalSize: 0 };
      for (let i = 0; i < numFields; i++) {
        const defNum = raw[pos++];
        const size   = raw[pos++];
        pos++; // base type (unused)
        def.fields.push({ defNum, size });
        def.totalSize += size;
      }
      if (hasDevDt) {
        const df = raw[pos++];
        for (let i = 0; i < df; i++) { pos++; def.totalSize += raw[pos++]; pos++; }
      }
      localDefs[localNum] = def;

    } else {
      const def = localDefs[localNum];
      if (!def) break;
      if (def.globalNum === 18 || def.globalNum === 268) {
        readDiveMessage(view, raw, pos, def, result);
      }
      pos += def.totalSize;
    }
  }

  result.valid = result.durationSeconds > 0 && result.maxDepthMeters > 0.5;
  return result;
}

function readDiveMessage(view, raw, basePos, def, out) {
  let pos = basePos;

  for (const f of def.fields) {
    if (f.size === 4) {
      const val = def.le ? view.getUint32(pos, true) : view.getUint32(pos, false);
      if (val !== 0xFFFFFFFF) {
        if (def.globalNum === 18) { // Session
          if (f.defNum === 2  && !out.startTimeUnix)   out.startTimeUnix   = val + FIT_EPOCH;
          if (f.defNum === 7  && !out.durationSeconds) out.durationSeconds = val / 1000;
          if (f.defNum === 57 && !out.maxDepthMeters)  out.maxDepthMeters  = val / 1000;
        } else { // Dive Summary (268)
          if (f.defNum === 1)  out.startTimeUnix   = val + FIT_EPOCH;
          if (f.defNum === 3)  out.maxDepthMeters  = val / 1000;
          if (f.defNum === 11) out.durationSeconds = val / 1000;
        }
      }
    } else if (f.size === 2) {
      const val = def.le ? view.getInt16(pos, true) : view.getInt16(pos, false);
      if (def.globalNum === 268) {
        if (f.defNum === 12 && val !== 0x7FFF) out.waterTempCelsius    = val / 100;
        if (f.defNum === 13 && val !== 0x7FFF) out.waterTempMaxCelsius = val / 100;
      }
    } else if (f.size === 1) {
      const val = view.getInt8(pos);
      if (def.globalNum === 18) {
        if (f.defNum === 55  && val !== 0x7F && isNaN(out.waterTempCelsius)) out.waterTempCelsius = val;
        if (f.defNum === 102 && val !== 0x7F) out.airTempCelsius = val;
      }
    }
    pos += f.size;
  }
}

// ── Format helpers ─────────────────────────────────────────────
export function formatDatetime(unixTs) {
  const d   = new Date(unixTs * 1000);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function fmt1(val, fallback = 20) {
  return isNaN(val) ? fallback.toFixed(1) : val.toFixed(1);
}
