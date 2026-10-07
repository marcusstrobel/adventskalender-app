import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  isUnlocked,
  calendarDate,
  validateConfig,
  passwordRecord,
  verifyPassword,
} from "../src/core.js";
const example = JSON.parse(
  await readFile(new URL("../example-calendar.json", import.meta.url), "utf8"),
);
test("Freigabe nach lokalem Dezemberdatum, inklusive Tagesgrenzen", () => {
  assert.equal(isUnlocked(1, new Date(2026, 10, 30, 23, 59)), false);
  assert.equal(isUnlocked(1, new Date(2026, 11, 1)), true);
  assert.equal(isUnlocked(2, new Date(2026, 11, 1, 23, 59)), false);
  assert.equal(isUnlocked(24, new Date(2026, 11, 24)), true);
  assert.equal(isUnlocked(24, new Date(2026, 11, 31)), true);
  assert.equal(isUnlocked(1, new Date(2027, 0, 1)), false);
  assert.equal(isUnlocked(0, new Date(2026, 11, 24)), false);
});
test("Beispiel und JSON-Roundtrip", () =>
  assert.deepEqual(
    validateConfig(JSON.parse(JSON.stringify(example))),
    example,
  ));
test("Version, Anzahl, doppelte Tage, Felder und gefährliche URLs abweisen", () => {
  for (const mutate of [
    (x) => (x.version = 2),
    (x) => x.doors.pop(),
    (x) => (x.doors[1].day = 1),
    (x) => (x.doors[0].title = ""),
    (x) => (x.doors[0].enabled = "true"),
    (x) => (x.doors[0].text = null),
    (x) => (x.doors[0].link = "javascript:alert(1)"),
    (x) => (x.doors[0].image = "data:image/svg+xml;base64,AAAA"),
    (x) => (x.doors[0].image = "https://example.com/image.png"),
  ]) {
    const c = structuredClone(example);
    mutate(c);
    assert.throws(() => validateConfig(c));
  }
});
test("HTTP-Links und eingebettete Rasterbilder akzeptieren, unbekannte Felder entfernen", () => {
  const c = structuredClone(example);
  c.secret = "excluded";
  c.doors[0].link = "https://example.com/";
  c.doors[0].image = "data:image/png;base64,AAAA";
  assert.equal(validateConfig(c).secret, undefined);
});
test("Passwortableitung mit zufälligem Salt und Prüfung", async () => {
  const a = await passwordRecord("ein langes testpasswort"),
    b = await passwordRecord("ein langes testpasswort");
  assert.notDeepEqual(a.salt, b.salt);
  assert.equal(await verifyPassword("ein langes testpasswort", a), true);
  assert.equal(await verifyPassword("falsch", a), false);
});

test("Testdatum gibt genau die Türchen bis zum ausgewählten Dezembertag frei", () => {
  const now = new Date(2026, 9, 7);
  const simulated = calendarDate("2026-12-12", now);
  assert.deepEqual(
    Array.from({ length: 24 }, (_, i) => isUnlocked(i + 1, simulated)),
    Array.from({ length: 24 }, (_, i) => i < 12),
  );
  assert.equal(calendarDate("", now), now);
  assert.equal(isUnlocked(1, calendarDate("2026-11-30")), false);
  assert.equal(isUnlocked(24, calendarDate("2026-12-24")), true);
  assert.equal(simulated.getFullYear(), 2026);
  assert.equal(simulated.getMonth(), 11);
  assert.equal(simulated.getDate(), 12);
});
test("Ungültige Testdaten werden nicht still auf einen anderen Tag verschoben", () => {
  for (const value of [
    "2026-02-30",
    "2026-13-01",
    "2026-00-01",
    "kein Datum",
    "2026-12-00",
  ])
    assert.throws(() => calendarDate(value));
  assert.equal(calendarDate("2028-02-29").getDate(), 29);
});
