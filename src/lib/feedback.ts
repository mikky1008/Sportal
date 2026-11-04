// Turns one AI measurement + the athlete's saved history into the screen's trend and feedback.
// Everything here is computed from real numbers: no canned "improved 12%" text.

import type { AIAnalysisResult, AIMeasurement, PerformanceSession } from "@/types";

const WINDOW = 4; // previous sessions shown next to the current one

export function buildAnalysis(m: AIMeasurement, saved: PerformanceSession[]): AIAnalysisResult {
  // `saved` is newest-first; take the last few of this skill and put them oldest-first.
  const past = saved
    .filter((s) => s.skill === m.skill)
    .slice(0, WINDOW)
    .reverse()
    .map((s) => s.result);
  const values = [...past, m.accuracy];
  const sessionHistory = values.map((v, i) => ({ label: `Practice ${i + 1}`, value: v }));

  const hasHistory = past.length > 0;
  const improvement = hasHistory ? m.accuracy - values[0]! : 0;
  const prevAvg = hasHistory ? past.reduce((a, b) => a + b, 0) / past.length : m.accuracy;
  const delta = m.accuracy - prevAvg;
  const trend: AIAnalysisResult["trend"] = !hasHistory
    ? "Baseline"
    : delta >= 3
      ? "Improving"
      : delta <= -3
        ? "Declining"
        : "Stable";

  const skill = m.skill === "shooting" ? "shooting accuracy" : "accuracy";
  const positive =
    hasHistory && improvement > 0
      ? `Your ${skill} is up ${Math.round(improvement)} points over your last ${values.length} sessions.`
      : m.accuracy >= 80
        ? `Strong set: ${m.made} of ${m.attempts} made.`
        : hasHistory
          ? `You made ${m.made} of ${m.attempts}. Keep logging sessions to see your trend.`
          : `You completed ${m.attempts} attempts. This is your baseline to build on.`;

  const improvementText =
    m.consistency < 70
      ? `Accuracy wasn't steady through the set (consistency ${m.consistency}%).`
      : m.accuracy < 70
        ? `Only ${m.made} of ${m.attempts} went in. Focus on form before speed.`
        : `Consistency is solid at ${m.consistency}%. Keep the same routine each shot.`;

  const suggestion =
    m.accuracy >= 80
      ? "Try the same drill from a longer distance, or add a defender-pace time limit."
      : m.consistency < 70
        ? "Practice repeated shooting sets to hold accuracy through the whole session."
        : "Do short sets of 10 from one spot and film each one so the trend is easy to compare.";

  return {
    ...m,
    trend,
    sessionHistory,
    improvement,
    feedback: { positive, improvement: improvementText, suggestion },
  };
}
