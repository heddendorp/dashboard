import type { GetTimesResult } from 'suncalc';

export type SkyPhase = 'night' | 'dawn' | 'sunrise' | 'day' | 'goldenHour' | 'sunset' | 'dusk';

export type CelestialPosition = {
  leftPct: number;
  topPct: number;
  isVisible: boolean;
};

const MIN_LEFT_PCT = 4;
const MAX_LEFT_PCT = 96;
const HORIZON_TOP_PCT = 53;
const ZENITH_TOP_PCT = 9;
const MOON_PHASE_FRAME_COUNT = 8;
const MOON_PHASE_FRAME_COLUMNS = 4;

export function resolveSkyPhase(now: Date, times: GetTimesResult): SkyPhase {
  const nowMs = now.getTime();

  if (nowMs < times.nauticalDawn.getTime() || nowMs >= times.nauticalDusk.getTime()) {
    return 'night';
  }

  if (nowMs < times.sunrise.getTime()) {
    return 'dawn';
  }

  if (nowMs < times.sunriseEnd.getTime()) {
    return 'sunrise';
  }

  if (nowMs < times.goldenHourEnd.getTime()) {
    return 'goldenHour';
  }

  if (nowMs < times.goldenHour.getTime()) {
    return 'day';
  }

  if (nowMs < times.sunsetStart.getTime()) {
    return 'goldenHour';
  }

  if (nowMs < times.sunset.getTime()) {
    return 'sunset';
  }

  if (nowMs < times.nauticalDusk.getTime()) {
    return 'dusk';
  }

  return 'night';
}

export function azimuthToLeftPercent(azimuthRad: number): number {
  const rawPercent = (0.5 + 0.5 * Math.sin(azimuthRad)) * 100;
  return clamp(rawPercent, MIN_LEFT_PCT, MAX_LEFT_PCT);
}

export function altitudeToTopPercent(altitudeRad: number): number {
  const normalizedAltitude = clamp(altitudeRad / (Math.PI / 2), 0, 1);
  const rawTopPercent =
    HORIZON_TOP_PCT - normalizedAltitude * (HORIZON_TOP_PCT - ZENITH_TOP_PCT);
  return clamp(rawTopPercent, ZENITH_TOP_PCT, HORIZON_TOP_PCT);
}

export function moonPhaseToFrameIndex(phase: number): number {
  const normalizedPhase = normalizeUnitInterval(phase);
  return Math.floor(normalizedPhase * MOON_PHASE_FRAME_COUNT) % MOON_PHASE_FRAME_COUNT;
}

export function frameIndexToBackgroundPosition(index: number): string {
  const normalizedIndex = normalizeFrameIndex(index);
  const column = normalizedIndex % MOON_PHASE_FRAME_COLUMNS;
  const row = Math.floor(normalizedIndex / MOON_PHASE_FRAME_COLUMNS);
  const xPositions = ['0%', '33.3333%', '66.6667%', '100%'];
  const yPosition = row === 0 ? '0%' : '100%';
  return `${xPositions[column]} ${yPosition}`;
}

export function toCelestialPosition(azimuthRad: number, altitudeRad: number): CelestialPosition {
  return {
    leftPct: azimuthToLeftPercent(azimuthRad),
    topPct: altitudeToTopPercent(altitudeRad),
    isVisible: altitudeRad > 0
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeUnitInterval(value: number): number {
  return ((value % 1) + 1) % 1;
}

function normalizeFrameIndex(index: number): number {
  return ((Math.trunc(index) % MOON_PHASE_FRAME_COUNT) + MOON_PHASE_FRAME_COUNT) % MOON_PHASE_FRAME_COUNT;
}
