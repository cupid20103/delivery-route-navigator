import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const saveData = async (index: string, data: any) => {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(index, JSON.stringify(data));
    } else {
      await SecureStore.setItemAsync(index, JSON.stringify(data));
    }
  } catch (error) {
    console.error("Error saving data:", error);

    throw new Error("Failed to save data");
  }
};

export const loadData = async (index: string) => {
  try {
    if (Platform.OS === "web") {
      const saved = localStorage.getItem(index);

      return saved ? JSON.parse(saved) : null;
    } else {
      const saved = await SecureStore.getItemAsync(index);

      return saved ? JSON.parse(saved) : null;
    }
  } catch (error) {
    console.error("Error loading data:", error);

    throw new Error("Failed to load data");
  }
};

export const clearData = async (index: string) => {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(index);
    } else {
      await SecureStore.deleteItemAsync(index);
    }
  } catch (error) {
    console.error("Error clearing data:", error);

    throw new Error("Failed to clear data");
  }
};
