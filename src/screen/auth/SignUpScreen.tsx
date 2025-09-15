import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput, useTheme } from "react-native-paper";

import { useAuth } from "@/contexts/AuthContext";

const SignupScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const { register } = useAuth();

  const theme = useTheme();

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !confirm.trim()) {
      alert("All fields are required");

      return;
    }

    if (password !== confirm) {
      alert("Passwords do not match!");

      return;
    }

    try {
      const result = await register(email, password);

      alert(result.message);

      if (result.success) router.push("/(auth)/login");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Text
            variant="headlineMedium"
            style={[styles.title, { color: theme.colors.primary }]}
          >
            Create Account
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Sign up to get started
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
          <TextInput
            mode="outlined"
            label="Confirm Password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            left={<TextInput.Icon icon="lock-check" size={20} />}
            style={styles.input}
          />
          <View style={styles.actionGroup}>
            <Button mode="contained" onPress={handleSignup}>
              Signup
            </Button>
            <Button icon="arrow-left" onPress={() => router.back()}>
              Back to Login
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
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 24,
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
});

export default SignupScreen;
