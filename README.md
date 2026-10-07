# Winterpost

Eine mobile Adventskalender-PWA ohne Framework, Build-Schritt, Laufzeitabhängigkeiten oder externe Dienste. 24 Türchen, lokale Konfiguration und jährlicher Öffnungsfortschritt, Web-Crypto-Adminzugang, JSON-Import/Export und Offline-App-Shell.

## Lokal starten

Node.js 22 oder neuer installieren. Im Projektordner:

```sh
npm run dev
```

http://localhost:4173 öffnen. Eine Paketinstallation ist nicht nötig. `npm test` prüft die zentrale Logik, `npm run check` die JavaScript-Syntax. Der Entwicklungsserver bindet ausschließlich an localhost. Nicht mit `file://` öffnen: ES-Module, Fetch und Service Worker benötigen einen Webserver.

Für den Betrieb alle öffentlichen Dateien auf einen statischen HTTPS-Webserver kopieren: `index.html`, `src/`, `assets/`, `example-calendar.json`, `manifest.webmanifest`, `sw.js`. Funktioniert auch in einem Unterverzeichnis. Repository, Tests und Entwicklungsdateien müssen nicht veröffentlicht werden.

## Kalender und Zeit

Türchen öffnen jährlich vom jeweiligen 1.–24. Dezember an bis Ende Dezember nach der lokalen Gerätezeit. Januar bis November sind sie gesperrt. Deaktivierte Türchen bleiben gesperrt. Die Uhr wird beim Öffnen erneut geprüft und die Ansicht jede Minute sowie bei Rückkehr zur App aktualisiert. Fortschritt wird unter dem jeweiligen Jahr lokal gespeichert. Eine manipulierte Geräteuhr kann die Freigabe umgehen.

## PWA installieren und offline nutzen

Die Seite einmal mit Internetverbindung vollständig laden, damit der Service Worker alle App-Dateien zwischenspeichert. Danach lässt sich die App auch ohne Netz öffnen. Texte und eingebettete Bilder funktionieren offline; externe Links benötigen eine Verbindung.

- **iPhone/iPad:** In Safari „Teilen“ → „Zum Home-Bildschirm“ wählen.
- **Android:** Im Browser „App installieren“ / „Zum Startbildschirm hinzufügen“ oder den eingeblendeten Installieren-Button verwenden.
- **Desktop:** Die Installationsfunktion des Browsers verwenden, sofern verfügbar.

HTTPS ist für Installation, Web Crypto und Service Worker erforderlich (localhost ist für Entwicklung ausgenommen). Private Modi oder Browsereinstellungen können Installation und Speicherung beschränken. Browser und installierte App können insbesondere unter iOS getrennte Speicherbereiche verwenden; dafür den JSON-Transfer nutzen.

Beim Veröffentlichen neuer App-Dateien die Cache-Version in `sw.js` erhöhen. Das Update wird nach Schließen der alten App-Fenster aktiv. Konfigurationen bleiben im lokalen Speicher erhalten. Browserdaten können vom Nutzer oder Betriebssystem gelöscht werden; wichtige Inhalte regelmäßig exportieren.

## Adminbereich

Über das Zahnrad öffnen. Der Zugang verwendet auf allen Geräten dasselbe fest konfigurierte Administrator-Passwort. Im Code liegt ausschließlich ein gesalzener Prüfwert; es gibt keine lokale Passwort-Ersteinrichtung. Nur eine erfolgreiche Passwortprüfung öffnet die Bearbeitung. Schließen oder Escape meldet ab.

Ein Türchen wählen, Titel, Text, Aktivierung, Link und Button-Text bearbeiten. PNG-, JPEG- oder WebP-Bilder bis 300 KB werden eingebettet. „Änderungen speichern“ speichert den gesamten Entwurf. Wechsel zwischen Türchen übernimmt Eingaben in den Entwurf; Schließen verwirft seit dem letzten Speichern vorgenommene Änderungen. „Kalender zurücksetzen“ ersetzt nach Bestätigung die Inhalte durch die Beispiele, erhält aber Passwort und Öffnungsfortschritt.

### Testdatum

Im Adminfenster unter „Kalender testen“ ein Datum wählen und „Testdatum setzen“ drücken. Das Adminfenster schließen, um Türchen im Kalender zu öffnen. Bei einem Dezemberdatum sind alle aktivierten Türchen bis einschließlich dieses Tags verfügbar; außerhalb des Dezembers bleiben sie wie im normalen Betrieb gesperrt. Eine sichtbare Meldung kennzeichnet den Testmodus.

