import { apiRequest } from './client';
import type {
  ActivityEnergyEstimate,
  ActivityEntry,
  ActivityType,
  AuthResponse,
  DailySummary,
  DailyTarget,
  DayOverview,
  Food,
  FoodEntry,
  FoodUnit,
  MealType,
  NutritionProvider,
  NutritionProviderCheck,
  Paginated,
  ParsedFood,
  Profile,
  Progress,
  WeightSummary,
} from './types';

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
  timezone?: string;
  locale?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleSignInInput {
  idToken: string;
  timezone?: string;
  locale?: string;
}

export const authApi = {
  register: (input: RegisterInput) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input }),
  login: (input: LoginInput) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input }),
  google: (input: GoogleSignInInput) =>
    apiRequest<AuthResponse>('/auth/google', { method: 'POST', body: input }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST', skipAuthRetry: true }),
};

export interface UpdateProfileInput {
  displayName?: string | null;
  sex?: Profile['sex'];
  birthDate?: string | null;
  heightCm?: number | null;
  targetWeightKg?: number | null;
  activityLevel?: Profile['activityLevel'];
  goal?: Profile['goal'];
  unitSystem?: Profile['unitSystem'];
  timezone?: string;
  locale?: string;
}

export interface CompleteOnboardingInput {
  displayName?: string | null;
  sex: NonNullable<Profile['sex']>;
  birthDate: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg?: number | null;
  activityLevel: Profile['activityLevel'];
  goal: Profile['goal'];
  unitSystem?: Profile['unitSystem'];
  timezone?: string;
  locale?: string;
  calorieTargetKcal?: number | null;
}

export interface UpdateCalorieTargetInput {
  calorieTargetKcal?: number | null;
  proteinTargetG?: number | null;
  carbsTargetG?: number | null;
  fatTargetG?: number | null;
}

export const profileApi = {
  get: () => apiRequest<Profile>('/profile'),
  update: (input: UpdateProfileInput) =>
    apiRequest<Profile>('/profile', { method: 'PATCH', body: input }),
  updateCalorieTarget: (input: UpdateCalorieTargetInput) =>
    apiRequest<Profile>('/profile/calorie-target', { method: 'PUT', body: input }),
  completeOnboarding: (input: CompleteOnboardingInput) =>
    apiRequest<Profile>('/profile/onboarding', { method: 'POST', body: input }),
};

export const targetsApi = {
  forDate: (date?: string) => apiRequest<DailyTarget>('/targets', { query: { date } }),
  setForDate: (date: string, calorieTargetKcal: number) =>
    apiRequest<DailyTarget>(`/targets/${date}`, { method: 'PUT', body: { calorieTargetKcal } }),
  clearForDate: (date: string) => apiRequest<DailyTarget>(`/targets/${date}`, { method: 'DELETE' }),
};

export interface FoodInput {
  name: string;
  brand?: string | null;
  servingSize: number;
  servingUnit: FoodUnit;
  energyKcal: number;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
}

export const foodsApi = {
  list: (search?: string, limit = 50) =>
    apiRequest<Paginated<Food>>('/foods', { query: { search, limit } }),
  recent: (limit = 8) => apiRequest<Food[]>('/foods/recent', { query: { limit } }),
  create: (input: FoodInput) => apiRequest<Food>('/foods', { method: 'POST', body: input }),
  update: (id: string, input: Partial<FoodInput>) =>
    apiRequest<Food>(`/foods/${id}`, { method: 'PATCH', body: input }),
  archive: (id: string) => apiRequest<void>(`/foods/${id}`, { method: 'DELETE' }),
};

export interface FoodEntryInput {
  foodId?: string;
  name?: string;
  meal: MealType;
  amount: number;
  unit: FoodUnit;
  energyKcal?: number;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  notes?: string | null;
  date?: string;
}

export interface NutritionProviderInput {
  baseUrl: string;
  modelName: string;
  apiKey: string;
}

export const nutritionProviderApi = {
  get: () => apiRequest<NutritionProvider>('/nutrition-provider'),
  save: (input: NutritionProviderInput) =>
    apiRequest<NutritionProvider>('/nutrition-provider', { method: 'PUT', body: input }),
  remove: () => apiRequest<void>('/nutrition-provider', { method: 'DELETE' }),
  check: () => apiRequest<NutritionProviderCheck>('/nutrition-provider/check', { method: 'POST' }),
};

export const foodEntriesApi = {
  parse: (text: string, locale: string) =>
    apiRequest<ParsedFood>('/food-entries/parse', { method: 'POST', body: { text, locale } }),
  list: (date: string) => apiRequest<FoodEntry[]>('/food-entries', { query: { date } }),
  create: (input: FoodEntryInput) =>
    apiRequest<FoodEntry>('/food-entries', { method: 'POST', body: input }),
  update: (id: string, input: Partial<FoodEntryInput>) =>
    apiRequest<FoodEntry>(`/food-entries/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => apiRequest<void>(`/food-entries/${id}`, { method: 'DELETE' }),
};

export interface ActivityEntryInput {
  activityTypeId: string;
  title?: string | null;
  durationSec?: number | null;
  distanceM?: number | null;
  avgSpeedKmh?: number | null;
  inclinePercent?: number | null;
  sets?: number | null;
  reps?: number | null;
  intensity?: ActivityEntry['intensity'];
  energyKcal?: number | null;
  notes?: string | null;
  date?: string;
}

export type ActivityEstimateInput = Omit<ActivityEntryInput, 'title' | 'notes' | 'energyKcal'>;

export const activitiesApi = {
  types: () => apiRequest<ActivityType[]>('/activity-types'),
  list: (date: string) => apiRequest<ActivityEntry[]>('/activity-entries', { query: { date } }),
  estimate: (input: ActivityEstimateInput) =>
    apiRequest<ActivityEnergyEstimate>('/activity-entries/estimate', {
      method: 'POST',
      body: input,
    }),
  create: (input: ActivityEntryInput) =>
    apiRequest<ActivityEntry>('/activity-entries', { method: 'POST', body: input }),
  update: (id: string, input: Partial<ActivityEntryInput>) =>
    apiRequest<ActivityEntry>(`/activity-entries/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => apiRequest<void>(`/activity-entries/${id}`, { method: 'DELETE' }),
};

export const weightApi = {
  summary: (from?: string, to?: string) =>
    apiRequest<WeightSummary>('/weight', { query: { from, to } }),
  upsert: (date: string, weightKg: number, note?: string | null) =>
    apiRequest<{ id: string }>(`/weight/${date}`, { method: 'PUT', body: { weightKg, note } }),
  remove: (date: string) => apiRequest<void>(`/weight/${date}`, { method: 'DELETE' }),
};

export const summaryApi = {
  dashboard: (date?: string) => apiRequest<DailySummary>('/dashboard', { query: { date } }),
  history: (from: string, to: string) =>
    apiRequest<DayOverview[]>('/history', { query: { from, to } }),
  progress: (from: string, to: string) =>
    apiRequest<Progress>('/progress', { query: { from, to } }),
};
