import mermaid from 'mermaid';
import diagramSource from '../diagrams/overview.mmd?raw';
import { layoutArchitecture } from './layout.js';
import './style.css';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  htmlLabels: false,
  theme: 'base',
  fontFamily: 'Arial, Helvetica, sans-serif',
  themeVariables: {
    primaryColor: '#eaf0fc', primaryTextColor: '#243e68',
    primaryBorderColor: '#5377b9', lineColor: '#8492a2',
    secondaryColor: '#e7f4f0', tertiaryColor: '#fafcfd',
    clusterBkg: '#fafcfd', clusterBorder: '#d8e0e6',
    edgeLabelBackground: '#ffffff', fontSize: '15px',
  },
  // Native SVG text keeps exported images portable and canvas-safe.
  flowchart: { useMaxWidth: false, curve: 'basis', nodeSpacing: 35, rankSpacing: 65, padding: 18 },
});

const $ = (id) => document.getElementById(id);
let source = diagramSource;
let revision = 0;
let zoom = 1;
let fitMode = true;
let dimensions = { width: 1, height: 1 };
let renderQueue = Promise.resolve();

function showError(message) {
  $('error').textContent = message;
  $('error').hidden = !message;
}

function setExports(enabled) {
  $('export-svg').disabled = !enabled;
  $('export-png').disabled = !enabled;
}

function applyZoom() {
  const svg = $('diagram').querySelector('svg');
  if (!svg) return;
  svg.style.width = `${dimensions.width * zoom}px`;
  svg.style.height = `${dimensions.height * zoom}px`;
  $('zoom-label').textContent = `${Math.round(zoom * 100)}%`;
}

function fit() {
  fitMode = true;
  const available = Math.max(120, $('viewport').clientWidth - 24);
  const availableHeight = Math.max(120, $('viewport').clientHeight - 24);
  zoom = Math.min(1, available / dimensions.width, availableHeight / dimensions.height);
  applyZoom();
}

function centerInternetLabel() {
  const node = $('diagram').querySelector('g.node[id*="-flowchart-internet-"]');
  const shape = node?.querySelector('.label-container');
  const label = node?.querySelector('g.label');
  if (!shape || !label) return;

  // Mermaid's cloud shape offsets native SVG text. Center the rendered label
  // in the shape's local bounds so preview and exported images match.
  const bounds = shape.getBBox();
  const shapeTransform = shape.transform.baseVal.consolidate()?.matrix;
  let center = new DOMPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  if (shapeTransform) center = center.matrixTransform(shapeTransform);
  const text = label.getBBox();
  label.setAttribute('transform', `translate(${center.x - text.x - text.width / 2}, ${center.y - text.y - text.height / 2})`);
}

async function render(nextSource) {
  source = nextSource;
  $('source-code').textContent = source;
  $('status').textContent = 'Updating…';
  setExports(false);
  showError('');
  try {
    // Parse first so a syntax mistake cannot replace the last valid preview.
    await mermaid.parse(source);
    const { svg } = await mermaid.render(`architecture-${++revision}`, source);
    $('diagram').innerHTML = svg;
    centerInternetLabel();
    layoutArchitecture($('diagram').querySelector('svg'));
    const viewBox = $('diagram').querySelector('svg').viewBox.baseVal;
    dimensions = { width: viewBox.width, height: viewBox.height };
    fit();
    $('status').textContent = 'Up to date';
    setExports(true);
  } catch (error) {
    $('status').textContent = 'Check diagram source';
    showError(`The updated diagram could not be drawn. Fix diagrams/overview.mmd and save again. ${error.message || error}`);
  }
}

function scheduleRender(nextSource) {
  renderQueue = renderQueue.then(() => render(nextSource));
}

function exportSvg() {
  const svg = $('diagram').querySelector('svg').cloneNode(true);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(Math.ceil(dimensions.width)));
  svg.setAttribute('height', String(Math.ceil(dimensions.height)));
  svg.style.removeProperty('width');
  svg.style.removeProperty('height');
  svg.style.removeProperty('max-width');
  svg.style.backgroundColor = '#ffffff';
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  const box = svg.viewBox.baseVal;
  for (const [key, value] of Object.entries({ x: box.x, y: box.y, width: box.width, height: box.height, fill: '#ffffff' })) {
    background.setAttribute(key, String(value));
  }
  svg.insertBefore(background, svg.firstChild);
  return new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

$('export-svg').addEventListener('click', () => {
  try {
    download(exportSvg(), 'cyberfort-ms1-overview.svg');
    $('status').textContent = 'SVG exported';
  }
  catch (error) { showError(`SVG export failed: ${error.message}`); }
});

$('export-png').addEventListener('click', async () => {
  const button = $('export-png');
  button.disabled = true;
  button.textContent = 'Exporting…';
  let url;
  try {
    const size = { ...dimensions };
    url = URL.createObjectURL(exportSvg());
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    // Prefer 2× resolution, with bounded dimensions for larger future diagrams.
    const scale = Math.min(2, 8192 / size.width, 8192 / size.height, Math.sqrt(32000000 / (size.width * size.height)));
    canvas.width = Math.ceil(size.width * scale);
    canvas.height = Math.ceil(size.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not create an image canvas.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('The browser could not encode the image. Try SVG export.');
    download(png, 'cyberfort-ms1-overview.png');
    $('status').textContent = 'PNG exported';
  } catch (error) {
    showError(`PNG export failed: ${error.message}`);
  } finally {
    if (url) URL.revokeObjectURL(url);
    button.textContent = 'Export PNG ↗';
    button.disabled = !$('error').hidden;
  }
});

$('download-source').addEventListener('click', () => download(new Blob([source], { type: 'text/plain;charset=utf-8' }), 'overview.mmd'));
$('source-toggle').addEventListener('click', () => {
  const open = $('source-panel').hidden;
  $('source-panel').hidden = !open;
  $('source-toggle').setAttribute('aria-expanded', String(open));
  $('source-toggle').textContent = open ? 'Hide source' : 'View source';
});
$('zoom-in').addEventListener('click', () => { fitMode = false; zoom = Math.min(3, zoom * 1.25); applyZoom(); });
$('zoom-out').addEventListener('click', () => { fitMode = false; zoom = Math.max(0.1, zoom / 1.25); applyZoom(); });
$('fit').addEventListener('click', fit);
new ResizeObserver(() => { if (fitMode) fit(); }).observe($('viewport'));

scheduleRender(source);
if (import.meta.hot) {
  import.meta.hot.accept('../diagrams/overview.mmd?raw', (module) => {
    if (module) scheduleRender(module.default);
  });
}
