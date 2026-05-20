import { useEffect, useRef, useCallback } from 'react';

/**
 * MedicalHeroAnimation — Premium medical monitoring dashboard aesthetic.
 *
 * Inspired by high-end patient monitors (Philips IntelliVue, GE CARESCAPE)
 * and Apple Health's visual language.
 *
 * Layers:
 *   1. Deep gradient with animated mesh grid (cellular/hexagonal feel)
 *   2. Smooth, glowing ECG waveform with phosphor trail
 *   3. Concentric heartbeat pulse rings
 *   4. Floating vital-sign readouts (decorative)
 *   5. Soft bloom lighting
 */

const COLORS = {
  bg1: '#071a27',
  bg2: '#0c2d42',
  bg3: '#0a2335',
  teal: '#1A6B8A',
  tealBright: '#2596be',
  green: '#2ECC8F',
  greenDim: '#1a9e6e',
  gold: '#F4A62A',
  cyan: '#5ce0d2',
  gridLine: 'rgba(26,107,138,0.07)',
  gridDot: 'rgba(46,204,143,0.15)',
};

export default function MedicalHeroAnimation() {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const t = frameRef.current++;
    const time = t / 60; // seconds

    ctx.clearRect(0, 0, W, H);

    // ━━━ Layer 1: Background gradient ━━━
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, COLORS.bg1);
    bg.addColorStop(0.4, COLORS.bg2);
    bg.addColorStop(0.7, COLORS.bg3);
    bg.addColorStop(1, COLORS.bg1);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ━━━ Layer 2: Animated grid mesh ━━━
    drawGrid(ctx, W, H, time);

    // ━━━ Layer 3: Soft bloom lights ━━━
    drawBloom(ctx, W * 0.12, H * 0.2, 180, COLORS.teal, 0.18 + Math.sin(time * 0.5) * 0.06);
    drawBloom(ctx, W * 0.88, H * 0.15, 150, COLORS.green, 0.14 + Math.sin(time * 0.4 + 1) * 0.05);
    drawBloom(ctx, W * 0.5, H * 0.8, 100, COLORS.gold, 0.08 + Math.sin(time * 0.6 + 2) * 0.03);

    // ━━━ Layer 4: Heartbeat pulse rings ━━━
    drawPulseRings(ctx, W * 0.88, H * 0.48, time);

    // ━━━ Layer 5: ECG waveform with phosphor trail ━━━
    drawECG(ctx, W, H, time);

    // ━━━ Layer 6: Decorative vital signs ━━━
    drawVitalSigns(ctx, W, H, time);

    // ━━━ Layer 7: Bottom gradient fade ━━━
    const fade = ctx.createLinearGradient(0, H * 0.55, 0, H);
    fade.addColorStop(0, 'rgba(7,26,39,0)');
    fade.addColorStop(1, 'rgba(7,26,39,0.7)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, H);

    // ━━━ Layer 8: Top subtle scanline ━━━
    const scanY = (time * 18) % (H + 30) - 15;
    const scan = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
    scan.addColorStop(0, 'rgba(46,204,143,0)');
    scan.addColorStop(0.5, 'rgba(46,204,143,0.04)');
    scan.addColorStop(1, 'rgba(46,204,143,0)');
    ctx.fillStyle = scan;
    ctx.fillRect(0, scanY - 8, W, 16);

    requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(draw);
    const onResize = () => { frameRef.current = frameRef.current; }; // force redraw dimensions
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
    };
  }, [draw]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} aria-hidden="true">
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}

// ════════════════════════════════════════════════════════
// DRAWING FUNCTIONS
// ════════════════════════════════════════════════════════

