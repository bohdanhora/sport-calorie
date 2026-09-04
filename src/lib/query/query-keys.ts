export const queryKeys = {
  profile: ['profile'] as const,
  nutritionProvider: ['nutrition-provider'] as const,
  target: (date: string) => ['target', date] as const,
  dashboard: (date: string) => ['dashboard', date] as const,
  foods: (search: string) => ['foods', search] as const,
  recentFoods: ['foods', 'recent'] as const,
  foodEntries: (date: string) => ['food-entries', date] as const,
  activityTypes: ['activity-types'] as const,
  activityEntries: (date: string) => ['activity-entries', date] as const,
  weight: (from?: string, to?: string) => ['weight', from ?? '', to ?? ''] as const,
  history: (from: string, to: string) => ['history', from, to] as const,
  progress: (from: string, to: string) => ['progress', from, to] as const,
};

export const DAY_SCOPED_KEYS = [
  'dashboard',
  'history',
  'progress',
  'food-entries',
  'activity-entries',
  'weight',
] as const;
