import React from "react";

export type WrapperProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: object;
  contentStyle?: object;
};

export type CurrentMarkerProps = { color: string };

export type StopMarkerProps = {
  index: number;
  color: string;
};
