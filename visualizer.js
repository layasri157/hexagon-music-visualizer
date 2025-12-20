// ====== BASIC SETUP ======
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// HTML elements
const audioFileInput = document.getElementById("audioFile");
const micBtn = document.getElementById("micBtn");
const playPauseBtn = document.getElementById("playPause");
const bassSlider = document.getElementById("bass");
const midsSlider = document.getElementById("mids");
const highsSlider = document.getElementById("highs");

// ====== AUDIO CONTEXT ======
let audioCtx;
let analyser;
let sourceNode;
let dataArray;
let audioElement;
let isPlaying = false;

function setupAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;                // number of frequency bins
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
  }
}

// ====== LOAD AUDIO FILE ======
audioFileInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  stopCurrentSource();
  setupAudioContext();

  audioElement = new Audio();
  audioElement.src = URL.createObjectURL(file);
  audioElement.crossOrigin = "anonymous";

  sourceNode = audioCtx.createMediaElementSource(audioElement);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  audioElement.play();
  isPlaying = true;
  playPauseBtn.textContent = "⏸ Pause";
});

// ====== MICROPHONE INPUT ======
micBtn.addEventListener("click", async () => {
  try {
    stopCurrentSource();
    setupAudioContext();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    sourceNode = audioCtx.createMediaStreamSource(stream);
    sourceNode.connect(analyser);

    isPlaying = true;
    playPauseBtn.textContent = "🎤 Live Mic";
  } catch (err) {
    alert("Microphone access denied or not available.");
    console.error(err);
  }
});

// ====== PLAY / PAUSE BUTTON ======
playPauseBtn.addEventListener("click", () => {
  if (!audioElement) return; // only works for file audio

  if (isPlaying) {
    audioElement.pause();
    isPlaying = false;
    playPauseBtn.textContent = "▶️ Play";
  } else {
    audioElement.play();
    isPlaying = true;
    playPauseBtn.textContent = "⏸ Pause";
  }
});

// ====== STOP CURRENT SOURCE ======
function stopCurrentSource() {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement = null;
  }
  // For mic streams: just letting stream stop is enough for this simple app
}

// ====== HEXAGON DRAWING ======
function drawHexagon(x, y, radius, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = radius * Math.cos(angle);
    const py = radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.fill();
  ctx.restore();
}

// ====== ANIMATION LOOP ======
function animate() {
  requestAnimationFrame(animate);

  if (!analyser) {
    // no audio yet, just clear background
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  analyser.getByteFrequencyData(dataArray);

  ctx.fillStyle = "#050510";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bassBoost = bassSlider.value / 100;
  const midsBoost = midsSlider.value / 100;
  const highsBoost = highsSlider.value / 100;

  const cols = 9;
  const rows = 7;
  const hexRadius = Math.min(canvas.width / (cols * 3), canvas.height / (rows * 3)) * 1.4;

  let index = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (index >= dataArray.length) break;

      const value = dataArray[index] / 255; // 0–1
      const bass = value * bassBoost;
      const mids = value * midsBoost;
      const highs = value * highsBoost;

      // Position hexagons in a honeycomb pattern
      const offsetX = (row % 2 === 0 ? 0 : hexRadius * 1.5);
      const x = col * hexRadius * 3 + offsetX + hexRadius * 2;
      const y = row * hexRadius * 2.6 + hexRadius * 2;

      const radius = hexRadius * (0.6 + bass); // pulse on bass
      const rotation = highs * Math.PI * 2;    // rotation on highs

      const r = 100 + Math.floor(155 * highs);
      const g = 50 + Math.floor(205 * mids);
      const b = 150 + Math.floor(105 * bass);
      const color = `rgb(${r}, ${g}, ${b})`;

      drawHexagon(x, y, radius, rotation, color);
      index++;
    }
  }
}

animate();