function drawGrid(ctx, W, H, time) {
  const spacing = 28;
  const cols = Math.ceil(W / spacing) + 1;
  const rows = Math.ceil(H / spacing) + 1;
  const drift = time * 3;

  ctx.save();

  // Horizontal lines
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 0.5;
  for (let r = 0; r < rows; r++) {
    const y = r * spacing;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Vertical lines
  for (let c = 0; c < cols; c++) {
    const x = c * spacing;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  // Intersection dots with subtle pulse wave
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * spacing;
      const y = r * spacing;
      const dist = Math.sqrt((x - W * 0.5) ** 2 + (y - H * 0.5) ** 2);
      const wave = Math.sin(dist * 0.02 - drift * 0.3) * 0.5 + 0.5;
      const alpha = 0.04 + wave * 0.14;
      const radius = 0.8 + wave * 0.8;

      ctx.fillStyle = `rgba(46, 204, 143, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawBloom(ctx, x, y, radius, color, alpha) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
  grad.addColorStop(0.6, `rgba(${r},${g},${b},${alpha * 0.3})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPulseRings(ctx, cx, cy, time) {
  const ringCount = 3;
  const interval = 2.2; // seconds between rings

  ctx.save();
  for (let i = 0; i < ringCount; i++) {
    const age = (time + i * interval) % (ringCount * interval);
    const progress = age / (ringCount * interval);
    const radius = 8 + progress * 65;
    const alpha = (1 - progress) * 0.35;

    if (alpha <= 0) continue;

    ctx.strokeStyle = `rgba(46, 204, 143, ${alpha})`;
    ctx.lineWidth = 1.8 - progress * 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Center heart icon (simple)
  const heartAlpha = 0.35 + Math.sin(time * 2.5) * 0.15;
  const heartScale = 1 + Math.sin(time * 2.5) * 0.08;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(heartScale, heartScale);
  ctx.fillStyle = `rgba(46, 204, 143, ${heartAlpha})`;
  ctx.beginPath();
  // Simple heart shape
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-1, 0, -6, -1, -6, -4);
  ctx.bezierCurveTo(-6, -7, -3, -8, 0, -5.5);
  ctx.bezierCurveTo(3, -8, 6, -7, 6, -4);
  ctx.bezierCurveTo(6, -1, 1, 0, 0, 3);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawECG(ctx, W, H, time) {
  const ecgY = H * 0.52;
  const amplitude = H * 0.30;
  const speed = 0.18;
  const trailLen = 0.28;

  // Sweep position loops across width
  const sweep = ((time * speed) % 1.5) - 0.15;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const segCount = 300;
  const points = [];
  for (let i = 0; i <= segCount; i++) {
    const px = i / segCount;
    points.push({ x: px * W, y: ecgY + ecgWaveform(px) * amplitude, px });
  }

  // Draw segments with phosphor trail effect
  for (let i = 1; i < points.length; i++) {
    const dist = sweep - points[i].px;
    if (dist < 0 || dist > trailLen) continue;

    const fade = 1 - dist / trailLen;
    const brightness = fade * fade; // quadratic falloff for phosphor look

    // Wide glow
    ctx.strokeStyle = `rgba(46, 204, 143, ${brightness * 0.2})`;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    // Medium glow
    ctx.strokeStyle = `rgba(37, 150, 190, ${brightness * 0.5})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();

    // Sharp core line
    const coreG = Math.round(180 + fade * 75);
    ctx.strokeStyle = `rgba(30, ${coreG}, 160, ${brightness * 0.95})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }

  // Leading bright dot
  const headX = sweep * W;
  if (headX > 0 && headX < W) {
    const headY = ecgY + ecgWaveform(Math.max(0, Math.min(1, sweep))) * amplitude;

    // Outer halo
    const halo = ctx.createRadialGradient(headX, headY, 0, headX, headY, 20);
    halo.addColorStop(0, 'rgba(46, 204, 143, 0.7)');
    halo.addColorStop(0.3, 'rgba(37, 150, 190, 0.3)');
    halo.addColorStop(1, 'rgba(37, 150, 190, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(headX, headY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Core white
    ctx.fillStyle = 'rgba(220, 255, 245, 0.95)';
    ctx.beginPath();
    ctx.arc(headX, headY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawVitalSigns(ctx, W, H, time) {
  ctx.save();
  ctx.font = '600 10px "Inter", "SF Pro", system-ui, sans-serif';

  // Heart rate (top-right area, above pulse rings)
  const hrValue = 72 + Math.round(Math.sin(time * 0.3) * 3);
  const hrAlpha = 0.28 + Math.sin(time * 2.5) * 0.08;

  ctx.fillStyle = `rgba(46, 204, 143, ${hrAlpha * 0.6})`;
  ctx.textAlign = 'right';
  ctx.fillText('♥ BPM', W * 0.945, H * 0.22);

  ctx.font = '700 18px "Inter", "SF Pro", system-ui, sans-serif';
  ctx.fillStyle = `rgba(46, 204, 143, ${hrAlpha})`;
  ctx.fillText(String(hrValue), W * 0.945, H * 0.39);

  // SpO2 (right side lower)
  ctx.font = '600 9px "Inter", "SF Pro", system-ui, sans-serif';
  ctx.fillStyle = `rgba(37, 150, 190, 0.22)`;
  ctx.fillText('SpO₂', W * 0.945, H * 0.72);

  ctx.font = '700 14px "Inter", "SF Pro", system-ui, sans-serif';
  ctx.fillStyle = `rgba(37, 150, 190, 0.30)`;
  const spo2 = 97 + Math.round(Math.sin(time * 0.2 + 1) * 1.5);
  ctx.fillText(spo2 + '%', W * 0.945, H * 0.85);

  ctx.restore();
}

// ════════════════════════════════════════════════════════
// ECG WAVEFORM (realistic PQRST)
// ════════════════════════════════════════════════════════

function ecgWaveform(px) {
  const period = 0.30;
  const phase = (px % period) / period;

  // P wave (atrial depolarization)
  if (phase < 0.10) {
    return -0.07 * Math.sin((phase / 0.10) * Math.PI);
  }
  // PR segment (flat)
  if (phase < 0.16) return 0;
  // Q wave (small dip)
  if (phase < 0.19) {
    return 0.06 * Math.sin(((phase - 0.16) / 0.03) * Math.PI);
  }
  // R wave (tall sharp peak)
  if (phase < 0.25) {
    return -0.92 * Math.sin(((phase - 0.19) / 0.06) * Math.PI);
  }
  // S wave (dip below baseline)
  if (phase < 0.29) {
    return 0.18 * Math.sin(((phase - 0.25) / 0.04) * Math.PI);
  }
  // ST segment
  if (phase < 0.40) return 0;
  // T wave (ventricular repolarization)
  if (phase < 0.56) {
    return -0.14 * Math.sin(((phase - 0.40) / 0.16) * Math.PI);
  }
  // Baseline
  return 0;
}
