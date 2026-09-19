import type { Machine } from './db';
import { config } from './config';

const AVG_CYCLE_MIN: Record<string, number> = { washer: 35, dryer: 45 };

export type Prediction = { predicted_available_at: number; confidence: number };

function heuristic(machine: Machine): Prediction {
  const now = Date.now();
  const avg = AVG_CYCLE_MIN[machine.machine_type] ?? 40;
  const elapsed = machine.last_reported_at
    ? Math.floor((now - machine.last_reported_at) / 60000)
    : 0;
  const remaining = Math.max(1, avg - elapsed);
  const staleness = Math.min(1, elapsed / avg);
  const confidence = Math.max(0.3, machine.confidence * (1 - staleness * 0.5));
  return {
    predicted_available_at: now + remaining * 60 * 1000,
    confidence: Number(confidence.toFixed(2)),
  };
}

export async function predictAvailability(machine: Machine): Promise<Prediction> {
  const now = Date.now();

  if (machine.status === 'available') {
    return { predicted_available_at: now, confidence: machine.confidence };
  }
  if (machine.status === 'out_of_order') {
    return { predicted_available_at: now + 6 * 60 * 60 * 1000, confidence: 0.4 };
  }

  try {
    const res = await fetch(`${config.mlUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine_type: machine.machine_type,
        hour: new Date().getHours(),
        day_of_week: new Date().getDay(),
        minutes_since_report: machine.last_reported_at
          ? Math.floor((now - machine.last_reported_at) / 60000)
          : 0,
      }),
      signal: AbortSignal.timeout(800),
    });
    if (res.ok) {
      const data = (await res.json()) as { minutes_until_available: number; confidence: number };
      return {
        predicted_available_at: now + data.minutes_until_available * 60 * 1000,
        confidence: data.confidence,
      };
    }
  } catch {
    // ML service unavailable — fall through to heuristic
  }

  return heuristic(machine);
}
