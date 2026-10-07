import { verifyAdminPassword } from "./admin-auth.js";
import {
  isUnlocked,
  validateConfig,
} from "./core.js";
const $ = (id) => document.getElementById(id);
const KEYS = {
  config: "winterpost.config.v1",
  opened: "winterpost.opened.v1",
};
let config,
  draft,
  selected = 1,
  authenticated = false,
  pendingImage = "",
  imageBusy = false;
let opened = {},
  defaults;
function tell(message) {
  $("status").hidden = false;
  $("status").textContent = message;
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error(
      "Speichern nicht möglich. Gerätespeicher voll oder Browserspeicher gesperrt. Bitte Bilder verkleinern oder JSON exportieren.",
    );
  }
}
function read(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
function render() {
  const now = new Date(),
    year = now.getFullYear();
  $("year").textContent = year;
  $("season-text").textContent =
    now.getMonth() === 11
      ? "Dein täglicher Moment im Advent"
      : "Die Vorfreude beginnt am 1. Dezember";
  $("calendar").replaceChildren();
  let count = 0;
  for (const d of config.doors) {
    const seen = opened[`${year}-${d.day}`] === true;
    if (seen) count++;
    const available = d.enabled && isUnlocked(d.day, now);
    const b = document.createElement("button");
    b.className = `tile ${seen ? "seen" : ""} ${available ? "available" : "locked"}`;
    b.setAttribute("aria-disabled", String(!available));
    b.setAttribute(
      "aria-label",
      `${d.day}. Dezember: ${!d.enabled ? "deaktiviert" : seen ? "bereits geöffnet" : available ? "Türchen öffnen" : "noch gesperrt"}`,
    );
    const number = document.createElement("span");
    number.className = "number";
    number.textContent = String(d.day).padStart(2, "0");
    const symbol = document.createElement("span");
    symbol.className = "tile-symbol";
    symbol.textContent = seen ? "✓" : available ? "✧" : !d.enabled ? "–" : "◌";
    b.append(number, symbol);
    b.onclick = () => {
      if (!d.enabled || !isUnlocked(d.day)) {
        tell(
          !d.enabled
            ? "Dieses Türchen ist deaktiviert."
            : `Dieses Türchen öffnet sich am ${d.day}. Dezember.`,
        );
        render();
        return;
      }
      const next = {
        ...opened,
        [`${new Date().getFullYear()}-${d.day}`]: true,
      };
      try {
        write(KEYS.opened, next);
        opened = next;
      } catch (e) {
        tell(e.message);
      }
      $("door-date").textContent = `${d.day}. DEZEMBER`;
      $("door-title").textContent = d.title;
      $("door-text").textContent = d.text;
      $("door-image").hidden = !d.image;
      $("door-image").src = d.image || "";
      $("door-image").alt = d.title;
      $("door-link").hidden = !d.link;
      $("door-link").href = d.link || "#";
      $("door-link").textContent = d.buttonText || "Mehr entdecken";
      $("door-dialog").showModal();
      render();
    };
    $("calendar").append(b);
  }
  $("progress").textContent = `${count} / 24 entdeckt`;
}
$("admin-open").onclick = () => {
  $("auth-title").textContent = "Willkommen zurück";
  $("auth-help").textContent = "Öffne deine Kalenderwerkstatt mit dem Administrator-Passwort.";
  $("auth-error").textContent = "";
  $("auth-form").reset();
  $("auth-dialog").showModal();
};
$("auth-form").onsubmit = async (e) => {
  e.preventDefault();
  $("auth-submit").disabled = true;
  try {
    if (!crypto.subtle)
      throw new Error("Web Crypto benötigt HTTPS oder localhost.");
    if (!(await verifyAdminPassword($("password").value)))
      throw new Error("Das Passwort stimmt nicht.");
    if (!$("auth-dialog").open) return;
    authenticated = true;
    draft = structuredClone(config);
    selected = 1;
    $("auth-form").reset();
    $("auth-dialog").close();
    loadEditor();
    $("admin-dialog").showModal();
  } catch (e) {
    $("auth-error").textContent = e.message;
  } finally {
    $("auth-submit").disabled = false;
  }
};
function capture() {
  if (!authenticated) throw new Error("Bitte erneut anmelden.");
  if (imageBusy) throw new Error("Bitte warten, bis das Bild geladen ist.");
  const d = draft.doors[selected - 1];
  Object.assign(d, {
    title: $("edit-title").value,
    text: $("edit-text").value,
    image: pendingImage,
    link: $("edit-link").value.trim(),
    buttonText: $("edit-button").value,
    enabled: $("edit-enabled").checked,
  });
  draft = validateConfig(draft);
}
function loadEditor() {
  const d = draft.doors[selected - 1];
  $("edit-date").value = `${selected}. Dezember`;
  $("edit-title").value = d.title;
  $("edit-text").value = d.text;
  pendingImage = d.image;
  $("edit-image").value = "";
  $("image-state").textContent = d.image
    ? "Bild eingebettet und offline verfügbar."
    : "Kein Bild ausgewählt.";
  $("edit-link").value = d.link;
  $("edit-button").value = d.buttonText;
  $("edit-enabled").checked = d.enabled;
  $("admin-error").textContent = "";
  $("save-state").textContent = "";
  $("admin-days").replaceChildren();
  for (let i = 1; i <= 24; i++) {
    const b = document.createElement("button");
    b.textContent = i;
    b.setAttribute("aria-label", `${i}. Dezember bearbeiten`);
    b.setAttribute("aria-pressed", String(i === selected));
    b.onclick = () => {
      try {
        capture();
        selected = i;
        loadEditor();
      } catch (e) {
        $("admin-error").textContent = e.message;
      }
    };
    $("admin-days").append(b);
  }
}
$("edit-image").onchange = async () => {
  const f = $("edit-image").files[0];
  if (!f) return;
  imageBusy = true;
  try {
    if (
      f.size > 300000 ||
      !["image/png", "image/jpeg", "image/webp"].includes(f.type)
    )
      throw new Error("Bitte PNG, JPEG oder WebP bis 300 KB auswählen.");
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
      r.readAsDataURL(f);
    });
    const img = new Image();
    img.src = data;
    await img.decode();
    pendingImage = data;
    $("image-state").textContent =
      "Bild bereit. Änderungen speichern nicht vergessen.";
    $("admin-error").textContent = "";
  } catch (e) {
    $("admin-error").textContent = e.message;
  } finally {
    imageBusy = false;
  }
};
$("remove-image").onclick = () => {
  pendingImage = "";
  $("edit-image").value = "";
  $("image-state").textContent = "Bild entfernt. Bitte speichern.";
};
$("edit-form").onsubmit = (e) => {
  e.preventDefault();
  try {
    capture();
    write(KEYS.config, draft);
    config = structuredClone(draft);
    render();
    $("save-state").textContent = "Gespeichert ✓";
    $("admin-error").textContent = "";
  } catch (e) {
    $("admin-error").textContent = e.message;
  }
};
$("edit-form").oninput = () => {
  $("save-state").textContent = "Ungespeicherte Änderungen";
};
function confirmAction(title, text, action) {
  $("confirm-title").textContent = title;
  $("confirm-text").textContent = text;
  $("confirm-dialog").showModal();
  $("confirm-ok").onclick = () => {
    try {
      if (!authenticated) throw new Error("Bitte erneut anmelden.");
      action();
      $("confirm-dialog").close();
    } catch (e) {
      $("confirm-dialog").close();
      $("admin-error").textContent = e.message;
    }
  };
}
$("confirm-cancel").onclick = () => $("confirm-dialog").close();
$("reset").onclick = () =>
  confirmAction(
    "Kalender zurücksetzen?",
    "Alle Inhalte werden durch die 24 Beispiel-Türchen ersetzt. Dein Passwort und bereits geöffnete Türchen bleiben erhalten.",
    () => {
      write(KEYS.config, defaults);
      config = structuredClone(defaults);
      draft = structuredClone(config);
      loadEditor();
      render();
    },
  );
