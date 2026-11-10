const COMMAND = /^[a-zA-Z]$/;
const NUMBER = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?$/;

const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

function tokenizePath(pathData) {
  const tokens = pathData.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
  const invalid = tokens.find((token) => !COMMAND.test(token) && !NUMBER.test(token));
  if (invalid) throw new Error(`Unsupported SVG path token: ${invalid}`);
  return tokens;
}

function cubicPoint(start, control1, control2, end, t) {
  const inverse = 1 - t;
  return [
    inverse ** 3 * start[0] + 3 * inverse ** 2 * t * control1[0] + 3 * inverse * t ** 2 * control2[0] + t ** 3 * end[0],
    inverse ** 3 * start[1] + 3 * inverse ** 2 * t * control1[1] + 3 * inverse * t ** 2 * control2[1] + t ** 3 * end[1],
  ];
}

function appendCubic(ring, start, control1, control2, end) {
  const controlLength = distance(start, control1) + distance(control1, control2) + distance(control2, end);
  const steps = Math.max(4, Math.min(64, Math.ceil(controlLength / 6)));
  for (let step = 1; step <= steps; step += 1) {
    ring.push(cubicPoint(start, control1, control2, end, step / steps));
  }
}

export function pathToRings(pathData) {
  const tokens = tokenizePath(pathData);
  const rings = [];
  let ring = null;
  let index = 0;
  let command = null;
  let current = [0, 0];
  let start = [0, 0];
  let lastControl = null;
  let previousCommand = null;

  const hasNumber = () => index < tokens.length && !COMMAND.test(tokens[index]);
  const number = () => {
    const token = tokens[index];
    if (token === undefined || !NUMBER.test(token)) throw new Error(`Expected a number at path token ${index}`);
    index += 1;
    return Number(token);
  };
  const point = (relative) => {
    const x = number();
    const y = number();
    return relative ? [current[0] + x, current[1] + y] : [x, y];
  };
  const ensureRing = () => {
    if (!ring) throw new Error('SVG drawing command appeared before a move command');
  };

  while (index < tokens.length) {
    if (COMMAND.test(tokens[index])) {
      command = tokens[index];
      index += 1;
    }
    if (!command) throw new Error(`Missing SVG command at path token ${index}`);

    const relative = command === command.toLowerCase();
    switch (command.toUpperCase()) {
      case 'M': {
        current = point(relative);
        start = [...current];
        ring = [[...current]];
        rings.push(ring);
        lastControl = null;
        previousCommand = 'M';
        command = relative ? 'l' : 'L';
        while (hasNumber()) {
          current = point(relative);
          ring.push([...current]);
          previousCommand = 'L';
        }
        break;
      }
      case 'L': {
        ensureRing();
        while (hasNumber()) {
          current = point(relative);
          ring.push([...current]);
        }
        lastControl = null;
        previousCommand = 'L';
        break;
      }
      case 'H': {
        ensureRing();
        while (hasNumber()) {
          const x = number();
          current = [relative ? current[0] + x : x, current[1]];
          ring.push([...current]);
        }
        lastControl = null;
        previousCommand = 'H';
        break;
      }
      case 'V': {
        ensureRing();
        while (hasNumber()) {
          const y = number();
          current = [current[0], relative ? current[1] + y : y];
          ring.push([...current]);
        }
        lastControl = null;
        previousCommand = 'V';
        break;
      }
      case 'C': {
        ensureRing();
        while (hasNumber()) {
          const control1 = point(relative);
          const control2 = point(relative);
          const end = point(relative);
          appendCubic(ring, current, control1, control2, end);
          current = end;
          lastControl = control2;
        }
        previousCommand = 'C';
        break;
      }
      case 'S': {
        ensureRing();
        while (hasNumber()) {
          const control1 = previousCommand === 'C' || previousCommand === 'S'
            ? [2 * current[0] - lastControl[0], 2 * current[1] - lastControl[1]]
            : [...current];
          const control2 = point(relative);
          const end = point(relative);
          appendCubic(ring, current, control1, control2, end);
          current = end;
          lastControl = control2;
          previousCommand = 'S';
        }
        break;
      }
      case 'Z': {
        ensureRing();
        if (current[0] !== start[0] || current[1] !== start[1]) ring.push([...start]);
        current = [...start];
        lastControl = null;
        previousCommand = 'Z';
        command = null;
        break;
      }
      default:
        throw new Error(`Unsupported SVG path command: ${command}`);
    }
  }

  return rings.filter((candidate) => candidate.length >= 4 && Math.abs(signedArea(candidate)) >= 0.5);
}

