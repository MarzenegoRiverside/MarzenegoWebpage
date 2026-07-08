// functions/index.js
// Cloud Function che manda notifiche push a tutti gli iscritti
// Deploy con: firebase deploy --only functions

const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.sendPushNotification = onCall(async (request) => {
  // Solo admin autenticati possono chiamare questa funzione
  // (per ora accettiamo tutti — aggiungi auth check se vuoi)
  const { title, body } = request.data;

  if (!title || !body) {
    throw new Error("title e body sono obbligatori");
  }

  const db = getFirestore();

  // Leggi tutti i token FCM salvati su Firestore
  const snap = await db.collection("fcm_tokens").get();
  if (snap.empty) return { sent: 0 };

  const tokens = [];
  snap.forEach(doc => {
    const t = doc.data().token;
    if (t) tokens.push(t);
  });

  if (tokens.length === 0) return { sent: 0 };

  // Manda in batch (max 500 per volta)
  const BATCH = 500;
  let sent = 0;
  for (let i = 0; i < tokens.length; i += BATCH) {
    const chunk = tokens.slice(i, i + BATCH);
    const response = await getMessaging().sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      webpush: {
        notification: {
          icon:    "https://marzenego-2e266.web.app/MarzenegoWebpage/Marzenego.png",
          badge:   "https://marzenego-2e266.web.app/MarzenegoWebpage/Marzenego.png",
          vibrate: [200, 100, 200],
          tag:     "marzenego-novita",
          renotify: true
        },
        fcmOptions: {
          link: "https://marzenego-2e266.web.app/MarzenegoWebpage/"
        }
      }
    });

    // Rimuovi token non validi da Firestore
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error && res.error.code;
        if (code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered") {
          // token scaduto: cancellalo
          db.collection("fcm_tokens").where("token", "==", chunk[idx]).get()
            .then(s => s.forEach(d => d.ref.delete()));
        }
      }
    });

    sent += response.successCount;
  }

  return { sent };
});

// ─── FEED ICS CALENDARIO (da aggiungere a functions/index.js) ───────────
// Richiede firebase-functions v2 e firebase-admin già inizializzato nel progetto.
// Region "europe-west1" per coerenza con la function sendPushNotification già esistente.

const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");

exports.icsFeed = onRequest({ region: "europe-west1", cors: true }, async (req, res) => {
  const db = getFirestore();
  const snapshot = await db.collection("eventi").get();

  const pad = (n) => String(n).padStart(2, "0");

  // Converte "2026-07-08" + "18:30" in "20260708T183000"
  const toICSDate = (dateStr, timeStr) => {
    const [y, m, d] = dateStr.split("-");
    const [hh, mm] = (timeStr || "00:00").split(":");
    return `${y}${m}${d}T${pad(hh)}${pad(mm)}00`;
  };

  const escapeICS = (str = "") =>
    String(str)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

  const now = new Date();
  const dtstamp =
    now.getUTCFullYear() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) + "T" +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds()) + "Z";

  let lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Marzenego Riverside//Calendario//IT");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push("X-WR-CALNAME:Marzenego Riverside");
  lines.push("X-WR-TIMEZONE:Europe/Rome");
  lines.push("REFRESH-INTERVAL;VALUE=DURATION:PT6H");
  lines.push("X-PUBLISHED-TTL:PT6H");

  snapshot.forEach((docSnap) => {
    const d = docSnap.data();
    if (!d.data || !d.ora) return; // evento senza data/ora valide, salta

    const dtStart = toICSDate(d.data, d.ora);
    const summary = d.luogo ? `${d.tipo} - ${d.luogo}` : (d.tipo || "Evento");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${docSnap.id}@marzenego-riverside`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;TZID=Europe/Rome:${dtStart}`);
    lines.push(`SUMMARY:${escapeICS(summary)}`);
    if (d.luogo) lines.push(`LOCATION:${escapeICS(d.luogo)}`);
    if (d.note) lines.push(`DESCRIPTION:${escapeICS(d.note)}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  res.set("Content-Type", "text/calendar; charset=utf-8");
  res.set("Content-Disposition", 'inline; filename="marzenego.ics"');
  res.set("Cache-Control", "public, max-age=1800"); // 30 minuti di cache
  res.status(200).send(lines.join("\r\n"));
});
