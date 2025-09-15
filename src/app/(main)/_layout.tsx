import { Stack } from "expo-router";
import React from "react";

const MainLayout: React.FC = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="map" />
    </Stack>
  );
};

export default MainLayout;
