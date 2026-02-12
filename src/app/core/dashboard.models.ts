export interface WidgetShell {
  id: 'calendar' | 'shopping' | 'workouts';
  title: string;
  description: string;
  nextStep: string;
}

export interface StatusRow {
  label: string;
  value: string;
}
