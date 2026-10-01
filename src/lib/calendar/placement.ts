export interface PlacedPlan {
  id: string;
  date: string;
  position: number;
}

export type DropTarget = { type: 'day'; date: string } | { type: 'slot'; planId: string };

export interface Placement {
  date: string;
  position: number;
}

export const plansForDay = <T extends PlacedPlan>(plans: T[], date: string): T[] =>
  plans.filter((plan) => plan.date === date).sort((a, b) => a.position - b.position);

export const resolveDrop = (
  plans: PlacedPlan[],
  target: DropTarget,
  movingId?: string,
): Placement | null => {
  if (target.type === 'day') {
    const siblings = plansForDay(plans, target.date).filter((plan) => plan.id !== movingId);

    return { date: target.date, position: siblings.length };
  }

  const anchor = plans.find((plan) => plan.id === target.planId);

  if (!anchor || anchor.id === movingId) {
    return null;
  }

  const siblings = plansForDay(plans, anchor.date).filter((plan) => plan.id !== movingId);

  return { date: anchor.date, position: siblings.findIndex((plan) => plan.id === anchor.id) };
};

export const isSamePlace = (plans: PlacedPlan[], id: string, placement: Placement): boolean => {
  const plan = plans.find((item) => item.id === id);

  if (!plan || plan.date !== placement.date) {
    return false;
  }

  return plansForDay(plans, plan.date).findIndex((item) => item.id === id) === placement.position;
};

export const movePlan = <T extends PlacedPlan>(
  plans: T[],
  id: string,
  placement: Placement,
): T[] => {
  const moving = plans.find((plan) => plan.id === id);

  if (!moving) {
    return plans;
  }

  const target = plansForDay(plans, placement.date).filter((plan) => plan.id !== id);

  target.splice(Math.min(placement.position, target.length), 0, {
    ...moving,
    date: placement.date,
  });

  const source =
    moving.date === placement.date
      ? []
      : plansForDay(plans, moving.date).filter((plan) => plan.id !== id);

  const renumbered = new Map<string, T>();

  [target, source].forEach((day) =>
    day.forEach((plan, position) => renumbered.set(plan.id, { ...plan, position })),
  );

  return plans.map((plan) => renumbered.get(plan.id) ?? plan);
};
