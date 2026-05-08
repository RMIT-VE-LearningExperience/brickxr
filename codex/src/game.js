import {
  BRICK_D,
  BRICK_H,
  BRICK_W,
  COLS,
  COLORS,
  FLOOR_Y,
  GAP_X,
  GAP_Y,
  HALF_BRICK_W,
  PALETTE,
  ROW1_Y,
  ROWS,
  SCORING,
  SNAP_RADIUS,
  SLOT_SURFACE_OFFSET,
  TIMING,
  WALL_Z
} from './config.js';

export function createGame({ app, scene, ui, audio }) {
  let score = 0;
  let moves = 0;
  let bricksPlaced = 0;
  let currentBrickNumber = 1;
  let totalBricks = 0;
  let activeRow = 0;
  let startTime = Date.now();
  let brickPositions = [];
  let halfPositions = [];
  let slots = [];
  let bricks = [];
  let selectedBrick = null;
  let grabOffsetX = 0;
  let grabOffsetZ = 0;
  let noSnapFlash = 0;
  let dropzoneVisualMode = 'overlay';

  function rebuildBrickPositions() {
    brickPositions = [];
    halfPositions = [];
    const startX = -((COLS - 1) / 2) * (BRICK_W + GAP_X);
    for (let r = 0; r < ROWS; r++) {
      const y = ROW1_Y + r * (BRICK_H + GAP_Y);
      const offset = r % 2 === 1 ? (BRICK_W + GAP_X) / 2 : 0;
      for (let c = 0; c < COLS; c++) {
        brickPositions.push({ x: startX + c * (BRICK_W + GAP_X) + offset, y, z: WALL_Z, row: r });
      }
      if (r % 2 === 0) {
        halfPositions.push({
          x: startX + (COLS - 1) * (BRICK_W + GAP_X) + offset + 0.75 * BRICK_W + GAP_X,
          y,
          z: WALL_Z,
          row: r,
          side: 'right'
        });
      } else {
        halfPositions.push({
          x: startX + offset - 0.75 * BRICK_W - GAP_X,
          y,
          z: WALL_Z,
          row: r,
          side: 'left'
        });
      }
    }
  }

  function createSlotMarkers() {
    slots = [];
    const allSlots = [
      ...brickPositions.map(p => ({ ...p, type: 'full', width: BRICK_W })),
      ...halfPositions.map(p => ({ ...p, type: 'half', width: HALF_BRICK_W }))
    ];
    allSlots.forEach((pos, i) => {
      const entity = new pc.Entity(`slot_${i}`);
      entity.addComponent('model', { type: 'box' });
      entity.model.meshInstances[0].material = scene.makeMat(COLORS.slot, 0.72);
      entity.model.meshInstances[0].material.depthTest = false;
      entity.model.meshInstances[0].material.depthWrite = false;
      entity.model.meshInstances[0].material.cull = pc.CULLFACE_NONE;
      entity.model.meshInstances[0].material.blendType = pc.BLEND_ADDITIVE;
      entity.model.meshInstances[0].material.update();
      entity.model.meshInstances[0].drawOrder = 1000;
      entity.model.meshInstances[0].castShadow = false;
      entity.setLocalScale(pos.width, 0.035, BRICK_D);
      entity.setPosition(pos.x, pos.y + SLOT_SURFACE_OFFSET, pos.z);
      scene.stageEntity.addChild(entity);
      slots.push({
        entity,
        row: pos.row,
        type: pos.type,
        width: pos.width,
        occupied: false,
        isHoverLit: false,
        isBadLit: false,
        pulseT: Math.random() * Math.PI * 2
      });
    });
  }

  function setSlotColor(slot, hex, opacity) {
    const mat = slot.entity.model.meshInstances[0].material;
    mat.diffuse.set(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255);
    mat.emissive.set(((hex >> 16) & 0xff) / 510, ((hex >> 8) & 0xff) / 510, (hex & 0xff) / 510);
    mat.opacity = opacity;
    mat.depthTest = false;
    mat.depthWrite = false;
    mat.cull = pc.CULLFACE_NONE;
    mat.blendType = pc.BLEND_ADDITIVE;
    mat.update();
    slot.entity.model.meshInstances[0].drawOrder = 1000;
  }

  function setRowVisibility(row) {
    slots.forEach(slot => {
      if (slot.occupied) {
        slot.entity.enabled = false;
        return;
      }
      slot.entity.enabled = slot.row === row;
      slot.isHoverLit = false;
      slot.isBadLit = false;
      if (slot.entity.enabled) setSlotColor(slot, COLORS.slot, 0.72);
    });
  }

  function isRowComplete(row) {
    return slots.filter(slot => slot.row === row).every(slot => slot.occupied);
  }

  function recomputeActiveRow() {
    let row = 0;
    while (row < ROWS && isRowComplete(row)) row++;
    activeRow = Math.min(row, ROWS - 1);
    setRowVisibility(activeRow);
  }

  function findFreeSpawnXZ(sx, sz, w, d) {
    if (!isOccupiedAt(sx, sz, w, d)) return { x: sx, z: sz };
    for (let i = 1; i <= 24; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      const nx = sx + dir * w * 0.65 * i;
      const nz = sz + ((i % 3) - 1) * d * 0.3;
      if (!isOccupiedAt(nx, nz, w, d)) return { x: nx, z: nz };
    }
    return { x: sx - w * 28, z: sz };
  }

  function isOccupiedAt(x, z, w, d) {
    for (const brick of bricks) {
      const bp = brick.entity.getPosition();
      if (Math.abs(x - bp.x) < (w + brick.brickWidth) / 2 && Math.abs(z - bp.z) < (BRICK_D + d) / 2) {
        return true;
      }
    }
    return false;
  }

  function buildGlow(brick) {
    const glow = new pc.Entity('glow');
    glow.addComponent('model', { type: 'box' });
    const mat = new pc.StandardMaterial();
    mat.diffuse.set(0.55, 0.68, 0.45);
    mat.opacity = 0;
    mat.blendType = pc.BLEND_NORMAL;
    mat.depthWrite = false;
    mat.update();
    glow.model.meshInstances[0].material = mat;
    glow.setLocalScale(1.09, 1.09, 1.09);
    brick.entity.addChild(glow);
    brick.glowEntity = glow;
    brick.glowMat = mat;
  }

  function removeGlow(brick) {
    if (brick.glowEntity) {
      brick.glowEntity.destroy();
      brick.glowEntity = null;
      brick.glowMat = null;
    }
  }

  function spawnNextBrick() {
    if (!slots.some(slot => !slot.occupied)) return;

    const rowFull = slots.some(slot => !slot.occupied && slot.row === activeRow && slot.type === 'full');
    const rowHalf = slots.some(slot => !slot.occupied && slot.row === activeRow && slot.type === 'half');
    let spawnType = 'full';
    if (!rowFull && rowHalf) spawnType = 'half';
    if (!rowFull && !rowHalf) spawnType = slots.some(slot => !slot.occupied && slot.type === 'half') ? 'half' : 'full';

    const width = spawnType === 'half' ? HALF_BRICK_W : BRICK_W;
    const color = PALETTE[(currentBrickNumber - 1) % PALETTE.length];
    const entity = new pc.Entity(`brick_${currentBrickNumber}`);
    entity.addComponent('model', { type: 'box' });
    entity.model.meshInstances[0].material = scene.makeMat(color);
    entity.model.meshInstances[0].castShadow = true;
    entity.setLocalScale(width, BRICK_H, BRICK_D);

    const jx = (Math.random() - 0.5) * 0.1;
    const jz = (Math.random() - 0.5) * 0.1;
    const sp = findFreeSpawnXZ(0.35 + jx, WALL_Z + 0.86 + jz, width, BRICK_D);
    entity.setPosition(sp.x, ROW1_Y, sp.z);
    scene.stageEntity.addChild(entity);

    const brick = {
      entity,
      brickWidth: width,
      baseScale: new pc.Vec3(width, BRICK_H, BRICK_D),
      isPlaced: false,
      slotIndex: null,
      glowStrength: 0,
      noSnapT: 0
    };
    buildGlow(brick);
    bricks.push(brick);
  }

  function screenToGround(sx, sy) {
    const near = new pc.Vec3();
    const far = new pc.Vec3();
    scene.cameraEntity.camera.screenToWorld(sx, sy, scene.cameraEntity.camera.nearClip, near);
    scene.cameraEntity.camera.screenToWorld(sx, sy, scene.cameraEntity.camera.farClip, far);
    const dir = new pc.Vec3().sub2(far, near).normalize();
    if (Math.abs(dir.y) < 0.0001) return null;
    const t = (0 - near.y) / dir.y;
    if (t < 0) return null;
    return new pc.Vec3(near.x + dir.x * t, 0, near.z + dir.z * t);
  }

  function pickBrickFromScreen(sx, sy) {
    const near = new pc.Vec3();
    const far = new pc.Vec3();
    scene.cameraEntity.camera.screenToWorld(sx, sy, scene.cameraEntity.camera.nearClip, near);
    scene.cameraEntity.camera.screenToWorld(sx, sy, scene.cameraEntity.camera.farClip, far);
    const dir = new pc.Vec3().sub2(far, near).normalize();
    const ray = new pc.Ray(near, dir);
    let best = null;
    let bestDist = Infinity;

    for (const brick of bricks) {
      if (brick.isPlaced) continue;
      const bp = brick.entity.getPosition();
      const bb = new pc.BoundingBox(bp, new pc.Vec3(brick.brickWidth / 2, BRICK_H / 2, BRICK_D / 2));
      const hit = new pc.Vec3();
      if (bb.intersectsRay(ray, hit)) {
        const dist = near.distance(hit);
        if (dist < bestDist) {
          bestDist = dist;
          best = brick;
        }
      }
    }
    return best;
  }

  function getHoverY(x, z) {
    let minY = FLOOR_Y + BRICK_H / 2;
    const pad = 0.12;
    const clearance = 0.08;
    for (const brick of bricks) {
      if (!brick.isPlaced) continue;
      const bp = brick.entity.getPosition();
      if (Math.abs(x - bp.x) <= brick.brickWidth / 2 + pad && Math.abs(z - bp.z) <= BRICK_D / 2 + pad) {
        const top = bp.y + BRICK_H / 2 + clearance + BRICK_H / 2;
        if (top > minY) minY = top;
      }
    }
    return Math.max(minY, ROW1_Y);
  }

  function beginGrab(brick, screenPoint = null) {
    if (!brick) return false;
    releaseBrickFromSlot(brick);
    selectedBrick = brick;
    brick.isGrabbed = true;
    if (screenPoint) {
      const hit = screenToGround(screenPoint.x, screenPoint.y);
      if (hit) {
        const bp = brick.entity.getPosition();
        grabOffsetX = bp.x - hit.x;
        grabOffsetZ = bp.z - hit.z;
      }
    } else {
      grabOffsetX = 0;
      grabOffsetZ = 0;
    }
    audio.grab();
    if (navigator.vibrate) navigator.vibrate(15);
    return true;
  }

  function moveGrabbedToGroundHit(hit) {
    if (!selectedBrick || !hit) return;
    const x = hit.x + grabOffsetX;
    const z = hit.z + grabOffsetZ;
    selectedBrick.entity.setPosition(x, getHoverY(x, z), z);
    highlightNearbySlots(x, z, selectedBrick);
  }

  function moveGrabbedBrickWorld(brick, x, z) {
    if (!brick) return;
    brick.entity.setPosition(x, getHoverY(x, z), z);
    highlightNearbySlots(x, z, brick);
  }

  function releaseGrabbedBrick() {
    if (!selectedBrick) return false;
    const brick = selectedBrick;
    selectedBrick = null;
    brick.isGrabbed = false;
    moves++;
    const didSnap = snapToBrick(brick);
    if (!didSnap) markNoSnap(brick);
    updateHUD();
    return didSnap;
  }

  function releaseSpecificBrick(brick) {
    if (!brick) return false;
    brick.isGrabbed = false;
    moves++;
    const didSnap = snapToBrick(brick);
    if (!didSnap) markNoSnap(brick);
    updateHUD();
    return didSnap;
  }

  function releaseBrickFromSlot(brick) {
    if (!brick.isPlaced || brick.slotIndex == null) return;
    const slot = slots[brick.slotIndex];
    if (slot) {
      slot.occupied = false;
      slot.entity.enabled = slot.row === activeRow;
    }
    brick.isPlaced = false;
    brick.slotIndex = null;
    buildGlow(brick);
    if (bricksPlaced > 0) {
      bricksPlaced--;
      recomputeActiveRow();
      updateHUD();
    }
  }

  function highlightNearbySlots(x, z, brick) {
    let best = null;
    let bestDist = Infinity;
    const isHalf = brick?.brickWidth === HALF_BRICK_W;
    slots.forEach(slot => {
      slot.isHoverLit = false;
      slot.isBadLit = false;
      if (!slot.entity.enabled || slot.occupied) return;
      const sp = slot.entity.getPosition();
      const dist = Math.hypot(x - sp.x, z - sp.z);
      if (dist < SNAP_RADIUS && dist < bestDist) {
        bestDist = dist;
        best = slot;
      }
    });

    slots.forEach(slot => {
      if (!slot.entity.enabled || slot.occupied) return;
      if (slot === best) {
        if (isHalf === (slot.type === 'half')) {
          slot.isHoverLit = true;
          setSlotColor(slot, COLORS.slotHot, 0.94);
        } else {
          slot.isBadLit = true;
          setSlotColor(slot, COLORS.slotBad, 0.9);
        }
      }
    });
  }

  function snapToBrick(brick) {
    const isHalf = brick.brickWidth === HALF_BRICK_W;
    const bp = brick.entity.getPosition();
    let best = null;
    let bestDist = SNAP_RADIUS;
    slots.forEach(slot => {
      if (!slot.entity.enabled || slot.occupied) return;
      if (isHalf !== (slot.type === 'half')) return;
      const sp = slot.entity.getPosition();
      const dist = Math.hypot(bp.x - sp.x, bp.z - sp.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = slot;
      }
    });

    if (!best) return false;

    const rowY = ROW1_Y + best.row * (BRICK_H + GAP_Y);
    const sp = best.entity.getPosition();
    brick.entity.setPosition(sp.x, rowY, sp.z);
    brick.entity.setLocalScale(brick.brickWidth, BRICK_H, BRICK_D);
    brick.isPlaced = true;
    brick.slotIndex = slots.indexOf(best);
    best.occupied = true;
    best.entity.enabled = false;
    removeGlow(brick);

    bricksPlaced++;
    currentBrickNumber++;
    audio.snap();
    if (navigator.vibrate) navigator.vibrate(60);

    if (best.row === activeRow && isRowComplete(activeRow) && activeRow < ROWS - 1) {
      activeRow++;
      setRowVisibility(activeRow);
      audio.rowDone();
      ui.showToast(`Row ${best.row + 1} complete. Row ${activeRow + 1} unlocked.`);
    }

    if (bricksPlaced < totalBricks) {
      setTimeout(spawnNextBrick, TIMING.nextBrickMs);
    } else {
      completeWall();
    }

    updateHUD();
    return true;
  }

  function markNoSnap(brick) {
    brick.noSnapT = TIMING.noSnapMs / 1000;
    noSnapFlash = TIMING.noSnapMs / 1000;
    audio.noSnap();
    ui.showToast('Move closer to a matching glowing slot.', 1300);
  }

  function completeWall() {
    const elapsed = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    const pts = Math.max(
      SCORING.minimumCompleteBonus,
      SCORING.completeBase +
        Math.max(0, SCORING.quickBonusWindow - elapsed) -
        Math.max(0, moves - totalBricks) * SCORING.extraMovePenalty
    );
    score += pts;
    audio.complete();
    ui.showToast(`Wall complete. +${pts} points.`);
    updateHUD();
  }

  function resetGame({ announce = true } = {}) {
    selectedBrick = null;
    bricks.forEach(brick => brick.entity?.destroy());
    slots.forEach(slot => slot.entity?.destroy());
    bricks = [];
    slots = [];
    rebuildBrickPositions();
    totalBricks = ROWS * COLS + halfPositions.length;
    createSlotMarkers();
    activeRow = 0;
    bricksPlaced = 0;
    currentBrickNumber = 1;
    moves = 0;
    startTime = Date.now();
    setRowVisibility(0);
    spawnNextBrick();
    updateHUD();
    if (announce) ui.showToast('New game');
  }

  function updateHUD() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    ui.updateScore({ score, moves, elapsed });
    ui.updateProgress({ placed: bricksPlaced, total: totalBricks, activeRow });
  }

  function updateDropzoneOverlay() {
    if (dropzoneVisualMode !== 'overlay') {
      ui.updateDropzones([]);
      return;
    }

    const markers = [];
    slots.forEach(slot => {
      if (!slot.entity.enabled || slot.occupied) return;
      const screen = new pc.Vec3();
      scene.cameraEntity.camera.worldToScreen(slot.entity.getPosition(), screen);
      if (screen.z <= 0) return;
      markers.push({
        x: screen.x,
        y: screen.y,
        type: slot.type,
        state: slot.isHoverLit ? 'hot' : slot.isBadLit ? 'bad' : 'active'
      });
    });
    ui.updateDropzones(markers);
  }

  function setDropzoneVisualMode(mode) {
    dropzoneVisualMode = mode;
    ui.setDropzoneOverlayVisible(mode === 'overlay');
    if (mode !== 'overlay') ui.updateDropzones([]);
  }

  function setWorldDropzonesVisible(visible) {
    slots.forEach(slot => {
      if (slot.occupied) {
        slot.entity.enabled = false;
      } else {
        slot.entity.enabled = visible && slot.row === activeRow;
      }
    });
  }

  function getActiveSlots() {
    return slots.filter(slot => slot.entity.enabled && !slot.occupied);
  }

  function getNearestSlotForBrick(brick, maxDistance = SNAP_RADIUS) {
    if (!brick) return null;
    const isHalf = brick.brickWidth === HALF_BRICK_W;
    const bp = brick.entity.getPosition();
    let best = null;
    let bestDist = maxDistance;
    slots.forEach(slot => {
      if (!slot.entity.enabled || slot.occupied) return;
      if (isHalf !== (slot.type === 'half')) return;
      const sp = slot.entity.getPosition();
      const dist = Math.hypot(bp.x - sp.x, bp.z - sp.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = slot;
      }
    });
    return best ? { slot: best, distance: bestDist } : null;
  }

  function pulseSlots(dt) {
    slots.forEach(slot => {
      if (!slot.entity.enabled || slot.occupied || slot.isHoverLit || slot.isBadLit) return;
      slot.pulseT += dt;
      const wave = 0.5 + 0.5 * Math.sin(slot.pulseT * 2.4);
      setSlotColor(slot, COLORS.slot, 0.58 + 0.24 * wave);
    });
  }

  function updateBrickFeedback(brick, dt) {
    const grabbed = brick.isGrabbed || brick === selectedBrick;
    const targetGlow = grabbed ? 0.55 : 0;
    brick.glowStrength += (targetGlow - brick.glowStrength) * Math.min(1, dt * 10);
    if (brick.glowMat) {
      brick.glowMat.opacity = brick.glowStrength;
      brick.glowMat.update();
    }

    if (!brick.isPlaced) {
      const pulse = brick.noSnapT > 0 ? Math.sin(brick.noSnapT * 90) * 0.018 : 0;
      const boost = grabbed ? 1.04 : 1;
      brick.entity.setLocalScale(
        brick.brickWidth * boost,
        BRICK_H * boost,
        BRICK_D * boost + pulse
      );
    }

    if (brick.noSnapT > 0) brick.noSnapT = Math.max(0, brick.noSnapT - dt);
  }

  function update(dt) {
    pulseSlots(dt);
    if (noSnapFlash > 0) noSnapFlash = Math.max(0, noSnapFlash - dt);
    bricks.forEach(brick => updateBrickFeedback(brick, dt));
    updateDropzoneOverlay();
    updateHUD();
  }

  function getState() {
    return {
      activeRow,
      totalBricks,
      bricksPlaced,
      selectedBrick,
      bricks
    };
  }

  resetGame({ announce: false });

  return {
    resetGame,
    update,
    screenToGround,
    pickBrickFromScreen,
    beginGrab,
    moveGrabbedToGroundHit,
    moveGrabbedBrickWorld,
    releaseGrabbedBrick,
    releaseSpecificBrick,
    setDropzoneVisualMode,
    setWorldDropzonesVisible,
    getActiveSlots,
    getNearestSlotForBrick,
    getHoverY,
    getState,
    setSelectedBrick: brick => {
      selectedBrick = brick;
    }
  };
}
