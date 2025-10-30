import MapboxGL, { UserTrackingMode } from "@rnmapbox/maps";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
import { MAPBOX_PUBLIC_TOKEN } from "@/lib/constant";
import {
  fetchRouteLeg,
  formatDistance,
  formatDuration,
  haversineMeters,
} from "@/lib/helper";
import {
  LngLat,
  OptimizationResponse,
  Route,
  StopStatus,
} from "@/types/screen";

MapboxGL.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const MAP_STYLES = [
  { id: "streets", name: "Streets", url: "mapbox://styles/mapbox/streets-v12" },
  {
    id: "satellite",
    name: "Satellite",
    url: "mapbox://styles/mapbox/satellite-v9",
  },
];

const DELIVERY_RADIUS_METERS = 100;

const MapScreen: React.FC = () => {
  const [selectedStyle, setSelectedStyle] = useState(MAP_STYLES[0].url);
  const [currentPosition, setCurrentPosition] = useState<LngLat | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeGeoJSON, setRouteGeoJSON] =
    useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);

  const [optimizingMode, setOptimizingMode] = useState<"close" | "far" | null>(
    null
  );
  const [stopInput, setStopInput] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [stopSuggestions, setStopSuggestions] = useState<any[]>([]);
  const [currentStopDialogVisible, setCurrentStopDialogVisible] =
    useState(false);
  const [editedStopName, setEditedStopName] = useState("");
  const [layerDialogVisible, setLayerDialogVisible] = useState(false);

  const [isNavigating, setIsNavigating] = useState(false);
  const [isNearStop, setIsNearStop] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [nextLegGeo, setNextLegGeo] =
    useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);

  const theme = useTheme();

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.warn("Permission to access location was denied");

        return;
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (stopInput.length < 3) {
        setStopSuggestions([]);

        return;
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            stopInput
          )}.json?` +
            new URLSearchParams({
              access_token: MAPBOX_PUBLIC_TOKEN ?? "",
              autocomplete: "true",
              limit: "15",
              language: "en",
              country: "us",
              ...(currentPosition && {
                proximity: `${currentPosition[0]},${currentPosition[1]}`,
              }),
            })
        );

        const data = await response.json();

        const uniqueSuggestions = (data.features || []).filter(
          (item: any) =>
            !routes.some(
              (stop) =>
                stop.coords[0] === item.center[0] &&
                stop.coords[1] === item.center[1]
            )
        );

        setStopSuggestions(uniqueSuggestions);
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    })();
  }, [stopInput]);

  const reverseGeocode = async (coords: LngLat) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?` +
          new URLSearchParams({
            access_token: MAPBOX_PUBLIC_TOKEN ?? "",
            limit: "1",
            language: "en",
            country: "us",
          }).toString()
      );

      const result = await response.json();
      const feature = result?.features?.[0];

      if (!feature) return;

      let label = feature.text as string;

      const houseNumber = feature.address || feature.properties?.address;

      if (feature.place_type?.includes("address") && houseNumber)
        label = `${houseNumber} ${feature.text}`;

      const context: Array<{ id: string; text: string }> =
        feature.context ?? [];

      const neighborhood = context.find((c) =>
        c.id.startsWith("neighborhood")
      )?.text;

      const city =
        context.find((c) => c.id.startsWith("place"))?.text ||
        context.find((c) => c.id.startsWith("locality"))?.text;

      if (neighborhood) label = `${label}, ${neighborhood}`;
      else if (city) label = `${label}, ${city}`;

      setCurrentAddress(label);
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    }
  };

  const optimizeRoute = async (mode: "close" | "far") => {
    if (!currentPosition || routes.length === 0) return;

    setOptimizingMode(mode);

    const sortedStops = [...routes].sort((a, b) => {
      const distA = haversineMeters(currentPosition, a.coords);
      const distB = haversineMeters(currentPosition, b.coords);

      return mode === "close" ? distA - distB : distB - distA;
    });

    const coordsQuery = [currentPosition, ...sortedStops.map((r) => r.coords)]
      .map((c) => `${c[0]},${c[1]}`)
      .join(";");

    try {
      const response = await fetch(
        `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordsQuery}?geometries=geojson&overview=full&source=first&destination=last&roundtrip=true&access_token=${MAPBOX_PUBLIC_TOKEN}`
      );

      const data: OptimizationResponse = await response.json();

      if (data.trips && data.trips.length > 0) {
        setRouteGeoJSON({
          type: "Feature",
          geometry: data.trips[0].geometry,
          properties: {},
        });

        const enrichedStops: Route[] = [];

        let previousPoint = currentPosition;

        for (const stop of sortedStops) {
          const segment = await fetchRouteLeg(previousPoint, stop.coords);

          enrichedStops.push({
            ...stop,
            distance: segment.distance,
            duration: segment.duration,
            status: "pending",
          });

          previousPoint = stop.coords;
        }

        setRoutes(enrichedStops);
      }
    } catch (err) {
      console.error("Optimization error:", err);
    } finally {
      setOptimizingMode(null);
    }
  };

  const handleSelectStop = async (item: any) => {
    const coords: LngLat = item.center;

    let segment: { distance?: number; duration?: number } = {};

    if (routes.length > 0) {
      segment = await fetchRouteLeg(routes[routes.length - 1].coords, coords);
    } else if (currentPosition) {
      segment = await fetchRouteLeg(currentPosition, coords);
    }

    setRoutes((prevStops) => [
      ...prevStops,
      {
        id: (item.id || Date.now().toString()) as string,
        name: item.place_name,
        coords,
        distance: segment.distance,
        duration: segment.duration,
      },
    ]);

    setStopInput("");
    setStopSuggestions([]);
  };

  const handleRemoveStop = (id: string) => {
    setRoutes((prevStops) => prevStops.filter((stop) => stop.id !== id));
  };

  const getNextPendingIndex = (from = 0) =>
    routes.findIndex(
      (r, idx) => idx >= from && (r.status ?? "pending") === "pending"
    );

  const startTrip = async () => {
    if (!currentPosition || routes.length === 0) return;

    const idx = getNextPendingIndex(0);

    if (idx === -1) return;

    setIsNavigating(true);
    setActiveIndex(idx);

    try {
      const coordsQuery = `${currentPosition[0]},${currentPosition[1]};${routes[idx].coords[0]},${routes[idx].coords[1]}`;

      const response = await fetch(
        `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordsQuery}?geometries=geojson&overview=full&source=first&destination=last&roundtrip=false&steps=true&access_token=${MAPBOX_PUBLIC_TOKEN}`
      );

      const data = await response.json();
      const trip = data?.trips?.[0];

      if (trip?.geometry) {
        setNextLegGeo({
          type: "Feature",
          geometry: trip.geometry,
          properties: {},
        });

        cameraRef.current?.setCamera({
          pitch: 60,
          zoomLevel: 17,
          animationDuration: 500,
        });
      }
    } catch (err) {
      console.error("StartTrip optimization error:", err);
    }
  };

  const completeCurrentStop = async (status: StopStatus) => {
    if (activeIndex == null) return;

    setRoutes((prev) =>
      prev.map((s, i) => (i === activeIndex ? { ...s, status } : s))
    );

    const nextIdx = getNextPendingIndex(activeIndex + 1);

    if (nextIdx === -1) {
      setIsNavigating(false);
      setActiveIndex(null);
      setNextLegGeo(null);

      cameraRef.current?.setCamera({
        pitch: 0,
        heading: 0,
        animationDuration: 500,
      });

      return;
    }

    setActiveIndex(nextIdx);

    try {
      const coordsQuery = `${routes[activeIndex].coords[0]},${routes[activeIndex].coords[1]};${routes[nextIdx].coords[0]},${routes[nextIdx].coords[1]}`;

      const response = await fetch(
        `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordsQuery}?geometries=geojson&overview=full&source=first&destination=last&roundtrip=false&steps=true&access_token=${MAPBOX_PUBLIC_TOKEN}`
      );

      const data = await response.json();
      const trip = data?.trips?.[0];

      if (trip?.geometry) {
        setNextLegGeo({
          type: "Feature",
          geometry: trip.geometry,
          properties: {},
        });
      }
    } catch (err) {
      console.error("Next leg optimization error:", err);
    }
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

  const handleRefresh = async () => {
    setRoutes([]);
    setRouteGeoJSON(null);
    setOptimizingMode(null);
    setIsNavigating(false);
    setIsNearStop(false);
    setActiveIndex(null);
    setNextLegGeo(null);

    if (showPanel) {
      Keyboard.dismiss();
      inputRef.current?.blur?.();
      setShowPanel(false);
      setStopInput("");
      setStopSuggestions([]);
    }

    if (currentPosition && cameraRef.current) {
      setIsFollowing(false);

      cameraRef.current.setCamera({
        centerCoordinate: currentPosition,
        zoomLevel: 17,
        pitch: 0,
        heading: 0,
        animationDuration: 500,
      });

      await reverseGeocode(currentPosition);

      setTimeout(() => setIsFollowing(true), 1000);
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          const next: LngLat = [loc.coords.longitude, loc.coords.latitude];

          setCurrentPosition(next);

          await reverseGeocode(next);

          cameraRef.current?.setCamera({
            centerCoordinate: next,
            zoomLevel: 17,
            pitch: 0,
            heading: 0,
            animationDuration: 500,
          });
        }
      } catch (err) {
        console.warn("Refresh location fetch failed:", err);
      }
    }
  };

  const openCurrentStopDialog = () => {
    if (activeIndex == null) return;

    setEditedStopName(routes[activeIndex]?.name || "");
    setCurrentStopDialogVisible(true);
  };

  const handleSaveStopName = () => {
    if (activeIndex == null) return;

    setRoutes((prev) =>
      prev.map((r, i) =>
        i === activeIndex ? { ...r, name: editedStopName.trim() || r.name } : r
      )
    );
    setCurrentStopDialogVisible(false);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <MapboxGL.MapView
        key={selectedStyle}
        styleURL={selectedStyle}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        style={styles.map}
      >
        <MapboxGL.UserLocation
          visible={false}
          onUpdate={(pos) => {
            if (!pos?.coords) return;

            const next: LngLat = [pos.coords.longitude, pos.coords.latitude];
            setCurrentPosition(next);
            reverseGeocode(next);

            if (isNavigating && activeIndex != null && routes[activeIndex]) {
              const currentStop = routes[activeIndex];
              const distance = haversineMeters(next, currentStop.coords);

              if (distance < DELIVERY_RADIUS_METERS) {
                if (!isNearStop) setIsNearStop(true);
              } else {
                if (isNearStop) setIsNearStop(false);
              }
            } else if (isNearStop) {
              setIsNearStop(false);
            }
          }}
        />
        <MapboxGL.Camera
          ref={cameraRef}
          followUserLocation={isFollowing}
          followUserMode={UserTrackingMode.Follow}
          followZoomLevel={17}
        />
        {currentPosition && (
          <MapboxGL.MarkerView
            id="me"
            coordinate={currentPosition}
            allowOverlap
          >
            <CurrentMarker color={theme.colors.primary} />
          </MapboxGL.MarkerView>
        )}
        {routes.map((route, idx) => (
          <MapboxGL.MarkerView
            key={route.id}
            id={route.id}
            coordinate={route.coords}
            allowOverlap
          >
            <View style={{ opacity: route.status === "pending" ? 1 : 0.5 }}>
              <StopMarker index={idx + 1} color={theme.colors.secondary} />
            </View>
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
                lineOpacity: 0.5,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
        {nextLegGeo && (
          <MapboxGL.ShapeSource id="next-leg" shape={nextLegGeo}>
            <MapboxGL.LineLayer
              id="next-leg-line"
              style={{
                lineWidth: 5,
                lineColor: theme.colors.primary,
                lineJoin: "round",
                lineCap: "round",
                lineDasharray: [1.5, 1.5],
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
        <IconButton icon="refresh" size={24} onPress={handleRefresh} />
      </View>
      {showPanel && (
        <View
          style={[
            styles.routePanel,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <Text variant="titleMedium">Route</Text>
          <List.Item
            title="Current location"
            description={currentAddress || "Locating…"}
            left={(props) => <List.Icon {...props} icon="crosshairs-gps" />}
          />
          {stopInput.trim().length >= 3 ? (
            <View style={{ flex: 1 }}>
              <FlatList
                data={stopSuggestions}
                keyExtractor={(item) => item.id || item.place_name}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                renderItem={({ item }) => (
                  <List.Item
                    title={item.place_name}
                    left={(props) => <List.Icon {...props} icon="magnify" />}
                    onPress={() => handleSelectStop(item)}
                  />
                )}
              />
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
                <View style={{ maxHeight: 250 }}>
                  <DraggableFlatList
                    keyExtractor={(item) => item.id}
                    data={routes}
                    renderItem={({
                      item,
                      drag,
                      isActive,
                    }: RenderItemParams<Route>) => (
                      <List.Item
                        title={item.name}
                        description={`${formatDuration(
                          item.duration
                        )} • ${formatDistance(item.distance)}`}
                        left={(props) => (
                          <List.Icon
                            {...props}
                            icon={
                              item.status === "delivered"
                                ? "check-circle"
                                : item.status === "canceled"
                                ? "close-circle"
                                : "map-marker"
                            }
                          />
                        )}
                        right={() => (
                          <View style={styles.panelAction}>
                            <IconButton
                              icon="close"
                              disabled={isNavigating}
                              onPress={() => handleRemoveStop(item.id)}
                              style={styles.panelIcon}
                            />
                            <IconButton
                              icon="drag"
                              disabled={isNavigating}
                              onLongPress={drag}
                              style={styles.panelIcon}
                            />
                          </View>
                        )}
                        style={[
                          styles.panelItem,
                          {
                            backgroundColor: isActive
                              ? theme.colors.surfaceVariant
                              : "transparent",
                          },
                        ]}
                      />
                    )}
                    onDragEnd={({ data }) => setRoutes(data)}
                    scrollEnabled={true}
                  />
                </View>
              )}
              {routes.length > 0 && (
                <View style={styles.optimizeGroup}>
                  <Button
                    mode="contained"
                    loading={optimizingMode === "close"}
                    disabled={isNavigating}
                    onPress={() => optimizeRoute("close")}
                    style={styles.optimizeBtn}
                  >
                    Close→Far
                  </Button>
                  <Button
                    mode="contained"
                    loading={optimizingMode === "far"}
                    disabled={isNavigating}
                    onPress={() => optimizeRoute("far")}
                    style={styles.optimizeBtn}
                  >
                    Far→Close
                  </Button>
                </View>
              )}
            </View>
          )}
        </View>
      )}
      {routes.length > 0 && !showPanel && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={isNavigating ? openCurrentStopDialog : undefined}
          style={[
            styles.tripCard,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.tripContent}>
            <Text style={styles.tripTitle}>
              {isNavigating && activeIndex != null
                ? `${currentAddress ?? "Current"} → ${
                    routes[activeIndex]?.name ?? "Next"
                  }`
                : currentAddress ?? "Current location"}
            </Text>
            {isNavigating && activeIndex != null && (
              <Text style={styles.tripLabel}>
                {`${formatDuration(
                  routes[activeIndex]?.duration
                )} • ${formatDistance(routes[activeIndex]?.distance)}`}
              </Text>
            )}
          </View>
          {!isNavigating ? (
            <Button
              mode="contained"
              onPress={startTrip}
              disabled={
                !currentPosition || routes.every((r) => r.status !== "pending")
              }
            >
              Start Go
            </Button>
          ) : (
            isNearStop && (
              <View>
                <IconButton
                  icon="check"
                  mode="contained"
                  onPress={() => completeCurrentStop("delivered")}
                />
                <IconButton
                  icon="close"
                  mode="contained"
                  onPress={() => completeCurrentStop("canceled")}
                />
              </View>
            )
          )}
        </TouchableOpacity>
      )}
      <Portal>
        <Modal
          visible={currentStopDialogVisible}
          onDismiss={() => setCurrentStopDialogVisible(false)}
          contentContainerStyle={[
            styles.stopModalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          {activeIndex != null && routes[activeIndex] && (
            <View>
              <Text variant="titleMedium" style={{ marginBottom: 8 }}>
                Edit Target Stop
              </Text>
              <TextInput
                label="Stop Name"
                mode="outlined"
                value={editedStopName}
                onChangeText={setEditedStopName}
                style={{ marginBottom: 12 }}
              />
              <Text style={{ opacity: 0.7, marginBottom: 8 }}>
                {`Estimated: ${formatDuration(
                  routes[activeIndex].duration
                )} • ${formatDistance(routes[activeIndex].distance)}`}
              </Text>
              <View style={styles.stopModalActions}>
                <Button mode="contained" onPress={handleSaveStopName}>
                  Save
                </Button>
                <Button
                  mode="outlined"
                  textColor={theme.colors.error}
                  onPress={() => setCurrentStopDialogVisible(false)}
                >
                  Cancel
                </Button>
              </View>
            </View>
          )}
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
            if (currentPosition && cameraRef.current) {
              setIsFollowing(false);

              cameraRef.current.flyTo(currentPosition, 500);

              setTimeout(() => setIsFollowing(true), 1000);
            }
          }}
        />
      </View>
      <Portal>
        <Modal
          visible={layerDialogVisible}
          onDismiss={() => setLayerDialogVisible(false)}
          contentContainerStyle={[
            styles.mapModalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.mapModalActions}>
            <Button onPress={() => setSelectedStyle(MAP_STYLES[0].url)}>
              Default
            </Button>
            <Button onPress={() => setSelectedStyle(MAP_STYLES[1].url)}>
              Satellite
            </Button>
          </View>
        </Modal>
      </Portal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
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
  panelTitle: { marginBottom: 6, opacity: 0.7 },
  panelHint: { opacity: 0.5 },
  panelItem: { borderRadius: 8 },
  panelAction: { flexDirection: "row", alignItems: "center" },
  panelIcon: { margin: 0 },
  optimizeGroup: { flexDirection: "row", gap: 8, marginTop: 24 },
  optimizeBtn: { flex: 1 },
  tripCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 12,
    borderRadius: 12,
    elevation: 6,
  },
  tripContent: { flex: 1 },
  tripTitle: { fontWeight: "700", marginBottom: 4 },
  tripLabel: { opacity: 0.5, fontSize: 12 },
  stopModalContainer: {
    margin: 24,
    padding: 16,
    borderRadius: 12,
    elevation: 6,
  },
  stopModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  fabContainer: {
    position: "absolute",
    flexDirection: "column",
    top: 100,
    right: 24,
  },
  mapModalContainer: {
    margin: 36,
    padding: 16,
    borderRadius: 12,
    elevation: 6,
  },
  mapModalActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
});

export default MapScreen;
