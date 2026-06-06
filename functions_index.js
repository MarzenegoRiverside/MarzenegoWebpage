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
