'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
}

export const DailyBarChart = ({
  data,
  formatValue,
  formatDate,
  formatAxisValue,
  seriesName,
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
          fill="var(--chart-1)"
          radius={[3, 3, 0, 0]}
          animationDuration={ANIMATION_MS}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const DailyLineChart = ({
  data,
  formatValue,
  formatDate,
  formatAxisValue,
  seriesName,
}: BaseChartProps) => (
  <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
    <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
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
      <Line
        type="monotone"
        dataKey="value"
        name={seriesName}
        stroke="var(--chart-1)"
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4 }}
        animationDuration={ANIMATION_MS}
      />
    </LineChart>
  </ResponsiveContainer>
);
