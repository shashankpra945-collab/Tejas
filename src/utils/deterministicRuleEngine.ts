import { SymptomItem, HardwareVitals, RedFlagAssessment, GisEnvironment } from '../types';

export interface TriageInputContext {
  selectedSymptoms: SymptomItem[];
  vitals?: HardwareVitals['vitals'];
  reportedAnswers?: string[];
  aqi?: number;
}

export function evaluateDeterministicRedFlag(context: TriageInputContext): RedFlagAssessment {
  const symptomIds = new Set(context.selectedSymptoms.map((s) => s.id));
  const triggeredRules: string[] = [];
  let severityScore = 20; // baseline

  // Rule 1: Cardiac Critical Combination (WHO/NICE criteria)
  if (
    symptomIds.has('sym_chest_pain_radiating') ||
    (symptomIds.has('sym_shortness_breath') && (context.vitals?.systolicBP ?? 120) > 175)
  ) {
    triggeredRules.push('CRITICAL CARDIAC OVERDRIVE: Substernal chest pressure with radiation / severe hypertensive crisis.');
    severityScore = Math.max(severityScore, 96);
  }

  // Rule 2: Acute Stroke FAST protocol
  if (symptomIds.has('sym_facial_droop')) {
    triggeredRules.push('ACUTE STROKE CODE RED: Sudden facial weakness / unilateral deficit (FAST protocol match).');
    severityScore = Math.max(severityScore, 98);
  }

  // Rule 3: Thunderclap Severe Headache
  if (symptomIds.has('sym_headache_severe')) {
    triggeredRules.push('NEUROLOGICAL EMERGENCY: Sudden explosive thunderclap headache.');
    severityScore = Math.max(severityScore, 88);
  }

  // Rule 4: Severe Respiratory Distress + AQI Exacerbation
  if (symptomIds.has('sym_shortness_breath')) {
    if ((context.vitals?.spo2Percent ?? 98) < 92) {
      triggeredRules.push(`HYPOXIC RESPIRATORY CRISIS: SpO2 at ${context.vitals?.spo2Percent}% (< 92% critical threshold).`);
      severityScore = Math.max(severityScore, 94);
    } else if ((context.aqi ?? 100) > 300) {
      triggeredRules.push(`ENVIRONMENTAL RESPIRATORY RISK: Severe AQI (${context.aqi}) with reported dyspnea.`);
      severityScore = Math.max(severityScore, 78);
    } else {
      severityScore = Math.max(severityScore, 65);
    }
  }

  // Rule 5: Severe Dehydration / Cholera shock
  if (symptomIds.has('sym_vomiting_diarrhea')) {
    if ((context.vitals?.pulseRateBpm ?? 72) > 115 && (context.vitals?.systolicBP ?? 120) < 90) {
      triggeredRules.push('HYPOVOLEMIC SHOCK ALERT: Tachycardia + Hypotension with severe watery gastrointestinal loss.');
      severityScore = Math.max(severityScore, 92);
    } else {
      severityScore = Math.max(severityScore, 60);
    }
  }

  // Rule 6: Dengue Hemorrhagic Petechiae Fever
  if (symptomIds.has('sym_fever_rash')) {
    triggeredRules.push('EPIDEMIC VECTOR EMERGENCY: High fever accompanied by petechial rash / dengue hemorrhage watch.');
    severityScore = Math.max(severityScore, 86);
  }

  // Check hardware vitals directly
  if ((context.vitals?.systolicBP ?? 120) >= 180 || (context.vitals?.diastolicBP ?? 80) >= 115) {
    triggeredRules.push('HYPERTENSIVE CRISIS: Systolic BP >= 180 mmHg or Diastolic >= 115 mmHg.');
    severityScore = Math.max(severityScore, 95);
  }
  if ((context.vitals?.spo2Percent ?? 98) < 90) {
    triggeredRules.push('CRITICAL HYPOXEMIA: SpO2 saturation < 90%.');
    severityScore = Math.max(severityScore, 95);
  }

  // Determine Priority Level
  const isCriticalAlert = severityScore >= 85 || triggeredRules.length > 0;
  let priorityLevel: RedFlagAssessment['priorityLevel'] = 'GREEN (Routine)';
  if (severityScore >= 85) {
    priorityLevel = 'RED (Immediate Emergency)';
  } else if (severityScore >= 50) {
    priorityLevel = 'YELLOW (Urgent)';
  }

  return {
    isCriticalAlert,
    isRedFlagTriggered: isCriticalAlert,
    triggeredRules,
    severityScore,
    priorityLevel,
    ruleEngineSource: triggeredRules.length > 0 ? 'Deterministic WHO ETAT / Manchester' : 'ML Classifier + LLM Hybrid',
    alertPayload: isCriticalAlert
      ? {
          emergencyType: triggeredRules[0] || 'High Risk Critical Vitals Score',
          recommendedImmediateAction: 'Immediate triage bypass: Administer 12-lead ECG, Oxygen 4L/min, alert on-duty emergency physician.',
          dispatchedTo: 'District Hospital Emergency Ward & On-Duty CMO Web Portal',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          bypassLLM: true,
        }
      : undefined,
  };
}

export function assessTriageRules(
  symptoms: SymptomItem[],
  vitals?: HardwareVitals['vitals'],
  gisContext?: GisEnvironment
): RedFlagAssessment {
  return evaluateDeterministicRedFlag({
    selectedSymptoms: symptoms,
    vitals,
    aqi: gisContext?.aqi,
  });
}
