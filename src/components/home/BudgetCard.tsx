import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Type, FontFamily } from '../../constants/fonts';
import { Card } from '../ui';
import { ACTIVITIES, type ActivityKey, type Compensation, explainCompensation } from '../../lib/compensation';

interface Props {
  comp: Compensation;
  onAddActivity: (key: ActivityKey, minutes: number) => Promise<void> | void;
}

/** Shows the adjusted daily target with an honest one-line "why", plus a small
 * inline form to log activity (manual estimate, not measured). */
export function BudgetCard({ comp, onAddActivity }: Props) {
  const { colors, accent } = useTheme();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState<ActivityKey>('walking');
  const [minutes, setMinutes] = useState('30');
  const [busy, setBusy] = useState(false);

  const why = explainCompensation(comp);
  const mins = parseInt(minutes, 10);
  const valid = Number.isFinite(mins) && mins > 0 && mins <= 600;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onAddActivity(key, mins);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ marginBottom: 16, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ ...Type.bodyMd, color: colors.text.tertiary }}>Today's budget</Text>
          <Text style={{ fontFamily: FontFamily.instrumentSerif, fontSize: 28, color: colors.text.primary }}>
            {comp.target} kcal
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Log activity"
          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: accent }}
        >
          <Text style={{ fontFamily: FontFamily.geistSemiBold, color: '#fff', fontSize: 14 }}>
            {open ? 'Close' : 'Log activity'}
          </Text>
        </TouchableOpacity>
      </View>

      {why ? (
        <Text style={{ ...Type.bodyMd, color: colors.text.secondary, marginTop: 8 }}>{why}</Text>
      ) : (
        <Text style={{ ...Type.bodyMd, color: colors.text.secondary, marginTop: 8 }}>
          No adjustment yet. It appears after you log meals on earlier days or add activity.
        </Text>
      )}

      <Text style={{ ...Type.bodyMd, color: colors.text.tertiary, marginTop: 6, fontSize: 11 }}>
        Estimates only, not medical advice.
      </Text>

      {open && (
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ACTIVITIES.map((a) => {
              const on = a.key === key;
              return (
                <TouchableOpacity
                  key={a.key}
                  onPress={() => setKey(a.key)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: on ? accent : colors.surface.tertiary,
                    backgroundColor: on ? accent : 'transparent',
                  }}
                >
                  <Text style={{ color: on ? '#fff' : colors.text.primary, fontFamily: FontFamily.geistMedium, fontSize: 13 }}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <TextInput
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
              maxLength={3}
              accessibilityLabel="Minutes"
              style={{
                width: 80,
                borderWidth: 1,
                borderColor: colors.surface.tertiary,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                color: colors.text.primary,
              }}
            />
            <Text style={{ ...Type.bodyMd, color: colors.text.secondary, flex: 1 }}>minutes</Text>
            <TouchableOpacity
              onPress={submit}
              disabled={!valid || busy}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: accent,
                opacity: !valid || busy ? 0.5 : 1,
              }}
            >
              <Text style={{ color: '#fff', fontFamily: FontFamily.geistSemiBold }}>Add</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ ...Type.bodyMd, color: colors.text.tertiary, marginTop: 8, fontSize: 12 }}>
            Calories burned are an estimate (activity type x your weight x time), not measured.
          </Text>
        </View>
      )}
    </Card>
  );
}
