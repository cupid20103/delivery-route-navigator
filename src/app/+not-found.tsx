import { router } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";

import Wrapper from "@/components/layout/Wrapper";

const NotFound: React.FC = () => {
  const theme = useTheme();

  return (
    <Wrapper>
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text
          variant="displaySmall"
          style={[styles.code, { color: theme.colors.primary }]}
        >
          404
        </Text>
        <Text
          variant="headlineMedium"
          style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
        >
          Page Not Found
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.subtext, { color: theme.colors.primary }]}
        >
          The page you're looking for doesn't exist or has been moved.
        </Text>
        <Button
          mode="contained"
          icon="arrow-left"
          onPress={() => router.push("/")}
        >
          Go home
        </Button>
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  code: {
    fontWeight: "700",
    marginBottom: 16,
  },
  message: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtext: {
    textAlign: "center",
    marginBottom: 36,
  },
});

export default NotFound;