$("export").onclick = () => {
  try {
    capture();
    const blob = new Blob([JSON.stringify(draft, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "winterpost-kalender-v1.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    $("admin-error").textContent = e.message;
  }
};
$("import").onchange = async () => {
  const f = $("import").files[0];
  if (!f) return;
  try {
    if (f.size > 12000000)
      throw new Error("Die JSON-Datei darf maximal 12 MB groß sein.");
    let raw;
    try {
      raw = JSON.parse(await f.text());
    } catch {
      throw new Error("Die Datei enthält kein gültiges JSON.");
    }
    const next = validateConfig(raw);
    confirmAction(
      "Kalender importieren?",
      `Version ${next.version} · 24 Türchen · ${next.doors.filter((d) => d.enabled).length} aktiviert · ${next.doors.filter((d) => d.image).length} Bilder. Vorschau: 1. Dezember „${next.doors[0].title}“, 24. Dezember „${next.doors[23].title}“. Bestehende Inhalte und ungespeicherte Änderungen werden ersetzt.`,
      () => {
        write(KEYS.config, next);
        config = next;
        draft = structuredClone(next);
        loadEditor();
        render();
      },
    );
  } catch (e) {
    $("admin-error").textContent = e.message;
  } finally {
    $("import").value = "";
  }
};
for (const b of document.querySelectorAll("[data-close]"))
  b.onclick = () => $(b.dataset.close).close();
$("admin-dialog").addEventListener("close", () => {
  authenticated = false;
  draft = null;
});
let installPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  $("install").hidden = false;
});
$("install").onclick = async () => {
  await installPrompt?.prompt();
  $("install").hidden = true;
};
function connection() {
  $("offline").hidden = navigator.onLine;
}
window.addEventListener("online", connection);
window.addEventListener("offline", connection);
connection();
try {
  defaults = validateConfig(
    await (await fetch("example-calendar.json")).json(),
  );
  config = defaults;
  try {
    const stored = read(KEYS.config);
    if (stored) config = validateConfig(stored);
    const saved = read(KEYS.opened);
    opened =
      saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch (e) {
    tell(
      `Lokale Daten konnten nicht geladen werden: ${e.message} Die Beispielansicht wird angezeigt; gespeicherte Daten werden nicht automatisch überschrieben.`,
    );
  }
  render();
  setInterval(render, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render();
  });
} catch (e) {
  tell(`Kalender konnte nicht geladen werden. Bitte neu laden. ${e.message}`);
}
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .catch(() =>
      tell(
        "Offline-Modus konnte nicht eingerichtet werden. Bitte HTTPS oder localhost verwenden.",
      ),
    );
