import InitialLayout from "@/components/initial_layout";
import { AuthProvider } from "@/providers/AuthProvider";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";

import { SplashScreen } from "expo-router";
import { useCallback } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import "../global.css";

const myTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "black",
    card: "#fff",
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Medium": require("../assets/fonts/JetBrainsMono-Medium.ttf"),
  });

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return (
    <ThemeProvider value={myTheme}>
      <AuthProvider>
        <SafeAreaProvider>
          <SafeAreaView
            style={{ flex: 1, backgroundColor: "#fff" }}
            onLayout={onLayoutRootView}
          >
            <InitialLayout />
          </SafeAreaView>
        </SafeAreaProvider>
      </AuthProvider>
      <StatusBar barStyle={"dark-content"} />
    </ThemeProvider>
  );
}
