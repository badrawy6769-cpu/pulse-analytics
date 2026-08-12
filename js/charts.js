/**
 * Minimal dependency-free canvas chart renderers.
 * No external charting library is used so the dashboard has zero CDN
 * dependencies and renders identically offline and in CI.
 */

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, width, height };
}

/**
 * Render a smooth-ish line + area chart of MRR over time onto a canvas.
 */
export function renderLineChart(canvas, points, { color = '#6b7cff', fill = 'rgba(107,124,255,0.15)' } = {}) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  if (!points || points.length === 0) return;

  const paddingX = 8;
  const paddingTop = 16;
  const paddingBottom = 28;
  const values = points.map((p) => p.value);
  const max = Math.max(...values) * 1.1;
  const min = Math.min(0, Math.min(...values));
  const plotW = width - paddingX * 2;
  const plotH = height - paddingTop - paddingBottom;

  const xFor = (i) => paddingX + (i / (points.length - 1)) * plotW;
  const yFor = (v) => paddingTop + (1 - (v - min) / (max - min || 1)) * plotH;

  // Gridlines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = paddingTop + (plotH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(paddingX, y);
    ctx.lineTo(width - paddingX, y);
    ctx.stroke();
  }

  // Area fill
  ctx.beginPath();
  ctx.moveTo(xFor(0), yFor(points[0].value));
  points.forEach((p, i) => ctx.lineTo(xFor(i), yFor(p.value)));
  ctx.lineTo(xFor(points.length - 1), paddingTop + plotH);
  ctx.lineTo(xFor(0), paddingTop + plotH);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(xFor(0), yFor(points[0].value));
  points.forEach((p, i) => ctx.lineTo(xFor(i), yFor(p.value)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Points
  points.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(xFor(i), yFor(p.value), i === points.length - 1 ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  // X labels
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  const labelStep = Math.ceil(points.length / 6);
  points.forEach((p, i) => {
    if (i % labelStep === 0 || i === points.length - 1) {
      ctx.fillText(p.label, xFor(i), height - 8);
    }
  });
}

/**
 * Render a horizontal stacked bar showing plan-mix proportions.
 */
export function renderStackedBar(canvas, segments) {
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return;

  const barHeight = 22;
  const y = (height - barHeight) / 2;
  let x = 0;
  const radius = 6;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + barHeight, radius);
  ctx.arcTo(x + width, y + barHeight, x, y + barHeight, radius);
  ctx.arcTo(x, y + barHeight, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.clip();

  segments.forEach((seg) => {
    const segWidth = (seg.value / total) * width;
    ctx.fillStyle = seg.color;
    ctx.fillRect(x, y, segWidth, barHeight);
    x += segWidth;
  });
  ctx.restore();
}
