self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "UniNexus Connect", body: "" };
  event.waitUntil(
    self.registration.showNotification(data.title || "UniNexus Connect", {
      body: data.body,
      icon: "/logos/inter-uni-logo.webp",
      badge: "/logos/inter-uni-logo.webp",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
