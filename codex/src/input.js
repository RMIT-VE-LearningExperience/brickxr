import { CAMERA } from './config.js';

export function createInput({ app, canvas, scene, game, ui, xr }) {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  let mobileLookMode = false;
  let activePointerId = null;
  let lastTouchX = 0;
  let lastTouchY = 0;

  ui.setLookVisible(isMobile);
  ui.setLookMode(false);

  function toggleLookMode() {
    mobileLookMode = !mobileLookMode;
    ui.setLookMode(mobileLookMode);
    ui.showToast(mobileLookMode ? 'Look mode on' : 'Build mode on', 1200);
  }

  if (app.mouse) {
    app.mouse.on(pc.EVENT_MOUSEDOWN, event => {
      if (event.button === pc.MOUSEBUTTON_RIGHT) {
        scene.orbit.active = true;
        scene.orbit.lastX = event.x;
        scene.orbit.lastY = event.y;
      }

      if (event.button === pc.MOUSEBUTTON_LEFT && !isMobile) {
        const brick = game.pickBrickFromScreen(event.x, event.y);
        if (brick) game.beginGrab(brick, { x: event.x, y: event.y });
      }
    });

    app.mouse.on(pc.EVENT_MOUSEMOVE, event => {
      if (scene.orbit.active) {
        scene.orbit.yaw -= (event.dx || 0) * 0.4;
        scene.orbit.pitch = Math.max(5, Math.min(80, scene.orbit.pitch - (event.dy || 0) * 0.4));
        scene.applyOrbit();
      }

      const state = game.getState();
      if (state.selectedBrick) {
        game.moveGrabbedToGroundHit(game.screenToGround(event.x, event.y));
      }
    });

    app.mouse.on(pc.EVENT_MOUSEUP, event => {
      if (event.button === pc.MOUSEBUTTON_RIGHT) scene.orbit.active = false;
      if (event.button === pc.MOUSEBUTTON_LEFT) game.releaseGrabbedBrick();
    });

    canvas.addEventListener('wheel', event => {
      scene.orbit.radius = Math.max(CAMERA.minRadius, Math.min(CAMERA.maxRadius, scene.orbit.radius + event.deltaY * 0.005));
      scene.applyOrbit();
      event.preventDefault();
    }, { passive: false });

    canvas.addEventListener('contextmenu', event => event.preventDefault());
  }

  if (app.touch) {
    app.touch.on(pc.EVENT_TOUCHSTART, event => {
      const touch = event.changedTouches[0];
      if (!touch) return;

      if (xr?.isAR && !xr.stagePlaced) {
        xr.placeStageAtReticle();
        return;
      }

      if (mobileLookMode) {
        activePointerId = touch.identifier;
        lastTouchX = touch.x;
        lastTouchY = touch.y;
        return;
      }

      if (activePointerId !== null) return;
      const brick = game.pickBrickFromScreen(touch.x, touch.y);
      if (!brick) return;
      activePointerId = touch.identifier;
      game.beginGrab(brick, { x: touch.x, y: touch.y });
    });

    app.touch.on(pc.EVENT_TOUCHMOVE, event => {
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier !== activePointerId) continue;

        if (mobileLookMode) {
          const dx = touch.x - lastTouchX;
          const dy = touch.y - lastTouchY;
          lastTouchX = touch.x;
          lastTouchY = touch.y;
          scene.orbit.yaw -= dx * 0.35;
          scene.orbit.pitch = Math.max(5, Math.min(80, scene.orbit.pitch - dy * 0.35));
          scene.applyOrbit();
          return;
        }

        game.moveGrabbedToGroundHit(game.screenToGround(touch.x, touch.y));
      }
    });

    app.touch.on(pc.EVENT_TOUCHEND, event => {
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier !== activePointerId) continue;
        activePointerId = null;
        if (!mobileLookMode) game.releaseGrabbedBrick();
      }
    });

    app.touch.on(pc.EVENT_TOUCHCANCEL, () => {
      activePointerId = null;
      if (!mobileLookMode) game.releaseGrabbedBrick();
    });
  }

  return {
    isMobile,
    toggleLookMode
  };
}
