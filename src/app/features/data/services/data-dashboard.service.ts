import { Injectable, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';

import type { DataDashboardPayload } from '../models/data-dashboard.models';

@Injectable({ providedIn: 'root' })
export class DataDashboardService {
  readonly dashboardResource = httpResource<DataDashboardPayload>(() => '/api/dashboard');

  readonly calendarEvents = computed(() => this.dashboardResource.value()?.calendar ?? []);
  readonly beat81Events = computed(() => this.dashboardResource.value()?.beat81Events ?? []);
  readonly health = computed(() => this.dashboardResource.value()?.health ?? []);
}
