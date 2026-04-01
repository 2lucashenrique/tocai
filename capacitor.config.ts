import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tocai.app",
  appName: "TocaAi",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
};

export default config;
