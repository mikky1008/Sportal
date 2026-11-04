import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sportal.app",
  appName: "Sportal",
  webDir: "dist",
  // Android serves the app from https://localhost by default. If your API is plain http (local
  // development on your own network), uncomment the next line, or better, put the API behind https.
  // server: { cleartext: true },
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: "#0f1b3d", showSpinner: false },
    StatusBar: { style: "LIGHT" },
  },
};

export default config;
