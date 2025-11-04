# Delivery Route Navigator

A delivery-route navigation app for drivers. Add your stops, optimize the order, then run the route one stop at a time, marking each as delivered or canceled as you go.

Built with [Expo](https://expo.dev) and [Mapbox](https://www.mapbox.com/).

## Features

- **Stop search:** address autocomplete powered by the Mapbox Geocoding API, biased to your current location.
- **Route optimization:** order stops `Close → Far` or `Far → Close` using the Mapbox Optimized Trips API.
- **Turn-by-turn legs:** navigate to the active stop with a dashed route line and a tilted, follow-me camera.
- **Delivery tracking:** automatic proximity detection (within 100 m) reveals the delivered / canceled actions for the current stop.
- **Reorder & edit:** drag to reorder stops, rename the active stop, and refresh to start over.
- **Map styles:** switch between Streets and Satellite.
- **Local auth:** email/password sign-up and login stored on-device via Expo SecureStore.

## Tech stack

- **Expo SDK 54** with [expo-router](https://docs.expo.dev/router/introduction) (file-based routing, typed routes, React Compiler)
- **React Native 0.81 / React 19** (new architecture enabled)
- **[react-native-paper](https://callstack.github.io/react-native-paper/)** for Material UI and theming
- **[@rnmapbox/maps](https://github.com/rnmapbox/maps)** for the map and Mapbox APIs
- **expo-location**, **expo-secure-store**, **react-native-draggable-flatlist**
- **TypeScript** (strict)

## Getting started

### Prerequisites

- Node.js and [Yarn](https://yarnpkg.com/)
- A [Mapbox](https://account.mapbox.com/) account with a public token and a downloads token
- A development build is required; `@rnmapbox/maps` does not run in Expo Go.

### 1. Install dependencies

```bash
yarn install
```

### 2. Configure environment

Create a `.env` file in the project root:

```bash
APP_ENV=development
MAPBOX_PUBLIC_TOKEN=pk.your_public_token
MAPBOX_DOWNLOADS_TOKEN=sk.your_secret_downloads_token
```

- `MAPBOX_PUBLIC_TOKEN` is read at runtime (geocoding, directions, optimization).
- `MAPBOX_DOWNLOADS_TOKEN` is used by the `@rnmapbox/maps` config plugin to fetch the native SDK at build time.

### 3. Run

```bash
yarn start        # start the dev server
yarn android      # build & run on Android
yarn ios          # build & run on iOS
yarn web          # run in the browser
```

## Scripts

| Command | Description |
| --- | --- |
| `yarn start` | Start the Expo dev server |
| `yarn android` | Run on an Android device/emulator |
| `yarn ios` | Run on an iOS simulator/device |
| `yarn web` | Run the web build |
| `yarn lint` | Lint the project with ESLint |

## Project structure

```
src/
  app/                 Expo Router routes (thin wrappers around screens)
    (auth)/            login, signup
    (main)/            map
    _layout.tsx        Providers (Paper, Auth, SafeArea) + Slot
    index.tsx          Landing screen
  screen/              Screen implementations
    auth/  main/
  components/
    layout/            Wrapper
    ui/                CurrentMarker, StopMarker
  contexts/            AuthContext
  lib/                 constant, helper (geo math + Mapbox fetches), storage
  types/               Shared types
```

Path alias `@/*` resolves to `src/*`.

## Builds

EAS Build profiles are defined in [`eas.json`](./eas.json): `development`, `ios-simulator`, `preview`, and `production`.

```bash
eas build --profile development --platform android
```