export function polygonPointsToRings(points) {
  const values = points.trim().split(/[\s,]+/).map(Number);
  if (values.length < 6 || values.length % 2 !== 0 || values.some((value) => !Number.isFinite(value))) {
    throw new Error('Invalid SVG polygon points');
  }
  const ring = [];
  for (let index = 0; index < values.length; index += 2) ring.push([values[index], values[index + 1]]);
  const first = ring[0];
  const last = ring.at(-1);
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
  return [ring];
}

export function signedArea(ring) {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return area / 2;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const a = ring[index];
    const b = ring[previous];
    const crosses = (a[1] > point[1]) !== (b[1] > point[1]);
    if (crosses && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function interiorProbe(ring) {
  const first = ring[0];
  const second = ring[1];
  return [(first[0] * 0.999) + (second[0] * 0.001), (first[1] * 0.999) + (second[1] * 0.001)];
}

export function ringsToMultiPolygon(rings, project) {
  const nodes = rings.map((ring, index) => ({
    index,
    ring,
    area: Math.abs(signedArea(ring)),
    parent: null,
    depth: 0,
  }));

  for (const node of nodes) {
    const probe = interiorProbe(node.ring);
    const parents = nodes
      .filter((candidate) => candidate.index !== node.index && candidate.area > node.area && pointInRing(probe, candidate.ring))
      .sort((a, b) => a.area - b.area);
    node.parent = parents[0] ?? null;
  }
  for (const node of nodes) {
    let parent = node.parent;
    while (parent) {
      node.depth += 1;
      parent = parent.parent;
    }
  }

  const polygons = [];
  const polygonForNode = new Map();
  for (const node of nodes.filter((candidate) => candidate.depth % 2 === 0)) {
    const outer = orient(node.ring.map(project), true);
    const polygon = [outer];
    polygons.push(polygon);
    polygonForNode.set(node.index, polygon);
  }
  for (const node of nodes.filter((candidate) => candidate.depth % 2 === 1)) {
    let outer = node.parent;
    while (outer && outer.depth % 2 !== 0) outer = outer.parent;
    const polygon = outer ? polygonForNode.get(outer.index) : null;
    if (polygon) polygon.push(orient(node.ring.map(project), false));
  }
  return polygons;
}

function orient(ring, counterClockwise) {
  const isCounterClockwise = signedArea(ring) > 0;
  return isCounterClockwise === counterClockwise ? ring : [...ring].reverse();
}

const EARTH_RADIUS = 6378137;

export function lngLatToMercator([longitude, latitude]) {
  const clampedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  return [
    EARTH_RADIUS * longitude * Math.PI / 180,
    EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + clampedLatitude * Math.PI / 360)),
  ];
}

export function mercatorToLngLat([x, y]) {
  return [
    x / EARTH_RADIUS * 180 / Math.PI,
    (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * 180 / Math.PI,
  ];
}

function solve3(matrix, values) {
  const augmented = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-12) throw new Error('Calibration control points do not define an affine transform');
    for (let cell = column; cell < 4; cell += 1) augmented[column][cell] /= divisor;
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let cell = column; cell < 4; cell += 1) augmented[row][cell] -= factor * augmented[column][cell];
    }
  }
  return augmented.map((row) => row[3]);
}

function solveLinear(matrix, values) {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-12) throw new Error('Calibration control points do not define a projective transform');
    for (let cell = column; cell <= size; cell += 1) augmented[column][cell] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let cell = column; cell <= size; cell += 1) augmented[row][cell] -= factor * augmented[column][cell];
    }
  }
  return augmented.map((row) => row[size]);
}

export function fitAffineCalibration(controlPoints) {
  if (controlPoints.length < 3) throw new Error('At least three calibration control points are required');
  const design = controlPoints.map(({ source }) => [source[0], source[1], 1]);
  const targets = controlPoints.map(({ lngLat }) => lngLatToMercator(lngLat));
  const normal = Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, column) => design.reduce((sum, item) => sum + item[row] * item[column], 0)));
  const right = (axis) => Array.from({ length: 3 }, (_, column) =>
    design.reduce((sum, item, index) => sum + item[column] * targets[index][axis], 0));
  const x = solve3(normal, right(0));
  const y = solve3(normal, right(1));
  const projectMercator = ([sourceX, sourceY]) => [
    x[0] * sourceX + x[1] * sourceY + x[2],
    y[0] * sourceX + y[1] * sourceY + y[2],
  ];
  const project = (source) => mercatorToLngLat(projectMercator(source));
  const residuals = controlPoints.map((control) => ({
    name: control.name,
    metres: distance(projectMercator(control.source), lngLatToMercator(control.lngLat)),
  }));
  return {
    coefficients: { x, y },
    project,
    residuals,
    rootMeanSquareErrorMetres: Math.sqrt(residuals.reduce((sum, item) => sum + item.metres ** 2, 0) / residuals.length),
  };
}

