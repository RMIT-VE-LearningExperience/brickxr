import { audio } from './audio.js';
import { loadEnvironmentSplat } from './environment.js';
import { createGame } from './game.js';
import { createInput } from './input.js';
import { createScene } from './scene.js';
import { createUI } from './ui.js';
import { createXR } from './xr.js';

const canvas = document.getElementById('appCanvas');

const app = new pc.Application(canvas, {
  mouse: new pc.Mouse(canvas),
  touch: new pc.TouchDevice(canvas),
  graphicsDeviceOptions: { antialias: true, alpha: true }
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
window.addEventListener('resize', () => app.resizeCanvas());
app.start();

const ui = createUI();
const scene = createScene(app);
const environment = loadEnvironmentSplat({ app, scene, ui });
const game = createGame({ app, scene, ui, audio });
const xr = createXR({ app, scene, game, ui, audio, environment });
const input = createInput({ app, canvas, scene, game, ui, xr });

ui.bind({
  onReset: () => game.resetGame(),
  onVR: () => xr.startVR(),
  onAR: () => xr.startAR(),
  onLookToggle: () => input.toggleLookMode(),
  onARReplace: () => xr.replaceARStage(),
  onARRotateLeft: () => xr.rotateStage(15),
  onARRotateRight: () => xr.rotateStage(-15),
  onARScaleDown: () => xr.scaleStage(-0.15),
  onARScaleUp: () => xr.scaleStage(0.15)
});

app.on('update', dt => {
  xr.update(dt);
  game.update(dt);
});
