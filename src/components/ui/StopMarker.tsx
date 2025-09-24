import { StyleSheet, Text, View } from "react-native";

import { StopMarkerProps } from "@/types/component";

const StopMarker: React.FC<StopMarkerProps> = ({ index, color }) => {
  return (
    <View style={[styles.markerOuter, { borderColor: color }]}>
      <View style={[styles.markerInner, { backgroundColor: color }]}>
        <Text style={styles.markerText}>{index}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  markerOuter: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 2,
    borderRadius: 18,
  },
  markerInner: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  markerText: {
    color: "white",
  },
});

export default StopMarker;