export function fitRectangularCalibration(controlPoints, validationPoints = [], adjustments = {}) {
  if (controlPoints.length < 2) throw new Error('At least two calibration control points are required');
  const targets = controlPoints.map(({ lngLat }) => lngLatToMercator(lngLat));
  const fitAxis = (sourceAxis, targetAxis) => {
    const sourceValues = controlPoints.map(({ source }) => source[sourceAxis]);
    const targetValues = targets.map((target) => target[targetAxis]);
    const sourceMean = sourceValues.reduce((sum, value) => sum + value, 0) / sourceValues.length;
    const targetMean = targetValues.reduce((sum, value) => sum + value, 0) / targetValues.length;
    const denominator = sourceValues.reduce((sum, value) => sum + (value - sourceMean) ** 2, 0);
    if (denominator < 1e-12) throw new Error('Calibration control points do not span both source axes');
    const scale = sourceValues.reduce(
      (sum, value, index) => sum + (value - sourceMean) * (targetValues[index] - targetMean),
      0,
    ) / denominator;
    return { scale, offset: targetMean - scale * sourceMean };
  };
  const fittedX = fitAxis(0, 0);
  const y = fitAxis(1, 1);
  const horizontalScale = adjustments.horizontalScale ?? 1;
  const anchorSourceX = adjustments.anchorSourceX ?? 0;
  const x = {
    scale: fittedX.scale * horizontalScale,
    offset: fittedX.offset + (fittedX.scale - fittedX.scale * horizontalScale) * anchorSourceX,
  };
  const projectMercator = ([sourceX, sourceY]) => [
    x.scale * sourceX + x.offset,
    y.scale * sourceY + y.offset,
  ];
  const project = (source) => mercatorToLngLat(projectMercator(source));
  const residualsFor = (points) => points.map((control) => ({
    name: control.name,
    metres: distance(projectMercator(control.source), lngLatToMercator(control.lngLat)),
  }));
  const residuals = residualsFor(controlPoints);
  const validationResiduals = residualsFor(validationPoints);
  const rms = (items) => items.length === 0
    ? null
    : Math.sqrt(items.reduce((sum, item) => sum + item.metres ** 2, 0) / items.length);
  return {
    coefficients: { x, y },
    project,
    residuals,
    validationResiduals,
    rootMeanSquareErrorMetres: rms(residuals),
    validationRootMeanSquareErrorMetres: rms(validationResiduals),
  };
}

export function fitProjectiveCalibration(controlPoints, validationPoints = []) {
  if (controlPoints.length !== 4) throw new Error('Projective calibration requires exactly four control points');
  const matrix = [];
  const values = [];
  for (const control of controlPoints) {
    const [sourceX, sourceY] = control.source;
    const [targetX, targetY] = lngLatToMercator(control.lngLat);
    matrix.push([sourceX, sourceY, 1, 0, 0, 0, -targetX * sourceX, -targetX * sourceY]);
    values.push(targetX);
    matrix.push([0, 0, 0, sourceX, sourceY, 1, -targetY * sourceX, -targetY * sourceY]);
    values.push(targetY);
  }
  const [a, b, c, d, e, f, g, h] = solveLinear(matrix, values);
  const projectMercator = ([sourceX, sourceY]) => {
    const denominator = g * sourceX + h * sourceY + 1;
    return [
      (a * sourceX + b * sourceY + c) / denominator,
      (d * sourceX + e * sourceY + f) / denominator,
    ];
  };
  const project = (source) => mercatorToLngLat(projectMercator(source));
  const residualsFor = (points) => points.map((control) => ({
    name: control.name,
    metres: distance(projectMercator(control.source), lngLatToMercator(control.lngLat)),
  }));
  const residuals = residualsFor(controlPoints);
  const validationResiduals = residualsFor(validationPoints);
  const rms = (items) => items.length === 0
    ? null
    : Math.sqrt(items.reduce((sum, item) => sum + item.metres ** 2, 0) / items.length);
  return {
    coefficients: { a, b, c, d, e, f, g, h },
    project,
    residuals,
    validationResiduals,
    rootMeanSquareErrorMetres: rms(residuals),
    validationRootMeanSquareErrorMetres: rms(validationResiduals),
  };
}
