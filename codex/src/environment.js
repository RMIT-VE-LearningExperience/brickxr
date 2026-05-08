import { ENVIRONMENT_SPLAT } from './config.js';

export function loadEnvironmentSplat({ app, scene, ui }) {
  const controller = {
    entity: null,
    loaded: false,
    setVisible(visible) {
      if (this.entity) this.entity.enabled = visible && this.loaded;
    }
  };

  if (!ENVIRONMENT_SPLAT.enabled || !app.assets?.loadFromUrl) return controller;

  const entity = new pc.Entity('environmentSplat');
  entity.enabled = false;
  controller.entity = entity;
  scene.stageEntity.addChild(entity);

  ui.showToast('Loading skatepark environment...', 1800);

  app.assets.loadFromUrl(ENVIRONMENT_SPLAT.url, 'gsplat', (err, asset) => {
    if (err || !asset) {
      console.warn('Could not load Gaussian splat environment:', err);
      ui.showToast('Environment could not load. Game is still playable.', 2600);
      entity.destroy();
      return;
    }

    entity.addComponent('gsplat', {
      asset
    });
    entity.setLocalPosition(
      ENVIRONMENT_SPLAT.position.x,
      ENVIRONMENT_SPLAT.position.y,
      ENVIRONMENT_SPLAT.position.z
    );
    entity.setLocalEulerAngles(
      ENVIRONMENT_SPLAT.rotation.x,
      ENVIRONMENT_SPLAT.rotation.y,
      ENVIRONMENT_SPLAT.rotation.z
    );
    entity.setLocalScale(ENVIRONMENT_SPLAT.scale, ENVIRONMENT_SPLAT.scale, ENVIRONMENT_SPLAT.scale);
    controller.loaded = true;
    entity.enabled = true;

    if (entity.gsplat && 'unified' in entity.gsplat) {
      entity.gsplat.unified = true;
    }

    window.brickxrEnvironment = {
      entity,
      logTransform() {
        const p = entity.getLocalPosition();
        const r = entity.getLocalEulerAngles();
        const s = entity.getLocalScale();
        console.log({
          position: { x: Number(p.x.toFixed(3)), y: Number(p.y.toFixed(3)), z: Number(p.z.toFixed(3)) },
          rotation: { x: Number(r.x.toFixed(1)), y: Number(r.y.toFixed(1)), z: Number(r.z.toFixed(1)) },
          scale: Number(s.x.toFixed(3))
        });
      },
      set({ position, rotation, scale }) {
        if (position) entity.setLocalPosition(position.x, position.y, position.z);
        if (rotation) entity.setLocalEulerAngles(rotation.x, rotation.y, rotation.z);
        if (scale) entity.setLocalScale(scale, scale, scale);
        this.logTransform();
      }
    };

    ui.showToast('Skatepark environment loaded.', 1800);
  });

  return controller;
}
