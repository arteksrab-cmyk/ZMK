export type Point3 = [number, number, number];

export type Face = {
  points: Point3[];
  fill: string;
  stroke?: string;
};

export type Camera = {
  yaw: number;
  pitch: number;
  zoom: number;
};