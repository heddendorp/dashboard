import { NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';
import * as SunCalc from 'suncalc';

import {
  CelestialPosition,
  SkyPhase,
  frameIndexToBackgroundPosition,
  moonPhaseToFrameIndex,
  resolveSkyPhase,
  toCelestialPosition
} from './frog-sky.logic';

const ATTACK_CYCLE_MS = 1000;
const JUMP_CYCLE_MS = 1000;
const HIT_HURT_CYCLE_MS = 900;
const JUMP_UNSAFE_START_RATIO = 0.2;
const JUMP_UNSAFE_END_RATIO = 0.8;
const HAPPINESS_DECAY_STEP = 10;
const HAPPINESS_DECAY_INTERVAL_MS = 2 * 60 * 60 * 1000;
const CLOCK_UPDATE_INTERVAL_MINUTES = 1;
const BACKGROUND_TRANSITION_MS = 120_000;
const FROG_LATITUDE = 48 + 8 / 60;
const FROG_LONGITUDE = 11 + 34 / 60;
const QUIET_HOURS_START_MINUTES = 22 * 60;
const QUIET_HOURS_END_MINUTES = 7 * 60 + 30;
const OBSTACLE_COUNT = 20;
const OBSTACLE_INTERVAL_MS = 3734;
const OBSTACLE_TRAVEL_MS = 2700;
const OBSTACLE_COLLISION_CHECK_RATIO = 0.4;
const SKY_GROUND_SPLIT_PERCENT = 58.5;

type Obstacle = {
  id: number;
  delayMs: number;
  resolved: boolean;
};
type FlowerSeasonClass =
  | 'frog-flower-winter'
  | 'frog-flower-spring'
  | 'frog-flower-summer'
  | 'frog-flower-autumn';
type GroundSeasonClass =
  | 'frog-ground-winter'
  | 'frog-ground-spring'
  | 'frog-ground-summer'
  | 'frog-ground-autumn';

const PANEL_GRADIENTS_BY_PHASE: Record<SkyPhase, string> = {
  night: createPanelGradient(
    'rgb(31 44 79 / 0.96)',
    'rgb(56 68 102 / 0.96)',
    'rgb(98 87 72 / 0.96)',
    'rgb(84 75 62 / 0.96)'
  ),
  dawn: createPanelGradient(
    'rgb(113 137 188 / 0.96)',
    'rgb(168 176 210 / 0.96)',
    'rgb(205 185 156 / 0.96)',
    'rgb(187 168 141 / 0.96)'
  ),
  sunrise: createPanelGradient(
    'rgb(255 193 162 / 0.96)',
    'rgb(247 170 162 / 0.96)',
    'rgb(225 204 172 / 0.96)',
    'rgb(207 186 155 / 0.96)'
  ),
  day: createPanelGradient(
    'rgb(222 240 252 / 0.95)',
    'rgb(210 232 248 / 0.95)',
    'rgb(220 205 173 / 0.95)',
    'rgb(206 189 156 / 0.95)'
  ),
  goldenHour: createPanelGradient(
    'rgb(189 220 244 / 0.96)',
    'rgb(249 213 152 / 0.96)',
    'rgb(226 205 165 / 0.96)',
    'rgb(209 187 149 / 0.96)'
  ),
  sunset: createPanelGradient(
    'rgb(238 150 115 / 0.96)',
    'rgb(117 117 176 / 0.96)',
    'rgb(210 181 147 / 0.96)',
    'rgb(191 162 131 / 0.96)'
  ),
  dusk: createPanelGradient(
    'rgb(85 101 145 / 0.96)',
    'rgb(104 121 150 / 0.96)',
    'rgb(169 149 126 / 0.96)',
    'rgb(150 132 112 / 0.96)'
  )
};

@Component({
  selector: 'app-frog-column',
  imports: [NgOptimizedImage],
  templateUrl: './frog-column.html',
  styleUrl: './frog-column.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'frog-column'
  }
})
export class FrogColumnComponent implements OnDestroy {
  protected readonly titleId = 'frog-title';
  protected readonly isAttacking = signal(false);
  protected readonly isJumping = signal(false);
  protected readonly isPreviewHopping = signal(false);
  protected readonly isHitHurt = signal(false);
  protected readonly isGameMode = signal(false);
  protected readonly obstacles = signal<Obstacle[]>([]);
  protected readonly happiness = signal(82);
  protected readonly showFood = signal(false);
  protected readonly now = signal(new Date());
  protected readonly isExploding = computed(() => this.happiness() === 0);
  protected readonly isPersistentHurt = computed(
    () => this.happiness() > 0 && this.happiness() < 50
  );
  protected readonly showBaseExplosion = computed(
    () => !this.isGameMode() && this.isExploding()
  );
  protected readonly showBaseHurt = computed(
    () => !this.isGameMode() && this.isPersistentHurt()
  );
  protected readonly flowerSeasonClass = computed(() =>
    this.getFlowerSeasonClass(this.now().getMonth())
  );
  protected readonly groundSeasonClass = computed(() =>
    this.getGroundSeasonClass(this.now().getMonth())
  );
  protected readonly sunTimes = computed(() =>
    SunCalc.getTimes(this.now(), FROG_LATITUDE, FROG_LONGITUDE)
  );
  protected readonly skyPhase = computed(() => resolveSkyPhase(this.now(), this.sunTimes()));
  protected readonly panelGradient = computed(() => PANEL_GRADIENTS_BY_PHASE[this.skyPhase()]);
  protected readonly backgroundTransitionMs = BACKGROUND_TRANSITION_MS;
  protected readonly sunPosition = computed<CelestialPosition>(() => {
    const sun = SunCalc.getPosition(this.now(), FROG_LATITUDE, FROG_LONGITUDE);
    return toCelestialPosition(sun.azimuth, sun.altitude);
  });
  protected readonly moonPosition = computed<CelestialPosition>(() => {
    const moon = SunCalc.getMoonPosition(this.now(), FROG_LATITUDE, FROG_LONGITUDE);
    return toCelestialPosition(moon.azimuth, moon.altitude);
  });
  protected readonly moonBackgroundPosition = computed(() => {
    const moonIllumination = SunCalc.getMoonIllumination(this.now());
    const frameIndex = moonPhaseToFrameIndex(moonIllumination.phase);
    return frameIndexToBackgroundPosition(frameIndex);
  });
  protected readonly obstacleTravelMs = OBSTACLE_TRAVEL_MS;

