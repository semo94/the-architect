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
      backendUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
    },
  },
};