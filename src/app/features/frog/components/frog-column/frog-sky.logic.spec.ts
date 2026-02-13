import type { GetTimesResult } from 'suncalc';

import {
  altitudeToTopPercent,
  azimuthToLeftPercent,
  frameIndexToBackgroundPosition,
  moonPhaseToFrameIndex,
  resolveSkyPhase
} from './frog-sky.logic';

describe('frog-sky.logic', () => {
  it('resolves all sky phases by time boundaries', () => {
    const times = buildTimes();

    expect(resolveSkyPhase(dateAt(3, 30), times)).toBe('night');
    expect(resolveSkyPhase(dateAt(4, 30), times)).toBe('dawn');
    expect(resolveSkyPhase(dateAt(6, 5), times)).toBe('sunrise');
    expect(resolveSkyPhase(dateAt(6, 30), times)).toBe('goldenHour');
    expect(resolveSkyPhase(dateAt(12, 0), times)).toBe('day');
    expect(resolveSkyPhase(dateAt(18, 10), times)).toBe('goldenHour');
    expect(resolveSkyPhase(dateAt(18, 35), times)).toBe('sunset');
    expect(resolveSkyPhase(dateAt(19, 10), times)).toBe('dusk');
    expect(resolveSkyPhase(dateAt(21, 0), times)).toBe('night');
  });

  it('maps azimuth to horizontal position', () => {
    expect(azimuthToLeftPercent(-Math.PI / 2)).toBeCloseTo(4, 4);
    expect(azimuthToLeftPercent(0)).toBeCloseTo(50, 4);
    expect(azimuthToLeftPercent(Math.PI / 2)).toBeCloseTo(96, 4);
  });

  it('maps altitude to vertical position', () => {
    expect(altitudeToTopPercent(0)).toBeCloseTo(53, 4);
    expect(altitudeToTopPercent(Math.PI / 2)).toBeCloseTo(9, 4);
    expect(altitudeToTopPercent(-1)).toBeCloseTo(53, 4);
  });

  it('maps moon phase values to sprite frame indices', () => {
    expect(moonPhaseToFrameIndex(0)).toBe(0);
    expect(moonPhaseToFrameIndex(0.24)).toBe(1);
    expect(moonPhaseToFrameIndex(0.25)).toBe(2);
    expect(moonPhaseToFrameIndex(0.5)).toBe(4);
    expect(moonPhaseToFrameIndex(0.75)).toBe(6);
    expect(moonPhaseToFrameIndex(0.99)).toBe(7);
    expect(moonPhaseToFrameIndex(1)).toBe(0);
  });

  it('converts frame indices to background positions for 4x2 sprite', () => {
    expect(frameIndexToBackgroundPosition(0)).toBe('0% 0%');
    expect(frameIndexToBackgroundPosition(3)).toBe('100% 0%');
    expect(frameIndexToBackgroundPosition(4)).toBe('0% 100%');
    expect(frameIndexToBackgroundPosition(7)).toBe('100% 100%');
  });
});

function buildTimes(): GetTimesResult {
  return {
    dawn: dateAt(5, 0),
    dusk: dateAt(19, 0),
    goldenHour: dateAt(18, 0),
    goldenHourEnd: dateAt(7, 0),
    nadir: dateAt(0, 0),
    nauticalDawn: dateAt(4, 0),
    nauticalDusk: dateAt(20, 0),
    night: dateAt(20, 0),
    nightEnd: dateAt(4, 0),
    solarNoon: dateAt(12, 0),
    sunrise: dateAt(6, 0),
    sunriseEnd: dateAt(6, 15),
    sunset: dateAt(18, 45),
    sunsetStart: dateAt(18, 30)
  };
}

function dateAt(hours: number, minutes: number): Date {
  return new Date(2026, 5, 15, hours, minutes, 0, 0);
}
