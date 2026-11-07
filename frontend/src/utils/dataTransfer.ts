// Export / import of everything the app keeps on this device.
//
// Export: every stored key (workouts, programs, profile, weigh-ins, body measurements, ticks,
// food choices, theme, units, ...) as one JSON object with a `version` field.
// Big exports are packed (gzip + base64, prefixed "gymdata2:") so they still
// fit in one WhatsApp message; the import reads both forms.
//
// Import: validates the file, keeps a safety copy of what is on the device
// now (key SAFETY_KEY), replaces the stored data, and tells the screens to
// reload. Undo puts the safety copy back.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';

import { emitDataChanged } from '@/src/utils/dataEvents';

export const APP_VERSION = '1.7.0';
export const EXPORT_FORMAT = 'gym-app-export';
export const EXPORT_VERSION = 2;

/** Holds the device's data from just before the last import, for Undo. */
export const SAFETY_KEY = 'import_safety_copy';
/** The old Backup button's copy. Not exported, and never touched by an import. */
export const BACKUP_KEY = 'backup_latest';

const PACK_PREFIX = 'gymdata2:';
// WhatsApp takes at most 65,536 characters in one text message.
const PACK_THRESHOLD = 60000;
const KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,80}$/;

export interface ExportSummary {
  programs: number;
  workouts: number;
  weighIns: number;
  measurements: number;
  tickedDays: number;
  profileName: string | null;
  exportedAt: string | null;
}

export interface BuiltExport {
  text: string;
  packed: boolean;
  chars: number;
  summary: ExportSummary;
}

export interface ParsedImport {
  data: Record<string, unknown>;
  summary: ExportSummary;
}

type RawSnapshot = Record<string, string>;

const readRaw = async (skip: string[]): Promise<RawSnapshot> => {
  const keys = (await AsyncStorage.getAllKeys()).filter(k => !skip.includes(k));
  if (!keys.length) return {};
  const pairs = await AsyncStorage.multiGet(keys);
  const out: RawSnapshot = {};
  pairs.forEach(([k, v]) => {
    if (v !== null && v !== undefined) out[k] = v;
  });
  return out;
};

const summarize = (data: Record<string, unknown>, exportedAt: string | null): ExportSummary => {
  const programs = Array.isArray(data.workoutPrograms) ? data.workoutPrograms.length : 0;
  const workouts = Array.isArray(data.workoutLogs) ? data.workoutLogs.length : 0;
  const weighIns = Array.isArray(data.weightEntries) ? data.weightEntries.length : 0;
  const measurements = Array.isArray(data.bodyMeasurements) ? data.bodyMeasurements.length : 0;
  const ticks = data.exerciseCompletions;
  let tickedDays = 0;
  if (ticks && typeof ticks === 'object' && !Array.isArray(ticks)) {
    tickedDays = Object.values(ticks as Record<string, unknown>).filter(
      v => Array.isArray(v) && v.length > 0,
    ).length;
  }
  const profile = data.userProfile as { name?: unknown } | null | undefined;
  const profileName =
    profile && typeof profile === 'object' && typeof profile.name === 'string' && profile.name.trim()
      ? profile.name.trim()
      : null;
  return { programs, workouts, weighIns, measurements, tickedDays, profileName, exportedAt };
};

// ---- base64 (no Buffer on the device) ----

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const toBase64 = (bytes: Uint8Array): string => {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
};

const fromBase64 = (text: string): Uint8Array => {
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buf = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < clean.length; i++) {
    buf = (buf << 6) | B64.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[o++] = (buf >> bits) & 0xff;
    }
  }
  return bytes.subarray(0, o);
};

// ---- export ----

export async function buildExport(): Promise<BuiltExport> {
  const raw = await readRaw([SAFETY_KEY, BACKUP_KEY]);
  const data: Record<string, unknown> = {};
  Object.keys(raw).forEach(k => {
    try {
      data[k] = JSON.parse(raw[k]);
    } catch {
      data[k] = raw[k];
    }
  });
  const exportedAt = new Date().toISOString();
  const file = { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt, appVersion: APP_VERSION, data };
  const json = JSON.stringify(file);
  const packed = json.length > PACK_THRESHOLD;
  const text = packed ? PACK_PREFIX + toBase64(gzipSync(strToU8(json), { level: 9 })) : json;
  return { text, packed, chars: text.length, summary: summarize(data, exportedAt) };
}

// ---- import: read and check ----

