export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
}

export type WidgetName = 'calendar' | 'shopping' | 'beat81' | 'frog';
export type WidgetStatus = 'ready' | 'pending' | 'degraded';

export interface WidgetHealth {
  widget: WidgetName;
  status: WidgetStatus;
  message: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
}

export interface ShoppingItem {
  id: string;
  title: string;
  checked: boolean;
}

export interface WorkoutSlot {
  id: string;
  title: string;
  startsAt: string;
  location: string;
}

export interface Beat81EventType {
  id: string;
  name: string;
}

export interface Beat81EventTypesPayload {
  items: Beat81EventType[];
  count: number;
  sourceTotal: number | null;
  fetchedAt: string;
}

export interface Beat81Event {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  trainerName: string | null;
  trainerImageUrl: string | null;
  maxParticipants: number | null;
  currentParticipants: number | null;
  openSpots: number | null;
}

export interface Beat81EventsPayload {
  items: Beat81Event[];
  count: number;
  sourceTotal: number | null;
  fetchedAt: string;
}

export interface DashboardPayload {
  generatedAt: string;
  timezone: string;
  calendar: CalendarEvent[];
  shopping: ShoppingItem[];
  workouts: WorkoutSlot[];
  beat81EventTypes: Beat81EventType[];
  beat81Events: Beat81Event[];
  health: WidgetHealth[];
}

export interface HealthPayload {
  status: 'ok';
  service: 'dashboard-bff';
  generatedAt: string;
}
