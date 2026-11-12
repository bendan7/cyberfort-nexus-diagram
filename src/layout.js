// Keep this overview in vertical stages as the nested service details grow.
// Mermaid still owns the shapes, text, connections and arrowheads. Positions
// are applied to the rendered SVG, so SVG/PNG exports match the preview.
export function layoutArchitecture(svg) {
  const positions = {
    internet: [700, 80], gateway: [700, 250],
    endpoints: [300, 390], probe: [700, 390], rawPackets: [700, 560],
    files: [330, 820], antivirus: [230, 1000], scanFiles: [490, 1000],
    cnc: [780, 820], flowProcessor: [1085, 820], flowDatabase: [1085, 1000],
    alerts: [390, 1310], cncAlerts: [790, 1310], aci: [790, 1520],
    portal: [720, 1780], userDatabase: [720, 1940],
    monitoring: [1735, 1120],
  };
  const frames = {
    organization: [40, 180, 1850, 1870],
    engines: [80, 490, 1200, 660],
    fileService: [120, 740, 490, 370],
    forensics: [930, 740, 310, 370],
    kafka: [230, 1220, 730, 160],
    portalService: [480, 1690, 480, 330],
  };
  const nodes = Object.fromEntries(Object.keys(positions).map(id =>
    [id, svg.querySelector(`g.node[id*="-flowchart-${id}-"]`)]));
  const clusters = Object.fromEntries(Object.keys(frames).map(id =>
    [id, svg.querySelector(`g.cluster[id$="-${id}"]`)]));
  // Unknown future components use Mermaid's normal layout until positioned.
  if (Object.values(nodes).some(node => !node) ||
      Object.values(clusters).some(cluster => !cluster) ||
      svg.querySelectorAll('g.node').length !== Object.keys(nodes).length) return;

  const toLocal = (element, [x, y]) => new DOMPoint(x, y)
    .matrixTransform(svg.getScreenCTM())
    .matrixTransform(element.getScreenCTM().inverse());
  function center(element, point) {
    const target = toLocal(element.parentElement, point);
    const box = element.getBBox();
    element.setAttribute('transform', `translate(${target.x - box.x - box.width / 2}, ${target.y - box.y - box.height / 2})`);
  }
  // A full-height collection strip keeps telemetry arrows near their sources.
  const monitoringShape = nodes.monitoring.querySelector('rect.label-container');
  if (monitoringShape) {
    for (const [key, value] of Object.entries({x: -105, y: -890, width: 210, height: 1780})) {
      monitoringShape.setAttribute(key, value);
    }
  }
  for (const [id, point] of Object.entries(positions)) center(nodes[id], point);
  const monitoringTitle = nodes.monitoring.querySelector('g.label');
  center(monitoringTitle, positions.monitoring);
  for (const [id, [x, y, width, height]] of Object.entries(frames)) {
    const cluster = clusters[id];
    const rect = cluster.querySelector(':scope > rect');
    const topLeft = toLocal(rect.parentElement, [x, y]);
    const bottomRight = toLocal(rect.parentElement, [x + width, y + height]);
    for (const [key, value] of Object.entries({x: topLeft.x, y: topLeft.y,
      width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y})) {
      rect.setAttribute(key, value);
    }
    // Put boundary titles outside the rectangle, aligned to its left edge.
    const title = cluster.querySelector('.cluster-label');
    const titleBounds = title.getBBox();
    center(title, [x + titleBounds.width / 2, y - 16]);
  }

  function port(id, side, offset = 0) {
    const [x, y] = positions[id];
    const box = nodes[id].getBBox();
    const halfWidth = box.width / 2 + 4;
    const halfHeight = box.height / 2 + 4;
    return { top: [x + offset, y - halfHeight], bottom: [x + offset, y + halfHeight],
      left: [x - halfWidth, y + offset], right: [x + halfWidth, y + offset] }[side];
  }
  const routes = [
    ['internet', 'gateway', [port('internet', 'bottom'), port('gateway', 'top')], [830, 150]],
    ['gateway', 'endpoints', [port('gateway', 'left'), [300, 250], port('endpoints', 'top')], [400, 290]],
    ['gateway', 'probe', [port('gateway', 'bottom'), port('probe', 'top')], [830, 320]],
    ['probe', 'rawPackets', [port('probe', 'bottom'), port('rawPackets', 'top')], [810, 475]],
    ['rawPackets', 'files', [port('rawPackets', 'bottom', -20), [680, 650], [330, 650], port('files', 'top')], [330, 625]],
    ['rawPackets', 'cnc', [port('rawPackets', 'bottom'), [700, 670], [780, 670], port('cnc', 'top')], [790, 645]],
    ['rawPackets', 'flowProcessor', [port('rawPackets', 'right'), [1085, 560], port('flowProcessor', 'top')], [1085, 625]],
    ['files', 'antivirus', [port('files', 'bottom'), [330, 900], [230, 900], port('antivirus', 'top')], [230, 930]],
    ['files', 'scanFiles', [port('files', 'right'), [490, 820], port('scanFiles', 'top')], [510, 900]],
    ['antivirus', 'scanFiles', [port('antivirus', 'right'), port('scanFiles', 'left')], [360, 975]],
    ['flowProcessor', 'flowDatabase', [port('flowProcessor', 'bottom'), port('flowDatabase', 'top')], [1085, 910]],
    ['files', 'alerts', [port('files', 'left'), [100, 820], [100, 1310], port('alerts', 'left')], [190, 1185]],
    ['cnc', 'cncAlerts', [port('cnc', 'bottom'), [780, 1185], [790, 1185], port('cncAlerts', 'top')], [790, 1185]],
    ['alerts', 'aci', [port('alerts', 'bottom'), [390, 1520], port('aci', 'left')], [520, 1495]],
    ['cncAlerts', 'aci', [port('cncAlerts', 'bottom'), port('aci', 'top')], [895, 1440]],
    ['alerts', 'portal', [port('alerts', 'left'), [160, 1310], [160, 1780], port('portal', 'left')], [340, 1755]],
    ['cncAlerts', 'portal', [port('cncAlerts', 'right'), [1020, 1310], [1020, 1780], port('portal', 'right')], [1120, 1700]],
    ['forensics', 'aci', [[1244, 900], [1330, 900], [1330, 1520], port('aci', 'right')], [1130, 1495]],
    ['forensics', 'portal', [[1244, 1030], [1450, 1030], [1450, 1830], [990, 1830], [990, 1795], port('portal', 'right', 15)], [1280, 1805]],
    ['aci', 'portal', [port('aci', 'bottom'), [790, 1640], [720, 1640], port('portal', 'top')], [840, 1620]],
    ['portal', 'userDatabase', [port('portal', 'bottom'), port('userDatabase', 'top')], [805, 1870]],
    ['probe', 'monitoring', [port('probe', 'right'), [1626, 390]]],
    ['rawPackets', 'monitoring', [port('rawPackets', 'right', 20), [1626, 580]]],
    ['fileService', 'monitoring', [[570, 1114], [570, 1170], [1626, 1170]]],
    ['cnc', 'monitoring', [port('cnc', 'right'), [890, 820], [890, 1130], [1626, 1130]]],
    ['forensics', 'monitoring', [[1244, 1080], [1626, 1080]]],
    ['kafka', 'monitoring', [[964, 1360], [1626, 1360]]],
    ['aci', 'monitoring', [port('aci', 'right', 15), [900, 1535], [900, 1570], [1626, 1570]]],
    ['portalService', 'monitoring', [[964, 1975], [1626, 1975]]],
  ];
  for (const [from, to, points, labelAt] of routes) {
    const id = `L_${from}_${to}_0`;
    const path = svg.querySelector(`path[data-id="${id}"]`);
    if (!path) continue;
    const local = points.map(point => toLocal(path.parentElement, point));
    path.setAttribute('d', local.map((point, index) => `${index ? 'L' : 'M'} ${point.x},${point.y}`).join(' '));
    const telemetry = to === 'monitoring';
    path.style.strokeDasharray = telemetry || (from === 'gateway' && to === 'probe') ? '6 4' : 'none';
    path.style.strokeDashoffset = '0';
    path.style.strokeWidth = '1.5px';
    if (telemetry) path.style.stroke = '#8a75ab';
    path.removeAttribute('data-points');
    const label = svg.querySelector(`g.label[data-id="${id}"]`)?.parentElement;
    if (label && labelAt) center(label, labelAt);
  }
  svg.setAttribute('viewBox', '0 0 1930 2080');
}
