import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fitAffineCalibration,
  fitProjectiveCalibration,
  fitRectangularCalibration,
  pathToRings,
  polygonPointsToRings,
} from './svg-geometry.mjs';

test('pathToRings closes paths and flattens cubic curves', () => {
  const [ring] = pathToRings('M0 0 l10 0 c0 5 0 5 0 10 s-5 0-10 0 Z');
  assert.ok(ring.length > 8);
  assert.deepEqual(ring[0], ring.at(-1));
});

test('polygonPointsToRings accepts Illustrator polygon point syntax', () => {
  const [ring] = polygonPointsToRings('0 0 10,0 10 10 0,10');
  assert.equal(ring.length, 5);
  assert.deepEqual(ring[0], ring.at(-1));
});

test('affine calibration reproduces its controls', () => {
  const controls = [
    { name: 'a', source: [0, 0], lngLat: [-79.4, 43.6] },
    { name: 'b', source: [100, 0], lngLat: [-79.3, 43.6] },
    { name: 'c', source: [0, 100], lngLat: [-79.4, 43.5] },
  ];
  const result = fitAffineCalibration(controls);
  assert.ok(result.rootMeanSquareErrorMetres < 0.001);
  const projected = result.project([100, 0]);
  assert.ok(Math.abs(projected[0] + 79.3) < 1e-9);
  assert.ok(Math.abs(projected[1] - 43.6) < 1e-9);
});

test('projective calibration reports an independent validation residual', () => {
  const controls = [
    { name: 'a', source: [0, 0], lngLat: [-79.4, 43.6] },
    { name: 'b', source: [100, 0], lngLat: [-79.3, 43.6] },
    { name: 'c', source: [100, 100], lngLat: [-79.3, 43.5] },
    { name: 'd', source: [0, 100], lngLat: [-79.4, 43.5] },
  ];
  const result = fitProjectiveCalibration(controls, [
    { name: 'centre', source: [50, 50], lngLat: [-79.35, 43.55] },
  ]);
  assert.ok(result.rootMeanSquareErrorMetres < 0.001);
  assert.ok(result.validationRootMeanSquareErrorMetres < 4);
});

test('rectangular calibration preserves horizontal and vertical source edges', () => {
  const controls = [
    { name: 'northwest', source: [0, 0], lngLat: [-79.4, 43.6] },
    { name: 'northeast', source: [100, 0], lngLat: [-79.3, 43.6] },
    { name: 'southwest', source: [0, 100], lngLat: [-79.4, 43.5] },
    { name: 'southeast', source: [100, 100], lngLat: [-79.3, 43.5] },
  ];
  const result = fitRectangularCalibration(controls, [
    { name: 'centre', source: [50, 50], lngLat: [-79.35, 43.55] },
  ]);
  const northwest = result.project([0, 0]);
  const northeast = result.project([100, 0]);
  const southwest = result.project([0, 100]);
  assert.ok(Math.abs(northwest[1] - northeast[1]) < 1e-12);
  assert.ok(Math.abs(northwest[0] - southwest[0]) < 1e-12);
  assert.ok(result.rootMeanSquareErrorMetres < 0.001);
  assert.ok(result.validationRootMeanSquareErrorMetres < 4);
});
