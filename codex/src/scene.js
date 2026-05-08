import {
  BRICK_D,
  BRICK_H,
  BRICK_W,
  CAMERA,
  COLS,
  COLORS,
  ENVIRONMENT_SPLAT,
  FLOOR_Y,
  GAP_X,
  GAP_Y,
  ROW1_Y,
  ROWS,
  WALL_Z
} from './config.js';

export function makeMat(hex, opacity) {
  const mat = new pc.StandardMaterial();
  mat.diffuse.set(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255);
  mat.roughness = 0.86;
  mat.metalness = 0;
  if (opacity !== undefined && opacity < 1) {
    mat.opacity = opacity;
    mat.blendType = pc.BLEND_NORMAL;
    mat.depthWrite = false;
  }
  mat.update();
  return mat;
}

export function createScene(app) {
  const stageEntity = new pc.Entity('stage');
  app.root.addChild(stageEntity);

  const cameraEntity = new pc.Entity('camera');
  cameraEntity.addComponent('camera', {
    clearColor: new pc.Color(0.54, 0.76, 0.84, 1),
    fov: 58,
    nearClip: 0.1,
    farClip: 100
  });
  app.root.addChild(cameraEntity);

  const orbit = {
    yaw: CAMERA.yaw,
    pitch: CAMERA.pitch,
    radius: CAMERA.radius,
    active: false,
    lastX: 0,
    lastY: 0
  };

  function applyOrbit() {
    const wallCY = ROW1_Y + (ROWS - 1) * (BRICK_H + GAP_Y) * 0.5;
    const target = new pc.Vec3(0, wallCY * 0.63, WALL_Z * 0.48);
    const yR = orbit.yaw * pc.math.DEG_TO_RAD;
    const pR = orbit.pitch * pc.math.DEG_TO_RAD;
    cameraEntity.setPosition(
      target.x + orbit.radius * Math.sin(yR) * Math.cos(pR),
      target.y + orbit.radius * Math.sin(pR),
      target.z + orbit.radius * Math.cos(yR) * Math.cos(pR)
    );
    cameraEntity.lookAt(target);
  }

  const ambient = new pc.Entity('ambient');
  ambient.addComponent('light', {
    type: 'omni',
    color: new pc.Color(0.96, 0.95, 0.91),
    intensity: 0.5,
    castShadows: false,
    range: 200
  });
  app.root.addChild(ambient);

  const dirLight = new pc.Entity('dirLight');
  dirLight.addComponent('light', {
    type: 'directional',
    color: new pc.Color(1, 1, 1),
    intensity: 0.92,
    castShadows: true,
    shadowResolution: 1024,
    shadowBias: 0.1,
    normalOffsetBias: 0.06
  });
  dirLight.setEulerAngles(45, -30, 0);
  app.root.addChild(dirLight);

  const rimLight = new pc.Entity('rimLight');
  rimLight.addComponent('light', {
    type: 'directional',
    color: new pc.Color(0.72, 0.78, 0.85),
    intensity: 0.3,
    castShadows: false
  });
  rimLight.setEulerAngles(-30, 150, 0);
  app.root.addChild(rimLight);

  const floorEntity = new pc.Entity('floor');
  floorEntity.addComponent('model', { type: 'plane' });
  floorEntity.model.meshInstances[0].material = makeMat(COLORS.floor);
  floorEntity.model.meshInstances[0].castShadow = false;
  floorEntity.setLocalScale(20, 1, 20);
  floorEntity.setPosition(0, FLOOR_Y, 0);
  floorEntity.enabled = !ENVIRONMENT_SPLAT.hideGameFloor;
  stageEntity.addChild(floorEntity);

  const ring = new pc.Entity('ring');
  ring.addComponent('model', { type: 'cylinder' });
  ring.model.meshInstances[0].material = makeMat(COLORS.ring, 0.15);
  ring.model.meshInstances[0].castShadow = false;
  ring.setLocalScale(2.84, 0.005, 2.84);
  ring.setPosition(0, FLOOR_Y + 0.01, WALL_Z);
  ring.enabled = !ENVIRONMENT_SPLAT.hideBoundaryRing;
  stageEntity.addChild(ring);

  const wallW = COLS * (BRICK_W + GAP_X) + 0.4;
  const wallH = ROWS * (BRICK_H + GAP_Y) + 0.15;
  const wallBackdrop = new pc.Entity('wallBackdrop');
  wallBackdrop.addComponent('model', { type: 'plane' });
  wallBackdrop.model.meshInstances[0].material = makeMat(COLORS.wall, 0.62);
  wallBackdrop.model.meshInstances[0].castShadow = false;
  wallBackdrop.setEulerAngles(90, 0, 0);
  wallBackdrop.setLocalScale(wallW, 1, wallH);
  wallBackdrop.setPosition(0, ROW1_Y + (ROWS - 1) * (BRICK_H + GAP_Y) * 0.5, WALL_Z - BRICK_D * 0.6);
  wallBackdrop.enabled = !ENVIRONMENT_SPLAT.hideWallBackdrop;
  stageEntity.addChild(wallBackdrop);

  const arReticleEntity = new pc.Entity('arReticle');
  arReticleEntity.addComponent('model', { type: 'cylinder' });
  arReticleEntity.model.meshInstances[0].material = makeMat(COLORS.reticle, 0.85);
  arReticleEntity.model.meshInstances[0].castShadow = false;
  arReticleEntity.setLocalScale(0.22, 0.01, 0.22);
  arReticleEntity.enabled = false;
  app.root.addChild(arReticleEntity);

  applyOrbit();

  function setGameSurfacesVisible(visible) {
    floorEntity.enabled = visible && !ENVIRONMENT_SPLAT.hideGameFloor;
    ring.enabled = visible && !ENVIRONMENT_SPLAT.hideBoundaryRing;
    wallBackdrop.enabled = visible && !ENVIRONMENT_SPLAT.hideWallBackdrop;
  }

  function resetStageTransform() {
    stageEntity.setLocalPosition(0, 0, 0);
    stageEntity.setLocalEulerAngles(0, 0, 0);
    stageEntity.setLocalScale(1, 1, 1);
  }

  return {
    app,
    stageEntity,
    cameraEntity,
    floorEntity,
    arReticleEntity,
    orbit,
    applyOrbit,
    makeMat,
    setGameSurfacesVisible,
    resetStageTransform
  };
}
