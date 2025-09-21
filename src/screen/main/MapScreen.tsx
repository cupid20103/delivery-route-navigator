import MapboxGL from "@rnmapbox/maps";
import Constants from "expo-constants";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  IconButton,
  List,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import CurrentMarker from "@/components/ui/CurrentMarker";
import StopMarker from "@/components/ui/StopMarker";

const MAPBOX_PUBLIC_TOKEN = Constants.expoConfig?.extra?.mapboxPublicToken;

MapboxGL.setAccessToken(MAPBOX_PUBLIC_TOKEN);

type LngLat = [number, number];

type Route = {
  id: string;
  name: string;
  coords: LngLat;
};

type OptimizationTrip = {
  geometry: GeoJSON.LineString;
};

type OptimizationResponse = {
  code: string;
  trips: OptimizationTrip[];
};

const MAP_STYLES = [
  { id: "streets", name: "Streets", url: "mapbox://styles/mapbox/streets-v12" },
  {
    id: "satellite",
    name: "Satellite",
    url: "mapbox://styles/mapbox/satellite-v9",
  },
];

const toRad = (deg: number) => (deg * Math.PI) / 180;

const haversineMeters = (a: LngLat, b: LngLat) => {
  const R = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
};

const MapScreen: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState(MAP_STYLES[0].url);
  const [currentPosition, setCurrentPosition] = useState<LngLat | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeGeoJSON, setRouteGeoJSON] =
    useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const [optimizingMode, setOptimizingMode] = useState<"close" | "far" | null>(
    null
  );
  const [stopInput, setStopInput] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [stopSuggestions, setStopSuggestions] = useState<any[]>([]);
  const [layerDialogVisible, setLayerDialogVisible] = useState(false);

  const theme = useTheme();

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Permission to access location was denied");

        return;
      }

      const loc = await Location.getCurrentPositionAsync({});

      setCurrentPosition([loc.coords.longitude, loc.coords.latitude]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (stopInput.length < 3) {
        setStopSuggestions([]);

        return;
      }

      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            stopInput
          )}.json?access_token=${MAPBOX_PUBLIC_TOKEN}&autocomplete=true&limit=15`
        );

        const data = await res.json();

        const filtered = (data.features || []).filter(
          (item: any) =>
            !routes.some(
              (r) =>
                r.coords[0] === item.center[0] && r.coords[1] === item.center[1]
            )
        );

        setStopSuggestions(filtered);
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    })();
  }, [stopInput]);

  const optimizeRoute = async (mode: "close" | "far") => {
    if (!currentPosition || routes.length === 0) return;

    setOptimizingMode(mode);

    const sorted = [...routes].sort((a, b) => {
      const distA = haversineMeters(currentPosition, a.coords);
      const distB = haversineMeters(currentPosition, b.coords);

      return mode === "close" ? distA - distB : distB - distA;
    });

    const coords = [currentPosition, ...sorted.map((r) => r.coords)]
      .map((c) => `${c[0]},${c[1]}`)
      .join(";");

    try {
      const res = await fetch(
        `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coords}?geometries=geojson&overview=full&source=first&destination=last&roundtrip=false&access_token=${MAPBOX_PUBLIC_TOKEN}`
      );

      const data: OptimizationResponse = await res.json();

      if (data.trips && data.trips.length > 0) {
        setRouteGeoJSON({
          type: "Feature",
          geometry: data.trips[0].geometry,
          properties: {},
        });

        setRoutes(sorted);

        handleClosePanel();
      }
    } catch (err) {
      console.error("Optimization error:", err);
    } finally {
      setOptimizingMode(null);
    }
  };

  const handleSelectStop = (item: any) => {
    const coords: LngLat = item.center;

    setRoutes((prev) => [
      ...prev,
      {
        id: (item.id || Date.now().toString()) as string,
        name: item.place_name,
        coords,
      },
    ]);

    setStopInput("");
    setStopSuggestions([]);

    cameraRef.current?.flyTo(coords, 1000);
  };

  const handleRemoveStop = (id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClosePanel = () => {
    if (showPanel) {
      Keyboard.dismiss();
      inputRef.current?.blur?.();

      setShowPanel(false);
      setStopInput("");
      setStopSuggestions([]);
    }
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        key={selectedStyle}
        styleURL={selectedStyle}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        style={styles.map}
      >
        {currentPosition && (
          <>
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={17}
              centerCoordinate={currentPosition}
              animationMode="flyTo"
              animationDuration={1000}
            />
            <MapboxGL.MarkerView
              id="me"
              coordinate={currentPosition}
              allowOverlap
            >
              <CurrentMarker color={theme.colors.primary} />
            </MapboxGL.MarkerView>
          </>
        )}
        {routes.map((route, idx) => (
          <MapboxGL.MarkerView
            key={route.id}
            id={route.id}
            coordinate={route.coords}
            allowOverlap
          >
            <StopMarker index={idx + 1} color={theme.colors.secondary} />
          </MapboxGL.MarkerView>
        ))}
        {routeGeoJSON && (
          <MapboxGL.ShapeSource id="optimized-route" shape={routeGeoJSON}>
            <MapboxGL.LineLayer
              id="optimized-route-line"
              style={{
                lineWidth: 5,
                lineColor: theme.colors.secondary,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>
      <View
        style={[
          styles.stopInputBar,
          { backgroundColor: theme.colors.background },
        ]}
      >
        {showPanel ? (
          <IconButton icon="chevron-up" size={24} onPress={handleClosePanel} />
        ) : (
          <IconButton icon="menu" size={24} onPress={() => {}} />
        )}

        <TextInput
          ref={inputRef}
          value={stopInput}
          placeholder="Add a stop"
          onChangeText={setStopInput}
          onFocus={() => setShowPanel(true)}
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.stopInputField}
        />
        <IconButton icon="camera" size={24} onPress={() => {}} />
      </View>
      {showPanel && (
        <View
          style={[
            styles.routePanel,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text variant="titleMedium">Route</Text>
            <List.Item
              title="Current location"
              description={
                currentPosition
                  ? `${currentPosition[1].toFixed(
                      5
                    )}, ${currentPosition[0].toFixed(5)}`
                  : "Locating…"
              }
              left={(props) => <List.Icon {...props} icon="crosshairs-gps" />}
              onPress={() => {
                if (currentPosition && cameraRef.current) {
                  cameraRef.current.flyTo(currentPosition, 1000);

                  handleClosePanel();
                }
              }}
            />
            {stopInput.trim().length >= 3 ? (
              <View>
                <Text variant="labelLarge" style={styles.panelTitle}>
                  Suggestions
                </Text>
                {stopSuggestions.length > 0 ? (
                  stopSuggestions.map((item: any) => (
                    <List.Item
                      key={item.id || item.place_name}
                      title={item.place_name}
                      left={(props) => <List.Icon {...props} icon="magnify" />}
                      onPress={() => handleSelectStop(item)}
                    />
                  ))
                ) : (
                  <Text style={styles.panelHint}>No results yet…</Text>
                )}
              </View>
            ) : (
              <View>
                <Text variant="labelLarge" style={styles.panelTitle}>
                  Selected stops
                </Text>
                {routes.length === 0 ? (
                  <Text style={styles.panelHint}>
                    Add a stop to build your route.
                  </Text>
                ) : (
                  routes.map((route) => (
                    <List.Item
                      key={route.id}
                      title={route.name}
                      description={`${route.coords[1].toFixed(
                        5
                      )}, ${route.coords[0].toFixed(5)}`}
                      left={(props) => (
                        <List.Icon {...props} icon="map-marker" />
                      )}
                      right={() => (
                        <IconButton
                          icon="close"
                          onPress={() => handleRemoveStop(route.id)}
                          style={styles.closeIcon}
                        />
                      )}
                      onPress={() => {
                        cameraRef.current?.flyTo(route.coords, 1000);

                        handleClosePanel();
                      }}
                    />
                  ))
                )}
                {routes.length > 0 && (
                  <View style={styles.optimizeGroup}>
                    <Button
                      mode="contained"
                      loading={optimizingMode === "close"}
                      onPress={() => optimizeRoute("close")}
                      style={styles.optimizeBtn}
                    >
                      Optimize (Close→Far)
                    </Button>
                    <Button
                      mode="contained"
                      loading={optimizingMode === "far"}
                      onPress={() => optimizeRoute("far")}
                      style={styles.optimizeBtn}
                    >
                      Optimize (Far→Close)
                    </Button>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}
      <Portal>
        <Modal
          visible={layerDialogVisible}
          onDismiss={() => setLayerDialogVisible(false)}
        >
          <View
            style={[styles.modal, { backgroundColor: theme.colors.background }]}
          >
            <Button onPress={() => setSelectedStyle(MAP_STYLES[0].url)}>
              Default
            </Button>
            <Button onPress={() => setSelectedStyle(MAP_STYLES[1].url)}>
              Satellite
            </Button>
          </View>
        </Modal>
      </Portal>
      <View style={styles.fabContainer}>
        <IconButton
          icon="layers"
          mode="contained"
          onPress={() => setLayerDialogVisible(true)}
        />
        <IconButton
          icon="crosshairs-gps"
          mode="contained"
          onPress={() => {
            if (currentPosition && cameraRef.current)
              cameraRef.current.flyTo(currentPosition, 1000);
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  routeMarker: {
    padding: 8,
    borderRadius: 50,
  },
  currentMarker: {
    padding: 8,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "white",
  },
  pulseCircle: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  stopInputBar: {
    position: "absolute",
    top: 24,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    borderRadius: 50,
    shadowRadius: 12,
    elevation: 6,
  },
  stopInputField: {
    flex: 1,
    paddingHorizontal: 12,
  },
  routePanel: {
    position: "absolute",
    top: 84,
    left: 12,
    right: 12,
    bottom: 12,
    padding: 12,
    borderRadius: 12,
    elevation: 4,
  },
  panelTitle: {
    marginBottom: 6,
    opacity: 0.7,
  },
  panelHint: { opacity: 0.5 },
  closeIcon: { margin: 0 },
  optimizeGroup: {
    flexDirection: "column",
    marginTop: 24,
    gap: 8,
  },
  optimizeBtn: {
    flex: 1,
  },
  modal: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 24,
    marginHorizontal: 64,
    borderRadius: 8,
  },
  fabContainer: {
    position: "absolute",
    flexDirection: "column",
    right: 24,
    bottom: 48,
  },
});

export default MapScreen;
