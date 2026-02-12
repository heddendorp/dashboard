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

const ATTACK_CYCLE_MS = 1000;
const HAPPINESS_DECAY_STEP = 10;
const HAPPINESS_DECAY_INTERVAL_MS = 2 * 60 * 60 * 1000;
const CLOCK_UPDATE_INTERVAL_MINUTES = 5;
const QUIET_HOURS_START_MINUTES = 22 * 60;
const QUIET_HOURS_END_MINUTES = 7 * 60 + 30;
const DAYTIME_START_MINUTES = 7 * 60 + 30;
const DAYTIME_END_MINUTES = 20 * 60;
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

let frogColumnInstanceCounter = 0;

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
  protected readonly isAttacking = signal(false);
  protected readonly happiness = signal(82);
  protected readonly showFood = signal(false);
  protected readonly now = signal(new Date());
  protected readonly isExploding = computed(() => this.happiness() === 0);
  protected readonly isHurt = computed(() => this.happiness() > 0 && this.happiness() < 50);
  protected readonly flowerSeasonClass = computed(() =>
    this.getFlowerSeasonClass(this.now().getMonth())
  );
  protected readonly groundSeasonClass = computed(() =>
    this.getGroundSeasonClass(this.now().getMonth())
  );
  protected readonly isDaytime = computed(() =>
    this.isInDaytimeWindowByMinutes(this.getMinutesSinceMidnight(this.now()))
  );

  private readonly platformId = inject(PLATFORM_ID);
  private feedTimeout: ReturnType<typeof setTimeout> | null = null;
  private happinessDecayTimeout: ReturnType<typeof setTimeout> | null = null;
  private clockTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.scheduleNextHappinessDecay();
      this.scheduleNextClockUpdate();
    }
  }

  protected feedToad(): void {
    if (this.isAttacking()) {
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

  ngOnDestroy(): void {
    this.clearFeedTimeout();
    this.clearHappinessDecayTimeout();
    this.clearClockTimeout();
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
      this.happiness.update((value) => Math.max(0, value - HAPPINESS_DECAY_STEP));
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

  private isInDaytimeWindowByMinutes(minutes: number): boolean {
    return minutes >= DAYTIME_START_MINUTES && minutes < DAYTIME_END_MINUTES;
  }

  private getMinutesSinceMidnight(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
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
