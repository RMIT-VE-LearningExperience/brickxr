import { XR_CONFIG } from './config.js';

export function createXR({ app, scene, game, ui, audio, environment }) {
  const ctrlRigs = new Map();
  const rayMaterials = new Map();
  let mode = 'desktop';
  let isAR = false;
  let stagePlaced = false;
  let vrGrabData = null;
  let xrInputBound = false;

  function rayMat(state, opacity = 0.72) {
    const hex = XR_CONFIG.ray[state] || XR_CONFIG.ray.neutral;
    const key = `${state}:${hex}:${opacity}`;
    if (!rayMaterials.has(key)) rayMaterials.set(key, scene.makeMat(hex, opacity));
    return rayMaterials.get(key);
  }

  function setRayState(source, state) {
    const rigData = ctrlRigs.get(source);
    if (!rigData?.ray?.model) return;
    rigData.ray.model.meshInstances[0].material = rayMat(state, state === 'holding' ? 0.95 : 0.72);
  }

  function getSourceRay(source) {
    const origin = new pc.Vec3();
    const dir = new pc.Vec3(0, 0, -1);
    try {
      if (source.ray?.origin) {
        origin.copy(source.ray.origin);
        dir.copy(source.ray.direction);
      } else {
        source.getPosition(origin);
        const q = new pc.Quat();
        source.getRotation(q);
        q.transformVector(dir, dir);
      }
    } catch (_) {
      try { source.getPosition(origin); } catch (_2) {}
    }
    return new pc.Ray(origin, dir.normalize());
  }

  function pickWithSource(source) {
    const ray = getSourceRay(source);
    let best = null;
    let bestDist = 1.5;

    for (const brick of game.getState().bricks) {
      if (brick.isPlaced) continue;
      const bp = brick.entity.getPosition();
      const bb = new pc.BoundingBox(bp, new pc.Vec3(brick.brickWidth / 2, 0.0875, 0.1));
      const hit = new pc.Vec3();
      if (bb.intersectsRay(ray, hit)) {
        const dist = ray.origin.distance(hit);
        if (dist < bestDist) {
          bestDist = dist;
          best = brick;
        }
      }
    }

    if (!best) {
      const reach = new pc.Vec3().copy(ray.origin).add(new pc.Vec3().copy(ray.direction).scale(0.9));
      for (const brick of game.getState().bricks) {
        if (brick.isPlaced) continue;
        const dist = brick.entity.getPosition().distance(reach);
        if (dist < 0.35 && dist < bestDist) {
          bestDist = dist;
          best = brick;
        }
      }
    }

    return best;
  }

  function setDesktopMode() {
    mode = 'desktop';
    isAR = false;
    stagePlaced = false;
    vrGrabData = null;
    scene.cameraEntity.camera.clearColor.set(0.54, 0.76, 0.84, 1);
    scene.resetStageTransform();
    scene.setGameSurfacesVisible(true);
    environment?.setVisible(XR_CONFIG.modes.desktop.environmentVisible);
    game.setDropzoneVisualMode(XR_CONFIG.modes.desktop.dropzoneVisualMode);
    game.setWorldDropzonesVisible(true);
    ui.setARControlsVisible(false);
    if (scene.arReticleEntity) scene.arReticleEntity.enabled = false;
    scene.applyOrbit();
  }

  function configureVRStage() {
    const cfg = XR_CONFIG.modes.vr.stage;
    scene.stageEntity.setLocalPosition(cfg.position.x, cfg.position.y, cfg.position.z);
    scene.stageEntity.setLocalEulerAngles(cfg.rotation.x, cfg.rotation.y, cfg.rotation.z);
    scene.stageEntity.setLocalScale(cfg.scale, cfg.scale, cfg.scale);
  }

  function configureModeForSession(nextMode) {
    mode = nextMode;
    isAR = nextMode === 'ar';
    stagePlaced = false;
    game.setDropzoneVisualMode(XR_CONFIG.modes[nextMode].dropzoneVisualMode);
    game.setWorldDropzonesVisible(true);
    environment?.setVisible(XR_CONFIG.modes[nextMode].environmentVisible);
    scene.setGameSurfacesVisible(nextMode === 'vr');

    if (nextMode === 'vr') {
      configureVRStage();
      scene.cameraEntity.camera.clearColor.set(0.54, 0.76, 0.84, 1);
    } else {
      scene.resetStageTransform();
      scene.cameraEntity.camera.clearColor.set(0, 0, 0, 0);
    }
  }

  function setupXRInput() {
    if (!app.xr?.input || xrInputBound) return;
    xrInputBound = true;

    app.xr.input.on('add', source => {
      const rig = new pc.Entity('ctrlRig');

      const handle = new pc.Entity('handle');
      handle.addComponent('model', { type: 'cylinder' });
      handle.model.meshInstances[0].material = scene.makeMat(0xf7f4ea);
      handle.setLocalScale(0.028, 0.055, 0.028);
      handle.setLocalPosition(0, 0, -0.025);
      handle.setLocalEulerAngles(90, 0, 0);
      rig.addChild(handle);

      const ray = new pc.Entity('ray');
      ray.addComponent('model', { type: 'box' });
      ray.model.meshInstances[0].material = rayMat('neutral', 0.65);
      ray.setLocalScale(0.004, 0.004, 1.3);
      ray.setLocalPosition(0, 0, -0.65);
      rig.addChild(ray);

      app.root.addChild(rig);
      ctrlRigs.set(source, { rig, ray });

      source.on('select', () => {
        if (vrGrabData) return;
        const brick = pickWithSource(source);
        if (!brick) return;
        game.beginGrab(brick);
        game.setSelectedBrick(null);
        brick.isGrabbed = true;
        vrGrabData = { brick, source };
        setRayState(source, 'holding');
        audio.grab();
        try { source.gamepad?.hapticActuators?.[0]?.pulse(0.4, 80); } catch (_) {}
      });

      source.on('selectend', () => {
        if (!vrGrabData || vrGrabData.source !== source) return;
        const brick = vrGrabData.brick;
        brick.isGrabbed = false;
        game.releaseSpecificBrick(brick);
        vrGrabData = null;
        setRayState(source, 'neutral');
      });

      source.on('remove', () => {
        const rigData = ctrlRigs.get(source);
        if (!rigData) return;
        rigData.rig.destroy();
        ctrlRigs.delete(source);
      });
    });
  }

  function placeStageAtReticle() {
    if (!scene.arReticleEntity?.enabled) {
      ui.showToast('Aim at the floor first');
      return;
    }

    const arCfg = XR_CONFIG.modes.ar.stage;
    const pos = scene.arReticleEntity.getPosition();
    scene.stageEntity.setPosition(pos.x, pos.y + arCfg.positionYOffset, pos.z);
    const cp = scene.cameraEntity.getPosition();
    scene.stageEntity.setEulerAngles(0, Math.atan2(cp.x - pos.x, cp.z - pos.z) * pc.math.RAD_TO_DEG, 0);
    scene.stageEntity.setLocalScale(arCfg.scale, arCfg.scale, arCfg.scale);
    stagePlaced = true;
    scene.arReticleEntity.enabled = false;
    ui.setARControlsVisible(true);
    ui.showToast('Placed. Start building.');
  }

  function onXRStart() {
    configureModeForSession(mode);
    ui.showToast(isAR ? 'AR active. Tap the floor to place.' : 'VR active.');
  }

  function onXREnd() {
    ctrlRigs.forEach(rigData => rigData.rig.destroy());
    ctrlRigs.clear();
    setDesktopMode();
    ui.showToast('XR session ended.');
  }

  function updateControllerRigs() {
    ctrlRigs.forEach((rigData, source) => {
      const pos = new pc.Vec3();
      const rot = new pc.Quat();
      try {
        source.getPosition(pos);
        source.getRotation(rot);
      } catch (_) {
        return;
      }
      rigData.rig.setPosition(pos);
      rigData.rig.setRotation(rot);
    });
  }

  function updateGrabbedBrick() {
    if (!app.xr?.active || !vrGrabData) return;
    const ray = getSourceRay(vrGrabData.source);
    const groundY = isAR ? scene.stageEntity.getPosition().y : 0;
    if (Math.abs(ray.direction.y) <= 0.0001) return;

    const t = (groundY - ray.origin.y) / ray.direction.y;
    if (t <= 0) return;

    const x = ray.origin.x + ray.direction.x * t;
    const z = ray.origin.z + ray.direction.z * t;
    game.moveGrabbedBrickWorld(vrGrabData.brick, x, z);

    if (game.getNearestSlotForBrick(vrGrabData.brick)) setRayState(vrGrabData.source, 'hoverDropzone');
    else setRayState(vrGrabData.source, 'holding');
  }

  function updateRayHover() {
    if (!app.xr?.active || vrGrabData) return;
    ctrlRigs.forEach((_, source) => {
      setRayState(source, pickWithSource(source) ? 'hoverBrick' : 'neutral');
    });
  }

  function update() {
    updateControllerRigs();
    updateGrabbedBrick();
    updateRayHover();
  }

  function enterMode(nextMode) {
    if (!app.xr?.supported) {
      ui.showToast('WebXR not supported.');
      return;
    }

    const xrType = nextMode === 'ar' ? pc.XRTYPE_AR : pc.XRTYPE_VR;
    if (!app.xr.isAvailable(xrType)) {
      ui.showToast(`${nextMode.toUpperCase()} not available on this device.`);
      if (nextMode === 'ar') ui.showARHint();
      return;
    }

    mode = nextMode;
    configureModeForSession(nextMode);

    app.xr.start(scene.cameraEntity.camera, xrType, pc.XRSPACE_LOCALFLOOR, {
      optionalFeatures: nextMode === 'ar' ? ['hit-test'] : [],
      callback: err => {
        if (err) {
          ui.showToast(`Could not start ${nextMode.toUpperCase()}.`);
          setDesktopMode();
          return;
        }

        setupXRInput();
        if (nextMode === 'ar' && app.xr.hitTest?.supported) {
          app.xr.hitTest.start({
            spaceType: pc.XRSPACE_VIEWER,
            callback: (hitTestErr, source) => {
              if (hitTestErr || !source) return;
              source.on('result', pos => {
                if (stagePlaced) return;
                scene.arReticleEntity.setPosition(pos);
                scene.arReticleEntity.enabled = true;
              });
            }
          });
        }
        if (nextMode === 'ar') ui.showToast('Point at the floor to place the wall.');
      }
    });
  }

  function exitMode() {
    if (app.xr?.active) app.xr.end();
    else setDesktopMode();
  }

  function replaceARStage() {
    stagePlaced = false;
    if (scene.arReticleEntity) scene.arReticleEntity.enabled = false;
    ui.setARControlsVisible(false);
    ui.showToast('Point at the floor to re-place.');
  }

  function rotateStage(deg) {
    const ea = scene.stageEntity.getEulerAngles();
    scene.stageEntity.setEulerAngles(ea.x, ea.y + deg, ea.z);
  }

  function scaleStage(delta) {
    const s = scene.stageEntity.getLocalScale();
    const cfg = XR_CONFIG.modes.ar.stage;
    const next = Math.max(cfg.minScale, Math.min(cfg.maxScale, s.x + delta));
    scene.stageEntity.setLocalScale(next, next, next);
  }

  if (app.xr?.supported) {
    app.xr.on('start', onXRStart);
    app.xr.on('end', onXREnd);
  }

  return {
    startVR: () => enterMode('vr'),
    startAR: () => enterMode('ar'),
    enterMode,
    exitMode,
    update,
    placeStageAtReticle,
    replaceARStage,
    rotateStage,
    scaleStage,
    get isAR() {
      return isAR;
    },
    get stagePlaced() {
      return stagePlaced;
    }
  };
}
