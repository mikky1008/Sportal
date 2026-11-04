import { createRoot } from "react-dom/client";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "./theme/variables.css";
import "./styles.css";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);

if (Capacitor.isNativePlatform()) {
  // dark status bar text on the light screens; the splash hides as soon as the app has drawn
  void StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
  void SplashScreen.hide().catch(() => undefined);
}
