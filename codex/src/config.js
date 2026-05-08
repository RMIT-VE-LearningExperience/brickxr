export const BRICK_W = 0.4;
export const BRICK_H = 0.175;
export const BRICK_D = 0.2;
export const HALF_BRICK_W = BRICK_W / 2;

export const ROWS = 5;
export const COLS = 8;
export const GAP_X = 0.05;
export const GAP_Y = 0.05;
export const ROW1_Y = BRICK_H / 2;
export const WALL_Z = -0.8;
export const FLOOR_Y = -0.5;
export const SNAP_RADIUS = 0.35;
export const SLOT_SURFACE_OFFSET = 0.025;

export const PALETTE = [0xa8bba3, 0xb87c4c, 0xf7f4ea, 0xebd9d1, 0x9db29a, 0xa06e45];

export const COLORS = {
  sky: 0x8ac3d9,
  floor: 0xf7f4ea,
  ink: 0x1b1a17,
  slot: 0x18c7d9,
  slotHot: 0xffd23f,
  slotBad: 0xff4f6d,
  wall: 0xd4c5b0,
  glow: 0x8fa979,
  ring: 0x556b6f,
  reticle: 0x4aa3ff
};

export const CAMERA = {
  yaw: 0,
  pitch: 28,
  radius: 2.55,
  minRadius: 0.85,
  maxRadius: 6
};

export const TIMING = {
  toastMs: 2300,
  nextBrickMs: 620,
  noSnapMs: 220
};

export const SCORING = {
  completeBase: 150,
  quickBonusWindow: 60,
  extraMovePenalty: 8,
  minimumCompleteBonus: 15
};

export const ENVIRONMENT_SPLAT = {
  enabled: true,
  hideGameFloor: true,
  hideBoundaryRing: true,
  hideWallBackdrop: true,
  url: '../gs/scene.sog',
  position: { x: -0.1, y: -0.32, z: -2.35 },
  rotation: { x: 180, y: 0, z: 0 },
  scale: 0.42
};

export const XR_CONFIG = {
  modes: {
    desktop: {
      environmentVisible: true,
      dropzoneVisualMode: 'overlay'
    },
    vr: {
      environmentVisible: true,
      dropzoneVisualMode: 'world',
      stage: {
        position: { x: 0, y: 0, z: -1.15 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1
      }
    },
    ar: {
      environmentVisible: false,
      dropzoneVisualMode: 'world',
      stage: {
        positionYOffset: 0,
        scale: 0.85,
        minScale: 0.35,
        maxScale: 2.2
      }
    }
  },
  ray: {
    neutral: 0xebd9d1,
    hoverBrick: 0x18c7d9,
    holding: 0xffd23f,
    hoverDropzone: 0xffd23f
  }
};