export function parseImportText(input: string): ParsedImport {
  const trimmed = (input || '').trim();
  if (!trimmed) throw new Error('The box is empty. Paste your exported data first.');

  let json: string;
  if (trimmed.startsWith(PACK_PREFIX)) {
    try {
      json = strFromU8(gunzipSync(fromBase64(trimmed.slice(PACK_PREFIX.length))));
    } catch {
      throw new Error('That text is damaged, so it can\'t be read. Copy the export again from the old phone.');
    }
  } else {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new Error('This doesn\'t look like a gym app export. Copy it again from Settings > Export.');
    }
    json = trimmed.slice(start, end + 1);
  }

  let file: any;
  try {
    file = JSON.parse(json);
  } catch {
    throw new Error('The text is cut off or damaged, so it can\'t be read. Copy the whole export again.');
  }

  if (!file || typeof file !== 'object' || file.format !== EXPORT_FORMAT) {
    throw new Error('This doesn\'t look like a gym app export. Copy it again from Settings > Export.');
  }
  if (typeof file.version !== 'number') {
    throw new Error('This export has no version number, so it can\'t be imported.');
  }
  if (file.version > EXPORT_VERSION) {
    throw new Error('This export is from a newer version of the app. Update the app, then import again.');
  }
  const src = file.data;
  if (!src || typeof src !== 'object' || Array.isArray(src)) {
    throw new Error('The export has no data in it.');
  }
  if (src.workoutPrograms !== undefined && !Array.isArray(src.workoutPrograms)) {
    throw new Error('The programs in this export are damaged, so nothing was imported.');
  }
  if (src.workoutLogs !== undefined && !Array.isArray(src.workoutLogs)) {
    throw new Error('The workout history in this export is damaged, so nothing was imported.');
  }
  if (src.weightEntries !== undefined && !Array.isArray(src.weightEntries)) {
    throw new Error('The weigh-ins in this export are damaged, so nothing was imported.');
  }
  if (src.bodyMeasurements !== undefined && !Array.isArray(src.bodyMeasurements)) {
    throw new Error('The body measurements in this export are damaged, so nothing was imported.');
  }
  if (src.userProfile !== undefined && src.userProfile !== null && typeof src.userProfile !== 'object') {
    throw new Error('The profile in this export is damaged, so nothing was imported.');
  }
  if (src.workoutPrograms === undefined && src.workoutLogs === undefined && src.userProfile === undefined) {
    throw new Error('The export has no programs, workouts or profile in it.');
  }

  const data: Record<string, unknown> = {};
  Object.keys(src).forEach(k => {
    if (k === SAFETY_KEY || k === BACKUP_KEY || !KEY_PATTERN.test(k)) return;
    if (src[k] === undefined) return;
    data[k] = src[k];
  });
  const exportedAt = typeof file.exportedAt === 'string' ? file.exportedAt : null;
  return { data, summary: summarize(data, exportedAt) };
}

// ---- import: apply, undo ----

const writeSnapshot = async (entries: RawSnapshot): Promise<void> => {
  const keep = [SAFETY_KEY, BACKUP_KEY];
  const existing = (await AsyncStorage.getAllKeys()).filter(k => !keep.includes(k));
  if (existing.length) await AsyncStorage.multiRemove(existing);
  const pairs: [string, string][] = Object.keys(entries)
    .filter(k => !keep.includes(k))
    .map(k => [k, entries[k]] as [string, string]);
  if (pairs.length) await AsyncStorage.multiSet(pairs);
  const back = pairs.length ? await AsyncStorage.multiGet(pairs.map(p => p[0])) : [];
  const ok = back.every(([, v], i) => v === pairs[i][1]);
  if (!ok) throw new Error('verify failed');
  emitDataChanged();
};

export interface SafetyInfo {
  savedAt: string;
  summary: ExportSummary;
}

/** What Undo would put back, or null when there is no safety copy. */
export async function readSafetyInfo(): Promise<SafetyInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(SAFETY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const snap: RawSnapshot = parsed.snapshot || {};
    const data: Record<string, unknown> = {};
    Object.keys(snap).forEach(k => {
      try {
        data[k] = JSON.parse(snap[k]);
      } catch {
        data[k] = snap[k];
      }
    });
    return { savedAt: parsed.savedAt, summary: summarize(data, null) };
  } catch {
    return null;
  }
}

export async function applyImport(data: Record<string, unknown>): Promise<void> {
  // 1. Safety copy of what is here now. If it cannot be saved, nothing is replaced.
  const current = await readRaw([SAFETY_KEY]);
  const safety = JSON.stringify({ savedAt: new Date().toISOString(), appVersion: APP_VERSION, snapshot: current });
  const saved = await AsyncStorage.setItem(SAFETY_KEY, safety).then(() => true, () => false);
  if (!saved) throw new Error('Couldn\'t save a safety copy of your current data, so nothing was replaced.');

  // 2. Replace.
  const entries: RawSnapshot = {};
  Object.keys(data).forEach(k => {
    entries[k] = JSON.stringify(data[k]);
  });
  try {
    await writeSnapshot(entries);
  } catch {
    try {
      await writeSnapshot(current);
    } catch {}
    throw new Error('The import didn\'t finish, so your previous data was put back. Try again.');
  }
}

export async function undoLastImport(): Promise<SafetyInfo> {
  const raw = await AsyncStorage.getItem(SAFETY_KEY);
  if (!raw) throw new Error('There is nothing to undo.');
  const parsed = JSON.parse(raw);
  const info = await readSafetyInfo();
  if (!parsed || !parsed.snapshot || !info) throw new Error('The safety copy is damaged, so it can\'t be used.');
  await writeSnapshot(parsed.snapshot as RawSnapshot);
  return info;
}
