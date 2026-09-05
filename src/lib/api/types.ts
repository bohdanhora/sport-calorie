export type BiologicalSex = 'MALE' | 'FEMALE';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type FitnessGoal = 'LOSE_WEIGHT' | 'MAINTAIN_WEIGHT' | 'GAIN_WEIGHT';
export type UnitSystem = 'METRIC' | 'IMPERIAL';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type FoodUnit = 'GRAM' | 'MILLILITER' | 'PIECE' | 'SERVING';
export type FoodSource = 'MANUAL' | 'EXTERNAL';
export type ActivityCategory = 'WALKING' | 'CARDIO' | 'STRENGTH' | 'MOBILITY' | 'OTHER';
export type Intensity = 'LOW' | 'MODERATE' | 'HIGH';
export type EnergySource = 'ESTIMATED' | 'MANUAL';
export type CalorieTargetSource = 'RECOMMENDED' | 'MANUAL';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  timezone: string;
  locale: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

export interface EnergyProfile {
  isComplete: boolean;
  missingFields: string[];
  bmrKcal: number | null;
  tdeeKcal: number | null;
  recommendedCalorieTargetKcal: number | null;
  activityFactor: number;
  goalAdjustment: number;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  sex: BiologicalSex | null;
  birthDate: string | null;
  heightCm: number | null;
  targetWeightKg: number | null;
  currentWeightKg: number | null;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  unitSystem: UnitSystem;
  timezone: string;
  locale: string;
  manualCalorieTargetKcal: number | null;
  manualProteinTargetG: number | null;
  manualCarbsTargetG: number | null;
  manualFatTargetG: number | null;
  onboardingCompletedAt: string | null;
  energy: EnergyProfile;
}

export interface DailyTarget {
  date: string;
  calorieTargetKcal: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  source: CalorieTargetSource;
  isDayOverride: boolean;
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  servingSize: number;
  servingUnit: FoodUnit;
  energyKcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  source: FoodSource;
  isOwned: boolean;
  lastUsedAt: string | null;
  usageCount: number;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface FoodEntry {
  id: string;
  foodId: string | null;
  name: string;
  meal: MealType;
  amount: number;
  unit: FoodUnit;
  energyKcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  notes: string | null;
  consumedAt: string;
  date: string;
}

export interface ActivityType {
  id: string;
  slug: string;
  name: string;
  category: ActivityCategory;
  metModerate: number;
  tracksDuration: boolean;
  tracksDistance: boolean;
  tracksIncline: boolean;
  tracksReps: boolean;
  tracksSets: boolean;
  tracksIntensity: boolean;
  isOwned: boolean;
}

export interface ActivityEntry {
  id: string;
  activityType: ActivityType;
  title: string | null;
  durationSec: number | null;
  distanceM: number | null;
  avgSpeedKmh: number | null;
  inclinePercent: number | null;
  sets: number | null;
  reps: number | null;
  intensity: Intensity | null;
  energyKcal: number;
  energySource: EnergySource;
  notes: string | null;
  performedAt: string;
  date: string;
}

export interface ActivityEnergyEstimate {
  energyKcal: number;
  met: number;
  effectiveDurationSec: number;
  distanceM: number | null;
  avgSpeedKmh: number | null;
  basedOnWeightKg: number;
  usedFallbackWeight: boolean;
}

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
  note: string | null;
}

export interface WeightSummary {
  currentWeightKg: number | null;
  startingWeightKg: number | null;
  targetWeightKg: number | null;
  totalChangeKg: number | null;
  trendKgPerWeek: number | null;
  entries: WeightEntry[];
}

export interface CalorieSummary {
  targetKcal: number;
  consumedKcal: number;
  activityKcal: number;
  netKcal: number;
  remainingKcal: number;
  balanceKcal: number;
  targetProgress: number;
  targetSource: CalorieTargetSource;
}

export interface MacroAmount {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealSummary {
  meal: MealType;
  energyKcal: number;
  entries: FoodEntry[];
}

export interface WalkingSummary {
  sessions: number;
  distanceM: number;
  durationSec: number;
  avgSpeedKmh: number | null;
  energyKcal: number;
}

export interface DailySummary {
  date: string;
  calories: CalorieSummary;
  macros: { consumed: MacroAmount; target: MacroAmount };
  meals: MealSummary[];
  walking: WalkingSummary;
  activities: ActivityEntry[];
  weight: WeightEntry | null;
}

export interface DayOverview {
  date: string;
  consumedKcal: number;
  activityKcal: number;
  targetKcal: number;
  netKcal: number;
  walkingDistanceM: number;
  walkingDurationSec: number;
  activityCount: number;
  foodEntryCount: number;
  weightKg: number | null;
}

export interface ProgressAverages {
  daysLogged: number;
  avgConsumedKcal: number;
  avgActivityKcal: number;
  avgNetKcal: number;
  avgBalanceKcal: number;
  avgWalkingDistanceM: number;
  totalWalkingDistanceM: number;
  totalActivityKcal: number;
}

export interface ActivityBreakdown {
  activityTypeId: string;
  slug: string;
  name: string;
  category: ActivityCategory;
  sessions: number;
  durationSec: number;
  energyKcal: number;
}

export interface NutritionProvider {
  isConfigured: boolean;
  baseUrl: string | null;
  modelName: string | null;
  visionModelName: string | null;
  /** Whether photos can be sent at all. */
  supportsVision: boolean;
  /** Whether the catalog, rather than the user, is the one saying so. */
  visionModelKnown: boolean;
  visionOverride: boolean;
  apiKeyHint: string | null;
}

export interface CatalogProvider {
  id: string;
  label: string;
  baseUrl: string;
  apiKeysUrl: string;
  visionPrefixes: string[];
}

export interface ProviderModels {
  models: string[];
  visionModels: string[];
}

export interface NutritionProviderCheck {
  ok: boolean;
  message: string | null;
}

export interface ParsedFood {
  foodId: string;
  name: string;
  amount: number;
  unit: FoodUnit;
  energyKcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fromCache: boolean;
}

export interface Progress {
  range: { from: string; to: string };
  days: DayOverview[];
  weights: { date: string; weightKg: number }[];
  averages: ProgressAverages;
  activityBreakdown: ActivityBreakdown[];
}
