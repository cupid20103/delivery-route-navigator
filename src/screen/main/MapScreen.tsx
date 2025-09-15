import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Button, Card, Text } from "react-native-paper";

const MapScreen: React.FC = () => {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        marginHorizontal: 24,
      }}
    >
      <Card>
        <Card.Content>
          <Text variant="titleMedium">Map Screen</Text>
          <Text variant="bodyMedium">Map Content</Text>
          <Button onPress={() => router.push("/(auth)/login")}>Log out</Button>
        </Card.Content>
      </Card>
    </View>
  );
};

export default MapScreen;
