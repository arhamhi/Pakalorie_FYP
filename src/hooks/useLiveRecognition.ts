import { useEffect, useRef, useState, type RefObject } from 'react';
import type { CameraView } from 'expo-camera';
import { recognizeFood } from '../lib/api';

export interface LiveResult {
  label: string | null;
  confidence: number;
  /** True when the top guess is under the confidence cut-off; show it as "Maybe". */
  lowConfidence: boolean;
  latencyMs: number | null;
  /** Completed recognitions per second, averaged over the last few frames. */
  fps: number | null;
  error: string | null;
}

const LIVE_MIN_CONFIDENCE = 0.35;

const EMPTY: LiveResult = {
  label: null,
  confidence: 0,
  lowConfidence: false,
  latencyMs: null,
  fps: null,
  error: null,
};

/**
 * Server-streamed "real-time" recognition (P2 Mid): while `enabled`, grabs a
 * small camera frame, sends it to POST /recognize with the trained YOLOv8
 * engine, then repeats as soon as the reply lands (+ `gapMs`). One frame is in
 * flight at a time, so latency sets the frame rate. Uses the YOLO engine only,
 * so it never spends LLM credits.
 */
export function useLiveRecognition(
  cameraRef: RefObject<CameraView | null>,
  enabled: boolean,
  gapMs = 300,
): LiveResult {
  const [result, setResult] = useState<LiveResult>(EMPTY);

  useEffect(() => {
    if (!enabled) {
      setResult(EMPTY);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finishTimes: number[] = [];

    const tick = async () => {
      if (cancelled) return;
      const started = Date.now();
      try {
        const photo = await cameraRef.current?.takePictureAsync({
          quality: 0.3,
          skipProcessing: true,
        });
        if (!photo?.uri) throw new Error('no frame');
        const data = await recognizeFood(photo.uri, 'yolo');
        if (cancelled) return;
        const now = Date.now();
        finishTimes.push(now);
        if (finishTimes.length > 5) finishTimes.shift();
        const span = (now - finishTimes[0]) / 1000;
        setResult({
          // The YOLO model never abstains and its confidences are low (about 10%
          // on a correct haleem photo), so keep the top guess and let the UI mark
          // it as low confidence instead of hiding it.
          label: data.food_label,
          confidence: data.confidence,
          lowConfidence: data.confidence < LIVE_MIN_CONFIDENCE,
          latencyMs: now - started,
          fps: finishTimes.length > 1 && span > 0 ? (finishTimes.length - 1) / span : null,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        // Low-confidence / not-food replies and network blips are normal live;
        // keep going and show the reason instead of crashing the loop.
        setResult((prev) => ({
          ...prev,
          label: null,
          error: e instanceof Error ? e.message : 'Recognition failed',
        }));
      }
      if (!cancelled) timer = setTimeout(tick, gapMs);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [cameraRef, enabled, gapMs]);

  return result;
}