  private readonly platformId = inject(PLATFORM_ID);
  private feedTimeout: ReturnType<typeof setTimeout> | null = null;
  private happinessDecayTimeout: ReturnType<typeof setTimeout> | null = null;
  private clockTimeout: ReturnType<typeof setTimeout> | null = null;
  private jumpTimeout: ReturnType<typeof setTimeout> | null = null;
  private previewHopTimeout: ReturnType<typeof setTimeout> | null = null;
  private hitHurtTimeout: ReturnType<typeof setTimeout> | null = null;
  private gameTimeouts: Array<ReturnType<typeof setTimeout>> = [];
  private gameEndTimeout: ReturnType<typeof setTimeout> | null = null;
  private jumpStartedAtMs: number | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.scheduleNextHappinessDecay();
      this.scheduleNextClockUpdate();
    }
  }

  protected feedToad(): void {
    if (this.isAttacking() || this.isGameMode()) {
      return;
    }

    this.clearFeedTimeout();
    this.isAttacking.set(true);
    this.showFood.set(true);
    this.happiness.update((value) => Math.min(100, value + 10));

    this.feedTimeout = setTimeout(() => {
      this.isAttacking.set(false);
      this.showFood.set(false);
      this.feedTimeout = null;
    }, ATTACK_CYCLE_MS);
  }

  protected startGameMode(): void {
    if (this.isGameMode()) {
      return;
    }

    this.isGameMode.set(true);
    this.showFood.set(false);
    this.isAttacking.set(false);
    this.runObstacleSequence();
  }

  protected exitGameMode(): void {
    this.isGameMode.set(false);
    this.isJumping.set(false);
    this.isHitHurt.set(false);
    this.obstacles.set([]);
    this.clearJumpTimeout();
    this.clearHitHurtTimeout();
    this.clearGameTimeouts();
    this.clearGameEndTimeout();
    this.jumpStartedAtMs = null;
  }

  protected jumpToad(): void {
    if (!this.isGameMode() || this.isJumping()) {
      return;
    }

    this.clearJumpTimeout();
    this.isJumping.set(true);
    this.jumpStartedAtMs = Date.now();
    this.jumpTimeout = setTimeout(() => {
      this.isJumping.set(false);
      this.jumpTimeout = null;
      this.jumpStartedAtMs = null;
    }, JUMP_CYCLE_MS);
  }

  protected onFrogClick(): void {
    if (this.isGameMode()) {
      this.jumpToad();
      return;
    }

    if (this.isAttacking() || this.isPreviewHopping()) {
      return;
    }

    this.clearPreviewHopTimeout();
    this.isPreviewHopping.set(true);
    this.previewHopTimeout = setTimeout(() => {
      this.isPreviewHopping.set(false);
      this.previewHopTimeout = null;
    }, JUMP_CYCLE_MS);
  }

  ngOnDestroy(): void {
    this.clearFeedTimeout();
    this.clearHappinessDecayTimeout();
    this.clearClockTimeout();
    this.clearJumpTimeout();
    this.clearPreviewHopTimeout();
    this.clearHitHurtTimeout();
    this.clearGameTimeouts();
    this.clearGameEndTimeout();
  }

  private clearFeedTimeout(): void {
    if (this.feedTimeout !== null) {
      clearTimeout(this.feedTimeout);
      this.feedTimeout = null;
    }
  }

  private scheduleNextHappinessDecay(): void {
    this.clearHappinessDecayTimeout();

    const now = new Date();
    if (this.isInQuietHours(now)) {
      this.happinessDecayTimeout = setTimeout(() => {
        this.scheduleNextHappinessDecay();
      }, this.getMsUntilActiveWindow(now));
      return;
    }

    this.happinessDecayTimeout = setTimeout(() => {
      const executedAt = new Date();
      if (!this.isInQuietHours(executedAt)) {
        this.happiness.update((value) => Math.max(0, value - HAPPINESS_DECAY_STEP));
      }
      this.scheduleNextHappinessDecay();
    }, HAPPINESS_DECAY_INTERVAL_MS);
  }

  private isInQuietHours(date: Date): boolean {
    const minutes = date.getHours() * 60 + date.getMinutes();
    return minutes >= QUIET_HOURS_START_MINUTES || minutes < QUIET_HOURS_END_MINUTES;
  }

  private getMsUntilActiveWindow(now: Date): number {
    const target = new Date(now);
    const minutes = now.getHours() * 60 + now.getMinutes();

    if (minutes >= QUIET_HOURS_START_MINUTES) {
      target.setDate(target.getDate() + 1);
    }

    target.setHours(7, 30, 0, 0);
    return Math.max(0, target.getTime() - now.getTime());
  }

  private clearHappinessDecayTimeout(): void {
    if (this.happinessDecayTimeout !== null) {
      clearTimeout(this.happinessDecayTimeout);
      this.happinessDecayTimeout = null;
    }
  }

  private runObstacleSequence(): void {
    this.clearGameTimeouts();
    this.clearGameEndTimeout();

    const generatedObstacles: Obstacle[] = Array.from({ length: OBSTACLE_COUNT }, (_, index) => ({
      id: index + 1,
      delayMs: index * OBSTACLE_INTERVAL_MS,
      resolved: false
    }));
    this.obstacles.set(generatedObstacles);

    generatedObstacles.forEach((obstacle) => {
      const timeoutId = setTimeout(() => {
        this.resolveObstacle(obstacle.id);
      }, obstacle.delayMs + this.getObstacleCollisionCheckMs());
      this.gameTimeouts.push(timeoutId);
    });

    const totalGameDurationMs =
      (OBSTACLE_COUNT - 1) * OBSTACLE_INTERVAL_MS + OBSTACLE_TRAVEL_MS + 200;
    this.gameEndTimeout = setTimeout(() => {
      this.exitGameMode();
    }, totalGameDurationMs);
  }

  private resolveObstacle(obstacleId: number): void {
    if (!this.isGameMode()) {
      return;
    }

    const currentObstacles = this.obstacles();
    const targetObstacle = currentObstacles.find((obstacle) => obstacle.id === obstacleId);
    if (!targetObstacle || targetObstacle.resolved) {
      return;
    }

    this.obstacles.update((obstacles) =>
      obstacles.map((obstacle) =>
        obstacle.id === obstacleId ? { ...obstacle, resolved: true } : obstacle
      )
    );

    if (this.isSuccessfulJumpAtMidpoint()) {
      this.updateHappiness(5);
      return;
    }

    if (this.isJumping() && this.jumpStartedAtMs !== null) {
      const remainingJumpMs = this.getRemainingJumpMs();
      const timeoutId = setTimeout(() => {
        this.applyMissedObstaclePenalty();
      }, remainingJumpMs);
      this.gameTimeouts.push(timeoutId);
      return;
    }

    this.applyMissedObstaclePenalty();
  }

  private triggerHitHurt(): void {
    this.clearHitHurtTimeout();
    this.isHitHurt.set(true);
    this.hitHurtTimeout = setTimeout(() => {
      this.isHitHurt.set(false);
      this.hitHurtTimeout = null;
    }, HIT_HURT_CYCLE_MS);
  }

  private updateHappiness(delta: number): void {
    this.happiness.update((value) => Math.max(0, Math.min(100, value + delta)));
  }

  private applyMissedObstaclePenalty(): void {
    if (!this.isGameMode()) {
      return;
    }

    this.updateHappiness(-5);
    this.triggerHitHurt();
  }

  private isSuccessfulJumpAtMidpoint(): boolean {
    if (!this.isJumping() || this.jumpStartedAtMs === null) {
      return false;
    }

    const elapsedMs = Date.now() - this.jumpStartedAtMs;
    const progress = Math.max(0, Math.min(1, elapsedMs / JUMP_CYCLE_MS));
    return progress > JUMP_UNSAFE_START_RATIO && progress < JUMP_UNSAFE_END_RATIO;
  }

  private getObstacleCollisionCheckMs(): number {
    return Math.round(OBSTACLE_TRAVEL_MS * OBSTACLE_COLLISION_CHECK_RATIO);
  }

  private getRemainingJumpMs(): number {
    if (this.jumpStartedAtMs === null) {
      return 0;
    }

    const elapsedMs = Date.now() - this.jumpStartedAtMs;
    return Math.max(0, JUMP_CYCLE_MS - elapsedMs);
  }

  private scheduleNextClockUpdate(): void {
    this.clearClockTimeout();
    const now = new Date();
    this.now.set(now);
    this.clockTimeout = setTimeout(() => {
      this.scheduleNextClockUpdate();
    }, this.getMsUntilNextClockTick(now));
  }

  private getMsUntilNextClockTick(now: Date): number {
    const nextTick = new Date(now);
    nextTick.setSeconds(0, 0);
    const minute = now.getMinutes();
    const nextMinute =
      Math.floor(minute / CLOCK_UPDATE_INTERVAL_MINUTES) * CLOCK_UPDATE_INTERVAL_MINUTES +
      CLOCK_UPDATE_INTERVAL_MINUTES;
    nextTick.setMinutes(nextMinute);
    return Math.max(1000, nextTick.getTime() - now.getTime());
  }

  private clearClockTimeout(): void {
    if (this.clockTimeout !== null) {
      clearTimeout(this.clockTimeout);
      this.clockTimeout = null;
    }
  }

  private clearJumpTimeout(): void {
    if (this.jumpTimeout !== null) {
      clearTimeout(this.jumpTimeout);
      this.jumpTimeout = null;
    }
  }

  private clearPreviewHopTimeout(): void {
    if (this.previewHopTimeout !== null) {
      clearTimeout(this.previewHopTimeout);
      this.previewHopTimeout = null;
    }
  }

  private clearHitHurtTimeout(): void {
    if (this.hitHurtTimeout !== null) {
      clearTimeout(this.hitHurtTimeout);
      this.hitHurtTimeout = null;
    }
  }

  private clearGameTimeouts(): void {
    this.gameTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.gameTimeouts = [];
  }

  private clearGameEndTimeout(): void {
    if (this.gameEndTimeout !== null) {
      clearTimeout(this.gameEndTimeout);
      this.gameEndTimeout = null;
    }
  }

  private getFlowerSeasonClass(monthIndex: number): FlowerSeasonClass {
    if (monthIndex >= 10 || monthIndex <= 1) {
      return 'frog-flower-winter';
    }

    if (monthIndex >= 2 && monthIndex <= 4) {
      return 'frog-flower-spring';
    }

    if (monthIndex >= 5 && monthIndex <= 7) {
      return 'frog-flower-summer';
    }

    return 'frog-flower-autumn';
  }

  private getGroundSeasonClass(monthIndex: number): GroundSeasonClass {
    if (monthIndex >= 10 || monthIndex <= 1) {
      return 'frog-ground-winter';
    }

    if (monthIndex >= 2 && monthIndex <= 4) {
      return 'frog-ground-spring';
    }

    if (monthIndex >= 5 && monthIndex <= 7) {
      return 'frog-ground-summer';
    }

    return 'frog-ground-autumn';
  }
}

function createPanelGradient(
  skyTop: string,
  skyBottom: string,
  groundTop: string,
  groundBottom: string
): string {
  return `linear-gradient(180deg, ${skyTop} 0%, ${skyBottom} ${SKY_GROUND_SPLIT_PERCENT}%, ${groundTop} ${SKY_GROUND_SPLIT_PERCENT}%, ${groundBottom} 100%)`;
}
