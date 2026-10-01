import { describe, expect, it } from 'vitest';

import { isSamePlace, movePlan, plansForDay, resolveDrop } from './placement';

const PLANS = [
  { id: 'a', date: '2026-03-02', position: 0 },
  { id: 'b', date: '2026-03-02', position: 1 },
  { id: 'c', date: '2026-03-02', position: 2 },
  { id: 'd', date: '2026-03-03', position: 0 },
];

describe('resolveDrop', () => {
  it('appends to the end of a day', () => {
    expect(resolveDrop(PLANS, { type: 'day', date: '2026-03-02' })).toEqual({
      date: '2026-03-02',
      position: 3,
    });
  });

  it('does not count the plan being moved within its own day', () => {
    expect(resolveDrop(PLANS, { type: 'day', date: '2026-03-02' }, 'a')).toEqual({
      date: '2026-03-02',
      position: 2,
    });
  });

  it('places a plan before the one it is dropped on', () => {
    expect(resolveDrop(PLANS, { type: 'slot', planId: 'c' }, 'a')).toEqual({
      date: '2026-03-02',
      position: 1,
    });
    expect(resolveDrop(PLANS, { type: 'slot', planId: 'd' }, 'b')).toEqual({
      date: '2026-03-03',
      position: 0,
    });
  });

  it('ignores a plan dropped on itself', () => {
    expect(resolveDrop(PLANS, { type: 'slot', planId: 'b' }, 'b')).toBeNull();
  });
});

describe('isSamePlace', () => {
  it('recognises a drop that changes nothing', () => {
    expect(isSamePlace(PLANS, 'c', { date: '2026-03-02', position: 2 })).toBe(true);
    expect(isSamePlace(PLANS, 'c', { date: '2026-03-03', position: 0 })).toBe(false);
  });
});

describe('movePlan', () => {
  it('moves a plan to another day and closes the gap it leaves', () => {
    const moved = movePlan(PLANS, 'a', { date: '2026-03-03', position: 1 });

    expect(plansForDay(moved, '2026-03-02').map((plan) => [plan.id, plan.position])).toEqual([
      ['b', 0],
      ['c', 1],
    ]);
    expect(plansForDay(moved, '2026-03-03').map((plan) => [plan.id, plan.position])).toEqual([
      ['d', 0],
      ['a', 1],
    ]);
  });

  it('reorders a plan within its day', () => {
    const moved = movePlan(PLANS, 'c', { date: '2026-03-02', position: 0 });

    expect(plansForDay(moved, '2026-03-02').map((plan) => plan.id)).toEqual(['c', 'a', 'b']);
  });
});