„Echtes Datum verwenden“ beendet den Test. Der Testmodus bleibt beim Schließen des Adminfensters aktiv, endet aber auch beim Neuladen. Testöffnungen werden ausschließlich im Arbeitsspeicher gehalten; der reguläre Öffnungsfortschritt bleibt erhalten. Testdatum und Testöffnungen werden nicht exportiert.

### Sicherheitsgrenzen und Wiederherstellung

Das Passwort wird nicht gespeichert. Web Crypto leitet mit PBKDF2-SHA-256, 310.000 Iterationen und einem zufälligen 16-Byte-Salt einen 256-Bit-Prüfwert ab. Nur Salt und Prüfwert liegen in `src/admin-auth.js`; das Passwort ist weder im Repository noch im Export enthalten. Alte lokale Passwortdatensätze werden nicht mehr verwendet.

Dies ist **kein serverseitiger Hochsicherheitsschutz**: Kalenderinhalte sind unverschlüsselt; Personen mit Zugriff auf Browser-Entwicklerwerkzeuge oder Gerät können Code und Speicher ändern, den Zugang zurücksetzen oder Inhalte vorzeitig lesen. Nicht für vertrauliche Daten verwenden. Der feste Prüfwert ist öffentlich lesbar und erlaubt Offline-Passwortversuche. Bei mehreren offenen Adminfenstern gewinnt der letzte Speichervorgang.

Passwortänderungen erfolgen durch Erzeugen eines neuen Salt-/Prüfwert-Paars in `src/admin-auth.js` und Veröffentlichen einer neuen App-Version mit erhöhter Service-Worker-Cache-Version. Das Löschen lokaler Daten setzt das feste Passwort nicht zurück. Ein vollständiges Löschen der Websitedaten entfernt auch Inhalte und Fortschritt. Beschädigte Konfigurationen werden nicht automatisch überschrieben; die App zeigt eine Fehlermeldung und gegebenenfalls die Beispiele.

## Import und Export

Im Adminbereich „JSON exportieren“ lädt den gesamten aktuellen Entwurf einschließlich Bildern herunter. Passwort und Öffnungsfortschritt werden bewusst nicht übertragen. Auf dem Zielgerät mit dem festen Administrator-Passwort anmelden und „JSON importieren“ wählen. Erst nach erfolgreicher Validierung und einer Vorschau mit ausdrücklicher Bestätigung ersetzt der Import die bestehende Konfiguration. Abbrechen lässt sie unverändert. Ein fehlgeschlagener Schreibvorgang lässt den bisherigen Kalender erhalten.

`example-calendar.json` enthält 24 vollständige Beispiel-Türchen. Format:

```json
{
  "version": 1,
  "doors": [
    {
      "day": 1,
      "title": "Ein leiser Anfang",
      "text": "Zeit für einen kleinen Moment.",
      "image": "",
      "link": "",
      "buttonText": "",
      "enabled": true
    }
  ]
}
```

Das verkürzte Beispiel zeigt ein Türchen; reale Dateien müssen genau 24 eindeutige Tage (1–24) enthalten. Alle gezeigten Felder sind erforderlich. Optionale Inhalte sind leere Strings. Bild: eingebettete Base64-Daten-URL für PNG, JPEG oder WebP. Links: absolute HTTP(S)-URLs. Unbekannte Felder werden verworfen. Unbekannte Versionen werden verständlich abgelehnt; spätere Versionen brauchen eine explizite Migration. Dateigrenze: 12 MB; Feldgrenzen stehen in `src/core.js`. Local Storage bietet je nach Browser typischerweise nur wenige MB: bei Speicherfehlern Bilder reduzieren. Texte werden mit `textContent` gerendert, HTML und Skript-URLs nicht ausgeführt.

## Projektstruktur

- `index.html` – Kalender und zugängliche native Dialoge
- `src/app.js` – Bedienung, Speicherung, Import/Export und Installation
- `src/core.js` – reine Freigabe-/Validierungslogik und Web Crypto
- `src/style.css` – responsives Layout mit reduzierter Bewegung
- `sw.js`, `manifest.webmanifest`, `assets/` – Offlinecache und PWA-Icons
- `example-calendar.json` – 24 Beispielinhalte
- `tests/core.test.js` – automatisierte Logiktests
- `scripts/serve.mjs` – lokaler Server ohne Abhängigkeiten

## Manuelle Abnahme

Auf Smartphone-Breite und Desktop prüfen: 24 Türchen ohne horizontales Scrollen; Datum vor Advent, 1. Dezember und 24. Dezember; Öffnen und Neuladen; Adminanmeldung mit falschem/richtigem Passwort; Bearbeitung und Speichern; Export und Import mit Abbrechen/Bestätigen; ungültiges JSON; installierte App nach erstmaligem Laden offline neu öffnen. Native Installationsabläufe müssen auf realem iOS/Android geprüft werden.
