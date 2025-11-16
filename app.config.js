import 'dotenv/config';

export default {
  expo: {
    name: "Breadthwise",
    slug: "breadthwise",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "breadthwise",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#29B6F6",
    },
    newArchEnabled: true,
    ios: {
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      },
      supportsTablet: true,
      bundleIdentifier: "com.sbakri.breadthwise",
    },
    android: {
      package: "com.sbakri.breadthwise",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: "6272247b-8bd2-4101-b44f-bdcfc30174b8"
      },
      llmProvider: process.env.LLM_PROVIDER || "anthropic",
      llmApiKey: process.env.LLM_API_KEY,
      llmApiUrl: process.env.LLM_API_URL || "https://api.anthropic.com/v1/messages",
      llmModel: process.env.LLM_MODEL || "claude-3-5-sonnet-20241022",
      llmAnthropicVersion: process.env.LLM_ANTHROPIC_VERSION || "2023-06-01",
      llmMaxTokens: parseInt(process.env.LLM_MAX_TOKENS || "4000", 10),
      llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || "0.7"),
      // public for web bundle consumption; points to local proxy in dev
      llmProxyUrl: process.env.EXPO_PUBLIC_LLM_PROXY_URL || "",
      // Auth backend URL
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000",
    },
  },
};