export const VERSION = 1;
export const DOOR_ORDER_KEY = "winterpost.order.v1";
export function loadDoorOrder(
  storage,
  onError = () => {},
  random = Math.random,
) {
  try {
    const saved = JSON.parse(storage.getItem(DOOR_ORDER_KEY));
    if (
      Array.isArray(saved) &&
      saved.length === 24 &&
      new Set(saved).size === 24 &&
      saved.every((day) => Number.isInteger(day) && day >= 1 && day <= 24)
    ) {
      return saved;
    }
  } catch (error) {
    // Invalid JSON is replaced; blocked storage is reported on the write below.
  }
  const order = Array.from({ length: 24 }, (_, i) => i + 1);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  try {
    storage.setItem(DOOR_ORDER_KEY, JSON.stringify(order));
  } catch (error) {
    onError(error);
  }
  return order;
}
// Parse date inputs as local dates, avoiding UTC shifts on phones.
export function calendarDate(testDate = "", now = new Date()) {
  if (!testDate) return now;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(testDate);
  if (!match) throw new Error("Bitte ein gültiges Testdatum auswählen.");
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    throw new Error("Bitte ein gültiges Testdatum auswählen.");
  return date;
}
export function isUnlocked(day, now = new Date()) {
  return (
    Number.isInteger(day) &&
    day >= 1 &&
    day <= 24 &&
    now.getMonth() === 11 &&
    now.getDate() >= day
  );
}
export function safeLink(value) {
  if (!value) return true;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export function safeImage(value) {
  return (
    !value ||
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
}
export function validateConfig(input) {
  const fail = (message) => {
    throw new Error(message);
  };
  if (!input || typeof input !== "object" || Array.isArray(input))
    fail("Die Datei muss ein JSON-Objekt enthalten.");
  if (input.version !== VERSION)
    fail("Nicht unterstützte Formatversion. Erwartet wird Version 1.");
  if (!Array.isArray(input.doors) || input.doors.length !== 24)
    fail("Der Kalender muss genau 24 Türchen enthalten.");
  const ids = new Set();
  const doors = input.doors
    .map((d) => {
      if (
        !d ||
        !Number.isInteger(d.day) ||
        d.day < 1 ||
        d.day > 24 ||
        ids.has(d.day)
      )
        fail("Türnummern müssen eindeutig von 1 bis 24 reichen.");
      ids.add(d.day);
      for (const [key, max] of [
        ["title", 120],
        ["text", 10000],
        ["image", 450000],
        ["link", 2048],
        ["buttonText", 80],
      ]) {
        if (typeof d[key] !== "string" || d[key].length > max)
          fail(`Tür ${d.day}: „${key}“ fehlt, ist kein Text oder ist zu lang.`);
      }
      if (!d.title.trim()) fail(`Tür ${d.day}: Bitte einen Titel eingeben.`);
      if (typeof d.enabled !== "boolean")
        fail(`Tür ${d.day}: „enabled“ muss true oder false sein.`);
      if (!safeLink(d.link))
        fail(
          `Tür ${d.day}: Nur vollständige HTTP- oder HTTPS-Links sind erlaubt.`,
        );
      if (!safeImage(d.image))
        fail(
          `Tür ${d.day}: Bilder müssen als PNG, JPEG oder WebP eingebettet sein.`,
        );
      return {
        day: d.day,
        title: d.title,
        text: d.text,
        image: d.image,
        link: d.link,
        buttonText: d.buttonText,
        enabled: d.enabled,
      };
    })
    .sort((a, b) => a.day - b.day);
  return { version: VERSION, doors };
}
export async function passwordRecord(
  password,
  salt = crypto.getRandomValues(new Uint8Array(16)),
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    key,
    256,
  );
  return { salt: Array.from(salt), hash: Array.from(new Uint8Array(hash)) };
}
export async function verifyPassword(password, record) {
  const candidate = await passwordRecord(password, new Uint8Array(record.salt));
  return (
    candidate.hash.length === record.hash.length &&
    candidate.hash.reduce((diff, b, i) => diff | (b ^ record.hash[i]), 0) === 0
  );
}
