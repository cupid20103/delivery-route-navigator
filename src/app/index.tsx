import { router } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text, useTheme } from "react-native-paper";

import { useAuth } from "@/contexts/AuthContext";

const App: React.FC = () => {
  const theme = useTheme();

  const { user, loading } = useAuth();

  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text
        variant="displaySmall"
        style={[styles.title, { color: theme.colors.primary }]}
      >
        Welcome to StraightAway
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Organize, track, and manage your tasks with ease.
      </Text>
      <Button
        mode="contained"
        onPress={() => router.push(!user ? "/(auth)/login" : "/map")}
      >
        Get Started
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 150,
    height: 20,
    marginBottom: 24,
  },
  title: {
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 36,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default App;
