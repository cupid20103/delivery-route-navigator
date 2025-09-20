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

const MAP_STYLES = [
  { id: "streets", name: "Streets", url: "mapbox://styles/mapbox/streets-v12" },
  {
    id: "satellite",
    name: "Satellite",
    url: "mapbox://styles/mapbox/satellite-v9",
  },
];

const MapScreen: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState(MAP_STYLES[0].url);
  const [currentPosition, setCurrentPosition] = useState<LngLat | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeGeoJSON, setRouteGeoJSON] =
    useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const [stopInput, setStopInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [stopSuggestions, setStopSuggestions] = useState<any[]>([]);
  const [layerDialogVisible, setLayerDialogVisible] = useState(false);

  const theme = useTheme();

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const inputRef = useRef<any>(null);

  const showRoutePanel = inputFocused || stopInput.trim().length > 0;
  const isSearching = stopInput.trim().length >= 3;

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

        setStopSuggestions(data.features || []);
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    })();
  }, [stopInput]);

  useEffect(() => {
    (async () => {
      if (!currentPosition || routes.length === 0) {
        setRouteGeoJSON(null);

        return;
      }

      const coords = [currentPosition, ...routes.map((r) => r.coords)]
        .map((c) => `${c[0]},${c[1]}`)
        .join(";");

      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_PUBLIC_TOKEN}`
        );

        const data = await res.json();

        if (data.routes && data.routes.length > 0)
          setRouteGeoJSON(data.routes[0].geometry);
      } catch (err) {
        console.error("Directions error:", err);
      }
    })();
  }, [currentPosition, routes]);

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

  const handleClostPanel = () => {
    if (inputFocused || stopInput.trim().length > 0) {
      Keyboard.dismiss();
      inputRef.current?.blur?.();

      setInputFocused(false);
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
        onPress={handleClostPanel}
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
              key="me"
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
          <MapboxGL.ShapeSource id="street-route" shape={routeGeoJSON}>
            <MapboxGL.LineLayer
              id="street-route-line"
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
        <IconButton icon="menu" size={24} onPress={() => {}} />
        <TextInput
          ref={inputRef}
          value={stopInput}
          placeholder="Add a stop"
          onChangeText={setStopInput}
          onFocus={() => setInputFocused(true)}
          onBlur={() => {
            if (stopInput.trim().length === 0) setInputFocused(false);
          }}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={styles.stopInputField}
        />
        <IconButton icon="camera" size={24} onPress={() => {}} />
      </View>
      {showRoutePanel && (
        <View
          style={[
            styles.routePanel,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.panelHeader}>
              <Text variant="titleMedium">Route</Text>
              <IconButton
                icon="close"
                onPress={handleClostPanel}
                accessibilityLabel="Close panel"
                hitSlop={8}
                style={styles.closeIcon}
              />
            </View>
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
                  handleClostPanel();
                }
              }}
              style={styles.panelItem}
            />
            {isSearching ? (
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
                      style={styles.panelItem}
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
                        handleClostPanel();
                      }}
                      style={styles.panelItem}
                    />
                  ))
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
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: {
    marginBottom: 6,
    opacity: 0.7,
  },
  panelHint: { opacity: 0.5 },
  panelItem: { borderRadius: 8 },
  closeIcon: { margin: 0 },
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
