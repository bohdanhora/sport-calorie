'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartTooltip } from '@/components/charts/chart-tooltip';

const CHART_HEIGHT = 200;
const AXIS_WIDTH = 52;
const HEADROOM = 1.08;
const ANIMATION_MS = 420;

const axisProps = {
  stroke: 'var(--chart-grid)',
  tick: { fontSize: 11, fill: 'var(--foreground-subtle)' },
  tickLine: false,
  axisLine: false,
} as const;

interface BaseChartProps {
  data: { date: string; value: number }[];
  formatValue: (value: number) => string;
  formatDate: (date: string) => string;
  formatAxisValue?: (value: number) => string;
  seriesName: string;
  /** A CSS colour, normally one of the --chart-* tokens. */
  color?: string;
}

export const DailyBarChart = ({
  data,
  formatValue,
  formatDate,
  formatAxisValue,
  seriesName,
  color = 'var(--chart-1)',
  referenceValue,
}: BaseChartProps & { referenceValue?: number }) => {
  const dataMax = data.reduce((max, point) => Math.max(max, point.value), 0);
  const upperBound = Math.max(dataMax, referenceValue ?? 0) * HEADROOM;

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={24} {...axisProps} />
        <YAxis
          width={AXIS_WIDTH}
          domain={[0, upperBound > 0 ? upperBound : 'auto']}
          tickFormatter={formatAxisValue ?? formatValue}
          {...axisProps}
        />
        <Tooltip
          cursor={{ fill: 'var(--surface-muted)' }}
          content={<ChartTooltip formatValue={formatValue} formatDate={formatDate} />}
        />
        {referenceValue ? (
          <ReferenceLine
            y={referenceValue}
            stroke="var(--chart-2)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        ) : null}
        <Bar
          dataKey="value"
          name={seriesName}
          fill={color}
          radius={[3, 3, 0, 0]}
          animationDuration={ANIMATION_MS}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Weight moves in fractions of a kilogram, so the line alone reads as a flat
 * scribble. The fill under it gives the eye the shape of the trend.
 */
export const DailyAreaChart = ({
  data,
  formatValue,
  formatDate,
  formatAxisValue,
  seriesName,
  color = 'var(--chart-1)',
  referenceValue,
}: BaseChartProps & { referenceValue?: number }) => {
  const gradientId = `area-${seriesName.replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={24} {...axisProps} />
        <YAxis
          width={AXIS_WIDTH}
          domain={['dataMin - 1', 'dataMax + 1']}
          tickFormatter={formatAxisValue ?? formatValue}
          {...axisProps}
        />
        <Tooltip
          cursor={{ stroke: 'var(--chart-grid)' }}
          content={<ChartTooltip formatValue={formatValue} formatDate={formatDate} />}
        />
        {referenceValue ? (
          <ReferenceLine
            y={referenceValue}
            stroke="var(--chart-4)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="value"
          name={seriesName}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          activeDot={{ r: 4 }}
          animationDuration={ANIMATION_MS}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
