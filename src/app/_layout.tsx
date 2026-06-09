import { Slot, SplashScreen } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/contexts/AuthContext";
import { Provider } from "react-native-paper";

const RootLayout: React.FC = () => {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <Provider>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          <Slot screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </AuthProvider>
    </Provider>
  );
};

export default RootLayout;
