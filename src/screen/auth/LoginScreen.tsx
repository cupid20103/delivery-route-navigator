import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput, useTheme } from "react-native-paper";

import { useAuth } from "@/contexts/AuthContext";

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { login } = useAuth();

  const theme = useTheme();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Email and password are required");

      return;
    }

    try {
      const result = await login(email, password);

      alert(result.message);

      if (result.success) {
        router.push("/(main)/map");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[styles.header, { backgroundColor: theme.colors.primary }]}
      />
      <Card style={styles.card}>
        <Card.Content>
          <Text
            variant="headlineMedium"
            style={[styles.title, { color: theme.colors.primary }]}
          >
            Welcome Back
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Login to continue
          </Text>
          <TextInput
            mode="outlined"
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            left={<TextInput.Icon icon="email" size={20} />}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            left={<TextInput.Icon icon="lock" size={20} />}
            style={styles.input}
          />
          <View style={styles.actionGroup}>
            <Button mode="contained" onPress={handleLogin}>
              Login
            </Button>
            <Button
              icon="arrow-right"
              contentStyle={styles.arrowButton}
              onPress={() => router.push("/(auth)/signup")}
            >
              Signup
            </Button>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: 176,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  card: {
    marginHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 16,
  },
  title: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    marginBottom: 4,
  },
  actionGroup: {
    marginTop: 16,
  },
  arrowButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
});

export default LoginScreen;
