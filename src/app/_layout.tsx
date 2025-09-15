import { Slot, SplashScreen } from "expo-router";
import { useEffect } from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/contexts/AuthContext";

const RootLayout: React.FC = () => {
  const colorScheme = useColorScheme();

  const barStyle = colorScheme === "dark" ? "light-content" : "dark-content";

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar barStyle={barStyle} />
        <Slot screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </AuthProvider>
  );
};

export default RootLayout;
