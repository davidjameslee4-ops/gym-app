// A small line chart drawn with plain React Native views (no chart library, no native module),
// so it works the same on the Android app and on the iPhone web app.
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChartPoint, Domain, formatDay, formatDayShort, formatValue, niceDomain } from '@/src/utils/bodyStats';

interface Colors {
  primary: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
}

interface Props {
  points: ChartPoint[];
  unit: string;
  colors: Colors;
  goal?: number;
  height?: number;
}

const LEFT = 46;
const RIGHT = 14;
const TOP = 14;
const BOTTOM = 8;
const LABEL_ROW = 22;
const DOT = 9;
const HIT = 26;

export default function BodyLineChart({ points, unit, colors, goal, height = 170 }: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  const geo = useMemo(() => {
    if (!points.length || width <= 0) return null;
    const dom: Domain = niceDomain(points.map(p => p.v), goal);
    const { lo, hi } = dom;
    const tmin = points[0].t;
    const tmax = points[points.length - 1].t;
    const pw = Math.max(1, width - LEFT - RIGHT);
    const ph = Math.max(1, height - TOP - BOTTOM);
    const x = (t: number) => LEFT + (tmax === tmin ? pw / 2 : ((t - tmin) / (tmax - tmin)) * pw);
    const y = (v: number) => TOP + ph - ((v - lo) / (hi - lo)) * ph;
    return { lo, hi, ticks: dom.ticks, pw, ph, x, y, xs: points.map(p => x(p.t)), ys: points.map(p => y(p.v)) };
  }, [points, width, height, goal]);

  const canvas = { width: '100%' as const, height, position: 'relative' as const };

  if (!geo) {
    return <View onLayout={onLayout} style={canvas} />;
  }

  const ticks = geo.ticks;
  const selectedPoint = points.find(p => p.id === selected) || null;
  const single = points.length === 1;

  return (
    <View onLayout={onLayout}>
      <View style={canvas}>
        {/* y-axis: three gridlines with values */}
        {ticks.map((tv, i) => {
          const ty = geo.y(tv);
          return (
            <React.Fragment key={`tick-${i}`}>
              <View
                style={{
                  position: 'absolute',
                  left: LEFT,
                  right: RIGHT,
                  top: ty,
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: colors.border,
                }}
              />
              <Text
                style={[
                  styles.axisText,
                  { color: colors.textSecondary, top: ty - 7, left: 0, width: LEFT - 6 },
                ]}
                numberOfLines={1}
              >
                {formatValue(tv)}
              </Text>
            </React.Fragment>
          );
        })}

        {/* goal line */}
        {goal !== undefined && goal > 0 && (
          <>
            <View
              style={{
                position: 'absolute',
                left: LEFT,
                right: RIGHT,
                top: geo.y(goal),
                borderTopWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.success,
              }}
            />
            <Text
              style={[
                styles.goalText,
                { color: colors.success, top: geo.y(goal) - 17, right: RIGHT },
              ]}
            >
              Goal {formatValue(goal)} {unit}
            </Text>
          </>
        )}

        {/* the line between neighbouring points */}
        {points.map((p, i) => {
          if (i === points.length - 1) return null;
          const x1 = geo.xs[i];
          const y1 = geo.ys[i];
          const x2 = geo.xs[i + 1];
          const y2 = geo.ys[i + 1];
          const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          return (
            <View
              key={`seg-${p.id}`}
              style={{
                position: 'absolute',
                left: mx - len / 2,
                top: my - 1,
                width: len,
                height: 2,
                borderRadius: 1,
                backgroundColor: colors.primary,
                transform: [{ rotate: `${ang}deg` }],
              }}
            />
          );
        })}

        {/* points: tap one to see its date and value */}
        {points.map((p, i) => {
          const isSel = p.id === selected;
          return (
            <Pressable
              key={p.id}
              accessibilityLabel={`${formatDay(p.date)}, ${formatValue(p.v)} ${unit}`}
              onPress={() => setSelected(isSel ? null : p.id)}
              hitSlop={4}
              style={{
                position: 'absolute',
                left: geo.xs[i] - HIT / 2,
                top: geo.ys[i] - HIT / 2,
                width: HIT,
                height: HIT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: isSel ? DOT + 4 : DOT,
                  height: isSel ? DOT + 4 : DOT,
                  borderRadius: (isSel ? DOT + 4 : DOT) / 2,
                  backgroundColor: colors.primary,
                  borderWidth: isSel ? 2 : 0,
                  borderColor: colors.text,
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.tip, { color: colors.textSecondary }]} numberOfLines={1}>
        {selectedPoint
          ? `${formatDay(selectedPoint.date)}: ${formatValue(selectedPoint.v)} ${unit}`
          : 'Tap a point to see its date and value'}
      </Text>

      <View style={[styles.labelRow, { paddingLeft: LEFT, paddingRight: RIGHT }]}>
        <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
          {formatDayShort(points[0].date)}
        </Text>
        {!single && (
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
            {formatDayShort(points[points.length - 1].date)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axisText: { fontSize: 11, position: 'absolute' },
  rowLabel: { fontSize: 11 },
  goalText: { fontSize: 11, fontWeight: '600', position: 'absolute' },
  tip: { fontSize: 13, marginTop: 6, textAlign: 'center', minHeight: 18 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: LABEL_ROW,
    alignItems: 'center',
  },
});
