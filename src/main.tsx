import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/pushNotifications";

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  registerServiceWorker().catch((error) => {
    console.error('[Main] Service Worker registration failed:', error);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
