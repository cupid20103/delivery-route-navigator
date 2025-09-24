import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { WrapperProps } from "@/types/component";

const Wrapper: React.FC<WrapperProps> = ({
  children,
  scrollable = false,
  style = {},
  contentStyle = {},
}) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      {scrollable ? (
        <ScrollView
          style={[
            styles.scrollView,
            { backgroundColor: theme.colors.onBackground },
            contentStyle,
          ]}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.content,
            { backgroundColor: theme.colors.onBackground },
            contentStyle,
          ]}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  content: { flex: 1 },
});

export default Wrapper;
