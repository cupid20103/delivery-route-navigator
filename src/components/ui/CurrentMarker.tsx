import React from "react";
import { StyleSheet, View } from "react-native";

import { CurrentMarkerProps } from "@/types/component";

const CurrentMarker: React.FC<CurrentMarkerProps> = ({ color }) => {
  return (
    <View style={styles.meWrapper}>
      <View style={styles.meRing}>
        <View style={[styles.meFill, { backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  meWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  meRing: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 16,
  },
  meFill: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});

export default CurrentMarker;
