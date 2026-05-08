import { ROWS, TIMING } from './config.js';

export function createUI() {
  const elements = {
    score: document.getElementById('scoreDisplay'),
    moves: document.getElementById('moveDisplay'),
    time: document.getElementById('timeDisplay'),
    progressLabel: document.getElementById('progressLabel'),
    rowLabel: document.getElementById('rowLabel'),
    progressBar: document.getElementById('progressBar'),
    dropzoneOverlay: document.getElementById('dropzoneOverlay'),
    help: document.getElementById('helpOverlay'),
    toastRoot: document.getElementById('toastRoot'),
    arHint: document.getElementById('arHint'),
    arControls: document.getElementById('arControls'),
    lookToggle: document.getElementById('lookToggle'),
    helpButton: document.getElementById('helpButton'),
    closeHelpButton: document.getElementById('closeHelpBtn'),
    resetButton: document.getElementById('resetButton'),
    vrButton: document.getElementById('vrButton'),
    arButton: document.getElementById('arButton'),
    arReplace: document.getElementById('arReplace'),
    arRotLeft: document.getElementById('arRotLeft'),
    arRotRight: document.getElementById('arRotRight'),
    arScaleDown: document.getElementById('arScaleDown'),
    arScaleUp: document.getElementById('arScaleUp')
  };

  function showToast(text, ms = TIMING.toastMs) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    elements.toastRoot.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  function updateScore({ score, moves, elapsed }) {
    elements.score.textContent = `Score ${score}`;
    elements.moves.textContent = `Moves ${moves}`;
    elements.time.textContent = `${elapsed}s`;
  }

  function updateProgress({ placed, total, activeRow }) {
    const pct = total ? Math.min(100, (placed / total) * 100) : 0;
    elements.progressBar.style.width = `${pct}%`;
    elements.progressLabel.textContent = `${placed} / ${total} bricks`;
    elements.rowLabel.textContent = `Row ${Math.min(activeRow + 1, ROWS)} of ${ROWS}`;
  }

  function updateDropzones(markers) {
    elements.dropzoneOverlay.replaceChildren();
    const fragment = document.createDocumentFragment();
    markers.forEach(marker => {
      const el = document.createElement('div');
      el.className = [
        'dropzone-marker',
        marker.type === 'half' ? 'dropzone-marker--half' : '',
        marker.state === 'hot' ? 'dropzone-marker--hot' : '',
        marker.state === 'bad' ? 'dropzone-marker--bad' : ''
      ].filter(Boolean).join(' ');
      el.style.left = `${marker.x}px`;
      el.style.top = `${marker.y}px`;
      fragment.appendChild(el);
    });
    elements.dropzoneOverlay.appendChild(fragment);
  }

  function setDropzoneOverlayVisible(visible) {
    elements.dropzoneOverlay.style.display = visible ? 'block' : 'none';
    if (!visible) elements.dropzoneOverlay.replaceChildren();
  }

  function setLookVisible(visible) {
    elements.lookToggle.classList.toggle('hidden', !visible);
  }

  function setLookMode(enabled) {
    elements.lookToggle.textContent = enabled ? 'Look On' : 'Look Off';
    elements.lookToggle.setAttribute('aria-pressed', String(enabled));
  }

  function setARControlsVisible(visible) {
    elements.arControls.classList.toggle('visible', visible);
  }

  function showARHint(ms = 3000) {
    elements.arHint.style.display = 'block';
    setTimeout(() => {
      elements.arHint.style.display = 'none';
    }, ms);
  }

  function setHelpOpen(open) {
    elements.help.hidden = !open;
    elements.helpButton.setAttribute('aria-expanded', String(open));
    elements.helpButton.setAttribute('aria-label', open ? 'Hide game help' : 'Show game help');
  }

  function bind(handlers) {
    elements.helpButton.addEventListener('click', () => {
      setHelpOpen(elements.help.hidden);
    });
    elements.closeHelpButton.addEventListener('click', () => {
      setHelpOpen(false);
    });
    elements.resetButton.addEventListener('click', handlers.onReset);
    elements.vrButton.addEventListener('click', handlers.onVR);
    elements.arButton.addEventListener('click', handlers.onAR);
    elements.lookToggle.addEventListener('click', handlers.onLookToggle);
    elements.arReplace.addEventListener('click', handlers.onARReplace);
    elements.arRotLeft.addEventListener('click', handlers.onARRotateLeft);
    elements.arRotRight.addEventListener('click', handlers.onARRotateRight);
    elements.arScaleDown.addEventListener('click', handlers.onARScaleDown);
    elements.arScaleUp.addEventListener('click', handlers.onARScaleUp);
  }

  return {
    elements,
    bind,
    showToast,
    updateScore,
    updateProgress,
    updateDropzones,
    setDropzoneOverlayVisible,
    setLookVisible,
    setLookMode,
    setARControlsVisible,
    showARHint
  };
}
