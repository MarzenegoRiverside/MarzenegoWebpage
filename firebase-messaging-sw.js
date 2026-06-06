// firebase-messaging-sw.js
// Questo file VA messo nella root del repo (accanto a index.html)
// È richiesto da Firebase Cloud Messaging per ricevere notifiche in background

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyCvqU28XLWRsfJUso0MuS72O2Qxks-MFP0",
  authDomain:        "marzenego-2e266.firebaseapp.com",
  projectId:         "marzenego-2e266",
  messagingSenderId: "969784405327",   // ← vedi istruzioni sotto
  appId:             "1:969784405327:web:04d85be967eac72645293a"       // ← vedi istruzioni sotto
});

const messaging = firebase.messaging();

// Gestisce notifiche quando l'app è in background / chiusa
messaging.onBackgroundMessage(payload => {
  const { title = "Marzenego Riverside 🦫", body = "Ehi, entra nell'app per vedere le novità!" } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon:    "/MarzenegoWebpage/Marzenego.png",
    badge:   "/MarzenegoWebpage/Marzenego.png",
    vibrate: [200, 100, 200],
    tag:     "marzenego-novita",
    renotify: true,
    data: { url: "/MarzenegoWebpage/" }
  });
});

// Tap sulla notifica → apre l'app
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes("MarzenegoWebpage") && "focus" in c) return c.focus();
      }
      return clients.openWindow("/MarzenegoWebpage/");
    })
  );
});
