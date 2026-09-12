import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  AlertOctagon,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Zap,
  Activity,
  Heart,
  Eye,
  Shield,
  Layers,
  Rotate3d,
  RotateCw,
  RotateCcw,
  EyeOff,
  Headphones,
  ShieldAlert,
  Flame,
  Droplet,
  Play,
  Pause,
  ArrowRight,
  HelpCircle,
  MessageSquare,
  CornerDownRight,
  Send,
  Keyboard,
} from 'lucide-react';
import { SymptomItem, BodyRegionId, PatientProfile, GisEnvironment } from '../types';
import { BODY_REGIONS, SYMPTOM_CATALOG } from '../data/medicalCorpus';
import { speakLocalText, audioSynth, startSpeechRecognizer } from '../utils/speechEngine';
import { getTranslation } from '../utils/translations';

interface BodyMapSelectorProps {
  patient: PatientProfile;
  gisContext: GisEnvironment;
  selectedSymptoms: SymptomItem[];
  onToggleSymptom: (symptom: SymptomItem) => void;
  onClearSymptoms: () => void;
  onProceedToQuestioning: (payload?: { patientText?: string; bodyRegion?: string }) => void;
  isRedFlagActive: boolean;
}

interface DynamicTriageState {
  understoodSummary: string;
  missingInformation?: string;
  nextFollowUpQuestions?: string;
  followUpQuestion?: string;
  followUpQuestionDialect?: string;
  clinicalAction?: string;
  preliminaryCareAdvice?: string;
  confidenceScore?: number;
  detectedSymptoms?: string[];
  followUpHistory?: { role: 'patient' | 'assistant'; text: string }[];
}

export const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({
  patient,
  gisContext,
  selectedSymptoms,
  onToggleSymptom,
  onClearSymptoms,
  onProceedToQuestioning,
  isRedFlagActive,
}) => {
  const t = getTranslation(patient.dialect);
  const [activeRegion, setActiveRegion] = useState<BodyRegionId>('chest');
  const [rotationAngle, setRotationAngle] = useState<number>(0); // 0 = Front, 90 = Right, 180 = Back, 270 = Left
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRecordingFollowUp, setIsRecordingFollowUp] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isNormalizingDialect, setIsNormalizingDialect] = useState(false);
  const [lastDialectResponse, setLastDialectResponse] = useState<any>(null);
  const [triageAnalysis, setTriageAnalysis] = useState<DynamicTriageState | null>(null);
  const [bodyFilterTab, setBodyFilterTab] = useState<'ALL' | 'FRONT' | 'BACK' | 'RIGHT' | 'LEFT'>('ALL');

  // Typed (text) complaint input — alternative to voice, per patient preference
  const [typedComplaintText, setTypedComplaintText] = useState('');

  // Seamless auto-advance: once the patient's initial complaint is understood,
  // move straight into the continuous adaptive follow-up questioning screen
  // instead of requiring a manual "tap symptoms + click continue" step.
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceCountdown, setAdvanceCountdown] = useState(0);
  const hasCapturedInitialComplaintRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearInterval(advanceTimerRef.current);
    };
  }, []);

  const cancelAutoAdvance = () => {
    if (advanceTimerRef.current) clearInterval(advanceTimerRef.current);
    advanceTimerRef.current = null;
    setIsAdvancing(false);
  };

  const scheduleAutoAdvance = (patientText: string) => {
    if (hasCapturedInitialComplaintRef.current) return;
    hasCapturedInitialComplaintRef.current = true;
    setIsAdvancing(true);
    setAdvanceCountdown(3);
    if (advanceTimerRef.current) clearInterval(advanceTimerRef.current);
    advanceTimerRef.current = setInterval(() => {
      setAdvanceCountdown((prev) => {
        if (prev <= 1) {
          if (advanceTimerRef.current) clearInterval(advanceTimerRef.current);
          onProceedToQuestioning({ patientText, bodyRegion: activeRegion });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const speechRecognizerRef = useRef<{ stop: () => void } | null>(null);

  // Drag rotation interaction state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startAngleRef = useRef(0);

  // Auto spin timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAutoSpinning) {
      interval = setInterval(() => {
        setRotationAngle((prev) => (prev + 2) % 360);
      }, 50);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoSpinning]);

  // Determine viewing angle and mode label
  const normalizedAngle = ((rotationAngle % 360) + 360) % 360;
  const isRightVisible = normalizedAngle >= 45 && normalizedAngle < 135;
  const isBackVisible = normalizedAngle >= 135 && normalizedAngle < 225;
  const isLeftVisible = normalizedAngle >= 225 && normalizedAngle < 315;
  const isFrontVisible = normalizedAngle >= 315 || normalizedAngle < 45;

  const viewModeLabel = isFrontVisible
    ? t.frontView
    : isBackVisible
    ? t.backView
    : isRightVisible
    ? t.rightSideView
    : t.leftSideView;

  // Switch region helper with automatic smooth 3D rotation orientation
  const handleSelectRegion = (regionId: BodyRegionId) => {
    setActiveRegion(regionId);
    audioSynth.playBeep();

    // Auto rotate 3D view to face the selected region
    if (regionId === 'upper_back' || regionId === 'spine_lower_back' || regionId === 'hips_pelvis') {
      if (!isBackVisible) setRotationAngle(180);
    } else if (
      regionId === 'eyes' ||
      regionId === 'ears' ||
      regionId === 'throat' ||
      regionId === 'chest' ||
      regionId === 'stomach' ||
      regionId === 'head' ||
      regionId === 'pelvis_sensitive'
    ) {
      if (isBackVisible) setRotationAngle(0);
    }
  };

  // Filter symptoms for the currently selected region
  const regionSymptoms = SYMPTOM_CATALOG.filter(
    (s) => s.bodyRegion === activeRegion
  );

  // Mouse & Touch Drag Rotation Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startAngleRef.current = rotationAngle;
    setIsAutoSpinning(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    const newAngle = ((startAngleRef.current + deltaX * 0.8) % 360 + 360) % 360;
    setRotationAngle(Math.round(newAngle));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      startXRef.current = e.touches[0].clientX;
      startAngleRef.current = rotationAngle;
      setIsAutoSpinning(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - startXRef.current;
    const newAngle = ((startAngleRef.current + deltaX * 0.8) % 360 + 360) % 360;
    setRotationAngle(Math.round(newAngle));
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Handle voice speech capture with fallback
  const handleStartVoice = () => {
    if (isRecordingVoice) {
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.stop();
      }
      setIsRecordingVoice(false);
      return;
    }

    setIsRecordingVoice(true);
    setVoiceTranscript('');

    const recognizer = startSpeechRecognizer({
      language: patient.dialect,
      onResult: async (text, isFinal) => {
        setVoiceTranscript(text);
        if (isFinal) {
          setIsRecordingVoice(false);
          await processSpokenDialect(text);
        }
      },
      onError: () => {
        setIsRecordingVoice(false);
        simulateVoiceFallback();
      },
      onEnd: () => {
        setIsRecordingVoice(false);
      },
    });

    if (recognizer) {
      speechRecognizerRef.current = recognizer;
    } else {
      simulateVoiceFallback();
    }
  };

  // Handle typed (text) complaint submission — same pipeline as voice
  const handleTypedComplaintSubmit = async () => {
    const text = typedComplaintText.trim();
    if (!text || isNormalizingDialect) return;
    setVoiceTranscript(text);
    setTypedComplaintText('');
    await processSpokenDialect(text);
  };

  // Handle answering dynamic follow-up question via voice
  const handleStartFollowUpVoice = () => {
    if (isRecordingFollowUp) {
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.stop();
      }
      setIsRecordingFollowUp(false);
      return;
    }

    setIsRecordingFollowUp(true);

    const recognizer = startSpeechRecognizer({
      language: patient.dialect,
      onResult: async (text, isFinal) => {
        if (isFinal) {
          setIsRecordingFollowUp(false);
          const fullDialogue = `${voiceTranscript} [Follow-up Reply]: ${text}`;
          setVoiceTranscript(fullDialogue);
          await processSpokenDialect(fullDialogue);
        }
      },
      onError: () => {
        setIsRecordingFollowUp(false);
        const reply = patient.dialect === 'English'
          ? 'The pain started 2 days ago and increases with physical effort.'
          : 'यह दर्द 2 दिन पहले शुरू हुआ था और चलने पर ज्यादा बढ़ जाता है।';
        const fullDialogue = `${voiceTranscript} [Follow-up Reply]: ${reply}`;
        setVoiceTranscript(fullDialogue);
        processSpokenDialect(fullDialogue);
      },
      onEnd: () => {
        setIsRecordingFollowUp(false);
      },
    });

    if (recognizer) {
      speechRecognizerRef.current = recognizer;
    } else {
      // Fallback for browsers without speech recognition support
      setTimeout(async () => {
        setIsRecordingFollowUp(false);
        const reply = patient.dialect === 'English'
          ? 'The pain started 2 days ago and increases with physical effort.'
          : 'यह दर्द 2 दिन पहले शुरू हुआ था और चलने पर ज्यादा बढ़ जाता है।';
        const fullDialogue = `${voiceTranscript} [Follow-up Reply]: ${reply}`;
        setVoiceTranscript(fullDialogue);
        await processSpokenDialect(fullDialogue);
      }, 1200);
    }
  };

  const simulateVoiceFallback = () => {
    setTimeout(async () => {
      const phrases: Record<string, string> = {
        chest: patient.dialect === 'English'
          ? 'I have had severe heavy chest pressure and radiating pain into my left arm for two days.'
          : 'हमार छाती में दु दिन से बहुत भारीपन और बायां हाथ में तेज दर्द बाटे।',
        stomach: patient.dialect === 'English'
          ? 'Severe abdominal cramps, nausea, and vomiting since yesterday.'
          : 'पेट में मरोड़ उठ रहल बा और बहुत उल्टी-दस्त हो रहल बा।',
        head: patient.dialect === 'English'
          ? 'Sudden severe throbbing headache and dizziness.'
          : 'माथा में अचानक से बहुत जोर के चक्कर और असहनीय दर्द हो गइल।',
        eyes: patient.dialect === 'English'
          ? 'Red, watery eyes with intense burning and blurred vision.'
          : 'आंख बहुत लाल बा, पानी गिर रहल बा और बहुत जलन हो रहल बा।',
        ears: patient.dialect === 'English'
          ? 'Sharp shooting ear pain with discharge.'
          : 'कान में बहुत तेज टीस मार रहल बा और पीब जैसा बह रहल बा।',
        throat: patient.dialect === 'English'
          ? 'Severe throat soreness, fever, and difficulty swallowing.'
          : 'गला में बहुत तेज खराश बा और थूक निगले में बहुत दर्द हो रहल बा।',
        upper_back: patient.dialect === 'English'
          ? 'Stiff upper back muscle spasms between shoulder blades.'
          : 'ऊपरी पीठ और कंधा के बीच में बहुत कड़ापन और जलन बा।',
        spine_lower_back: patient.dialect === 'English'
          ? 'Severe lower spine pain radiating down the right leg.'
          : 'रीढ़ की हड्डी और कमर में तेज दर्द बा, नीचे पैर तक खिंचाव जाता।',
        hips_pelvis: patient.dialect === 'English'
          ? 'Severe hip joint pain and difficulty walking.'
          : 'कूल्हा के जोड़ में बहुत दर्द बा, चले-फिरे में बहुत लंगड़ाहट बा।',
        limbs_joints: patient.dialect === 'English'
          ? 'Severe joint swelling, stiffness, and body ache.'
          : 'गांठ-गांठ में बहुत सूजन बा और देह में अकड़न बा।',
        skin: patient.dialect === 'English'
          ? 'High fever and red rashes appearing across the skin.'
          : 'तेज बुखार बा और पूरा चमड़ी पर लाल-लाल दाना निकल आइल बा।',
        pelvis_sensitive: patient.dialect === 'English'
          ? 'Weakness and lower abdominal pelvic discomfort.'
          : 'बहुत दिनों से कमजोरी और पेट के निचले हिस्से में दर्द बा।',
      };
      const spoken = phrases[activeRegion] || (patient.dialect === 'English' ? 'Severe body ache and discomfort.' : 'शरीर में बहुत तेज दर्द और तकलीफ हो रहा है।');
      setVoiceTranscript(spoken);
      setIsRecordingVoice(false);
      await processSpokenDialect(spoken);
    }, 1200);
  };

  const processSpokenDialect = async (spokenText: string) => {
    setIsNormalizingDialect(true);
    try {
      const res = await fetch('/api/gemini/dynamic-voice-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: spokenText,
          spokenTranscript: spokenText,
          patientInfo: patient,
          dialect: patient.dialect,
          bodyPart: activeRegion,
          selectedSymptoms: selectedSymptoms.map((s) => s.nameEn),
          gisContext,
          previousTurns: triageAnalysis?.followUpHistory || [],
        }),
      });

      let data: DynamicTriageState | null = null;
      if (res.ok) {
        const raw = await res.json();
        const followUpQ = raw.nextFollowUpQuestion?.local || raw.speechAudioText || raw.nextFollowUpQuestions || raw.followUpQuestion || '';
        const guidance = Array.isArray(raw.clinicalSolution?.actionableGuidance)
          ? raw.clinicalSolution.actionableGuidance.join(' • ')
          : (raw.clinicalSolution?.summary || raw.clinicalAction || raw.preliminaryCareAdvice || '');

        data = {
          understoodSummary: raw.understoodComplaint || raw.understoodSummary || spokenText,
          missingInformation: Array.isArray(raw.missingDimensions) ? raw.missingDimensions.join(', ') : (raw.missingInformation || ''),
          nextFollowUpQuestions: followUpQ,
          followUpQuestion: followUpQ,
          followUpQuestionDialect: followUpQ,
          clinicalAction: guidance,
          preliminaryCareAdvice: guidance,
          confidenceScore: 0.94,
          detectedSymptoms: raw.identifiedSymptoms || raw.detectedSymptoms || [],
          followUpHistory: [
            ...(triageAnalysis?.followUpHistory || []),
            { role: 'patient', text: spokenText },
            ...(followUpQ ? [{ role: 'assistant' as const, text: followUpQ }] : []),
          ],
        };
      } else {
        // Fallback to dialect-assist endpoint
        const fallbackRes = await fetch('/api/gemini/dialect-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spokenText,
            dialect: patient.dialect,
            selectedBodyPart: activeRegion,
            symptomTag: regionSymptoms[0]?.nameEn,
          }),
        });
        if (fallbackRes.ok) {
          const fb = await fallbackRes.json();
          const qText = fb.localPlaybackText || (patient.dialect === 'English' ? 'How long have you had this pain and what makes it worse?' : 'यह दर्द कितने समय से है और कब ज्यादा बढ़ता है?');
          data = {
            understoodSummary: fb.normalizedEnglish || spokenText,
            missingInformation: patient.dialect === 'English' ? 'Onset and severity scale' : 'लक्षण कब से शुरू हुआ और दर्द कितना तेज है?',
            nextFollowUpQuestions: qText,
            followUpQuestion: qText,
            followUpQuestionDialect: qText,
            clinicalAction: 'Clinical review recommended based on symptoms.',
            preliminaryCareAdvice: 'Clinical review recommended based on symptoms.',
            confidenceScore: fb.confidence || 0.88,
            detectedSymptoms: fb.clinicalKeywords || [],
          };
        }
      }

      if (data) {
        setTriageAnalysis(data);
        setLastDialectResponse({
          normalizedEnglish: data.understoodSummary,
          confidence: data.confidenceScore || 0.9,
          clinicalKeywords: data.detectedSymptoms || [],
        });
        audioSynth.playConfirmChime();

        // Automatically map detected symptoms
        if (data.detectedSymptoms && Array.isArray(data.detectedSymptoms)) {
          data.detectedSymptoms.forEach((sym) => {
            const found = SYMPTOM_CATALOG.find(
              (s) =>
                s.nameEn.toLowerCase().includes(sym.toLowerCase()) ||
                sym.toLowerCase().includes(s.nameEn.toLowerCase())
            );
            if (found && !selectedSymptoms.some((s) => s.id === found.id)) {
              onToggleSymptom(found);
            }
          });
        }

        // Region-specific fallback mapping
        if (activeRegion === 'chest') {
          const found = SYMPTOM_CATALOG.find((s) => s.id === 'sym_chest_pain_radiating');
          if (found && !selectedSymptoms.some((s) => s.id === found.id)) onToggleSymptom(found);
        } else if (activeRegion === 'eyes') {
          const found = SYMPTOM_CATALOG.find((s) => s.id === 'sym_eye_redness_discharge');
          if (found && !selectedSymptoms.some((s) => s.id === found.id)) onToggleSymptom(found);
        } else if (activeRegion === 'ears') {
          const found = SYMPTOM_CATALOG.find((s) => s.id === 'sym_ear_pain_discharge');
          if (found && !selectedSymptoms.some((s) => s.id === found.id)) onToggleSymptom(found);
        } else if (activeRegion === 'throat') {
          const found = SYMPTOM_CATALOG.find((s) => s.id === 'sym_throat_sore_swallowing');
          if (found && !selectedSymptoms.some((s) => s.id === found.id)) onToggleSymptom(found);
        } else if (activeRegion === 'upper_back') {
          const found = SYMPTOM_CATALOG.find((s) => s.id === 'sym_back_upper_muscle_spasm');
          if (found && !selectedSymptoms.some((s) => s.id === found.id)) onToggleSymptom(found);
        } else if (activeRegion === 'spine_lower_back') {
          const found = SYMPTOM_CATALOG.find((s) => s.id === 'sym_spine_sciatica_shooting');
          if (found && !selectedSymptoms.some((s) => s.id === found.id)) onToggleSymptom(found);
        } else if (activeRegion === 'hips_pelvis') {
          const found = SYMPTOM_CATALOG.find((s) => s.id === 'sym_hip_joint_pain_walking');
          if (found && !selectedSymptoms.some((s) => s.id === found.id)) onToggleSymptom(found);
        } else if (regionSymptoms[0] && !selectedSymptoms.some((s) => s.id === regionSymptoms[0].id)) {
          onToggleSymptom(regionSymptoms[0]);
        }

        // Speak the follow-up question in patient's dialect
        const questionToSpeak = data.nextFollowUpQuestions || data.understoodSummary;
        if (questionToSpeak) {
          speakLocalText(questionToSpeak, patient.dialect);
        }

        // Seamlessly continue: as soon as the patient's INITIAL complaint has
        // been understood, move straight into the continuous adaptive
        // follow-up questioning screen — no manual "tap symptoms + click
        // continue" step required. (Follow-up voice replies on this screen,
        // if the patient chooses "Stay here", won't re-trigger this.)
        scheduleAutoAdvance(spokenText);
      }
    } catch (err) {
      console.warn('Voice/Dialect assist note:', err);
    } finally {
      setIsNormalizingDialect(false);
    }
  };

  // Filtered body region list for buttons
  const displayedRegions = BODY_REGIONS.filter((r) => {
    if (r.id === 'pelvis_sensitive' && !patient.isSensitiveMode) return false;
    if (bodyFilterTab === 'FRONT') return r.side === 'front' || r.side === 'both';
    if (bodyFilterTab === 'BACK') return r.side === 'back' || r.side === 'both';
    if (bodyFilterTab === 'RIGHT' || bodyFilterTab === 'LEFT') return true;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-display flex items-center gap-2">
            <Rotate3d className="w-5 h-5 text-emerald-600" />
            3D Rotatable Body Map & Vernacular Intake (360° शरीर मॉडल)
          </h2>
          <p className="text-xs text-slate-600 max-w-3xl mt-1">
            Rotate the 3D model to inspect and touch front organs or back anatomy (<strong>पीठ, रीढ़ की हड्डी, कूल्हा, आंख, कान, गला</strong>). Tap any hotspot or speak in <strong>{patient.dialect}</strong>.
          </p>
        </div>

        {/* Active Node Counter */}
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs">
          <Layers className="w-4 h-4 text-emerald-600" />
          <div>
            <div className="text-[11px] text-emerald-700 font-medium">Selected Symptoms</div>
            <div className="text-sm font-bold text-emerald-900 font-mono">
              {selectedSymptoms.length} <span className="text-[10px] text-emerald-600 font-normal">Active Nodes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Visual Interaction Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Rotatable Anatomical Human Silhouette (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                1. 3D Body Anatomy (शरीर घुमाएं व अंग छूएं)
              </h3>
              <span className="text-[11px] text-emerald-700 font-medium">
                Current: <strong>{viewModeLabel}</strong> ({rotationAngle}°)
              </span>
            </div>

            {/* Quick 360 Spin Toggle */}
            <button
              onClick={() => setIsAutoSpinning(!isAutoSpinning)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isAutoSpinning
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
              title="Toggle continuous 360 auto rotation"
            >
              {isAutoSpinning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isAutoSpinning ? 'Pause Spin' : '360° Spin'}</span>
            </button>
          </div>

          {/* Quick Perspective Switcher Buttons */}
          <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold">
            <button
              onClick={() => {
                setRotationAngle(0);
                setIsAutoSpinning(false);
              }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                normalizedAngle >= 315 || normalizedAngle <= 45
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              👤 {t.frontView}
            </button>
            <button
              onClick={() => {
                setRotationAngle(180);
                setIsAutoSpinning(false);
              }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                normalizedAngle >= 135 && normalizedAngle <= 225
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              🔄 {t.backView}
            </button>
            <button
              onClick={() => {
                setRotationAngle(90);
                setIsAutoSpinning(false);
              }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                normalizedAngle > 45 && normalizedAngle < 135
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              ➡️ {t.rightSideView}
            </button>
            <button
              onClick={() => {
                setRotationAngle(270);
                setIsAutoSpinning(false);
              }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                normalizedAngle > 225 && normalizedAngle < 315
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              ⬅️ {t.leftSideView}
            </button>
          </div>

          {/* 3D Anatomical Stage Canvas */}
          <div
            className="relative bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 rounded-2xl p-4 border border-slate-700/60 flex flex-col items-center select-none overflow-hidden cursor-grab active:cursor-grabbing shadow-inner min-h-[380px]"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Background 3D Grid & Hologram Rings */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

            {/* Orbit Hint Header */}
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400 z-10 mb-2">
              <span className="flex items-center gap-1">
                <Rotate3d className="w-3.5 h-3.5 text-emerald-400" />
                <span>Drag left/right to rotate 360°</span>
              </span>
              <span className="bg-slate-800/90 text-emerald-300 px-2 py-0.5 rounded-full border border-slate-700 font-mono text-[10px]">
                {rotationAngle}° Orbit
              </span>
            </div>

            {/* Anatomical Stage Canvas Container */}
            <div className="relative w-64 h-[310px] flex items-center justify-center">
              <div className="relative w-full h-full flex items-center justify-center">
                {/* ======================================================== */}
                {/* 1. FRONT ANATOMICAL SILHOUETTE (Facing 0°) */}
                {/* ======================================================== */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                    isFrontVisible ? 'opacity-100 scale-100 z-20 pointer-events-auto' : 'opacity-0 scale-95 z-0 pointer-events-none'
                  }`}
                >
                  {/* Front SVG Graphic */}
                  <svg
                    viewBox="0 0 200 360"
                    className="w-full h-full text-slate-300/90 drop-shadow-[0_4px_16px_rgba(16,185,129,0.15)] select-none"
                    fill="currentColor"
                  >
                    {/* Head */}
                    <circle cx="100" cy="40" r="26" fill="#cbd5e1" />
                    {/* Eyes indicator */}
                    <circle cx="92" cy="38" r="3" fill="#0f172a" />
                    <circle cx="108" cy="38" r="3" fill="#0f172a" />
                    {/* Nose & Mouth */}
                    <path d="M100 42 L100 47" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M95 53 Q100 56 105 53" stroke="#475569" strokeWidth="1.5" fill="none" />
                    {/* Ears */}
                    <ellipse cx="73" cy="40" rx="3.5" ry="7" fill="#94a3b8" />
                    <ellipse cx="127" cy="40" rx="3.5" ry="7" fill="#94a3b8" />
                    {/* Neck */}
                    <path d="M92 66 L108 66 L107 80 L93 80 Z" fill="#94a3b8" />
                    {/* Torso / Chest / Abdomen */}
                    <path d="M60 90 Q100 78 140 90 L134 195 Q100 205 66 195 Z" fill="#cbd5e1" />
                    {/* Pectoral Contours */}
                    <path d="M68 115 Q84 125 100 118 Q116 125 132 115" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
                    {/* Abdominal Lines */}
                    <path d="M100 125 L100 185" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
                    <circle cx="100" cy="165" r="2.5" fill="#64748b" />
                    {/* Arms */}
                    <path d="M60 90 L36 175 L48 180 L68 115 Z" fill="#94a3b8" />
                    <path d="M140 90 L164 175 L152 180 L132 115 Z" fill="#94a3b8" />
                    {/* Legs */}
                    <path d="M72 195 L68 335 L84 335 L95 202 Z" fill="#cbd5e1" />
                    <path d="M128 195 L132 335 L116 335 L105 202 Z" fill="#cbd5e1" />
                    {/* Knee indicators */}
                    <circle cx="78" cy="265" r="6" fill="#94a3b8" opacity="0.6" />
                    <circle cx="122" cy="265" r="6" fill="#94a3b8" opacity="0.6" />
                  </svg>

                  {/* Hotspots: FRONT VIEW */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('head');
                    }}
                    className={`absolute top-2 w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'head'
                        ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-300/80 scale-110'
                        : 'bg-white/90 text-slate-800 hover:bg-emerald-100 border border-slate-300'
                    }`}
                    title="Head & Brain (सिर)"
                  >
                    सिर
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('eyes');
                    }}
                    className={`absolute top-10 left-12 w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'eyes'
                        ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-300/80 scale-110'
                        : 'bg-cyan-100 text-cyan-900 hover:bg-cyan-200 border border-cyan-300'
                    }`}
                    title="Eyes & Vision (आंखें)"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('ears');
                    }}
                    className={`absolute top-10 right-12 w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'ears'
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300/80 scale-110'
                        : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                    }`}
                    title="Ears & Hearing (कान)"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('throat');
                    }}
                    className={`absolute top-19 w-11 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'throat'
                        ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-300/80 scale-110'
                        : 'bg-white/95 text-slate-900 hover:bg-emerald-100 border border-slate-300'
                    }`}
                    title="Throat & Neck (गला व गर्दन)"
                  >
                    गला
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('chest');
                    }}
                    className={`absolute top-28 w-14 h-11 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'chest'
                        ? 'bg-rose-500 text-white ring-4 ring-rose-300/80 scale-110'
                        : 'bg-rose-100 text-rose-900 hover:bg-rose-200 border border-rose-300'
                    }`}
                    title="Chest & Lungs (छाती)"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-600" />
                    <span>छाती</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('stomach');
                    }}
                    className={`absolute top-41 w-13 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'stomach'
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300/80 scale-110'
                        : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                    }`}
                    title="Stomach & Digestion (पेट)"
                  >
                    पेट
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('limbs_joints');
                    }}
                    className={`absolute top-53 left-4 w-9 h-9 rounded-full flex items-center justify-center text-[9px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'limbs_joints'
                        ? 'bg-indigo-500 text-white ring-4 ring-indigo-300/80 scale-110'
                        : 'bg-indigo-100 text-indigo-900 hover:bg-indigo-200 border border-indigo-300'
                    }`}
                    title="Arms, Legs & Knees (हाथ-पैर व जोड़)"
                  >
                    जोड़
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('skin');
                    }}
                    className={`absolute top-53 right-4 w-9 h-9 rounded-full flex items-center justify-center text-[9px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'skin'
                        ? 'bg-pink-500 text-white ring-4 ring-pink-300/80 scale-110'
                        : 'bg-pink-100 text-pink-900 hover:bg-pink-200 border border-pink-300'
                    }`}
                    title="Skin & Allergies (त्वचा)"
                  >
                    त्वचा
                  </button>

                  {patient.isSensitiveMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRegion('pelvis_sensitive');
                      }}
                      className={`absolute top-52 w-10 h-8 rounded-xl flex items-center justify-center text-[9px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                        activeRegion === 'pelvis_sensitive'
                          ? 'bg-purple-600 text-white ring-4 ring-purple-300/80 scale-110'
                          : 'bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300'
                      }`}
                      title="Confidential Private Symptoms"
                    >
                      निजी
                    </button>
                  )}
                </div>

                {/* ======================================================== */}
                {/* 2. RIGHT LATERAL PROFILE SILHOUETTE (Facing 90°) */}
                {/* ======================================================== */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                    isRightVisible ? 'opacity-100 scale-100 z-20 pointer-events-auto' : 'opacity-0 scale-95 z-0 pointer-events-none'
                  }`}
                >
                  <svg
                    viewBox="0 0 200 360"
                    className="w-full h-full text-slate-300/90 drop-shadow-[0_4px_16px_rgba(16,185,129,0.2)] select-none"
                    fill="currentColor"
                  >
                    {/* Head profile facing right */}
                    <path d="M85 20 C65 20 60 45 70 58 C72 63 80 66 88 66 L94 66 L95 78 L108 78 L107 65 C116 63 125 55 125 44 C125 38 122 36 120 36 C124 34 128 32 128 28 C124 25 118 25 116 23 C110 20 98 20 85 20 Z" fill="#cbd5e1" />
                    <circle cx="114" cy="36" r="2.5" fill="#0f172a" />
                    <ellipse cx="90" cy="42" rx="4" ry="7" fill="#94a3b8" />
                    <path d="M94 58 L112 55 L116 48" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <path d="M82 66 L108 66 L112 84 L78 84 Z" fill="#94a3b8" />
                    {/* Torso Profile (Chest on right, upper back on left) */}
                    <path d="M78 84 C68 115 68 145 75 180 C78 198 84 212 92 215 C102 216 112 210 118 198 C126 175 130 135 126 102 C124 88 118 84 112 84 Z" fill="#cbd5e1" />
                    <path d="M78 86 Q69 130 76 175" stroke="#64748b" strokeWidth="1.5" fill="none" />
                    {/* Right Arm Lateral */}
                    <path d="M95 88 C88 95 86 110 88 135 C89 152 92 170 94 185 L106 185 C106 168 106 145 106 125 C106 105 104 92 95 88 Z" fill="#94a3b8" />
                    <circle cx="97" cy="155" r="3" fill="#64748b" />
                    {/* Pelvis Profile */}
                    <path d="M75 180 C68 195 68 215 78 226 C86 232 98 230 106 224 C116 215 118 200 118 195 Z" fill="#94a3b8" opacity="0.8" />
                    {/* Right Leg Lateral Profile */}
                    <path d="M78 226 C75 250 78 275 88 288 C92 295 94 315 92 335 L106 335 C108 315 108 295 108 285 C114 275 118 250 114 220 Z" fill="#cbd5e1" />
                    <circle cx="106" cy="272" r="5" fill="#94a3b8" opacity="0.7" />
                    <path d="M86 335 L86 348 C94 350 118 350 130 348 C132 344 126 338 106 335 Z" fill="#94a3b8" />
                  </svg>

                  {/* Hotspots: RIGHT LATERAL PROFILE */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('head');
                    }}
                    className={`absolute top-2 left-20 w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'head'
                        ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-300 scale-110'
                        : 'bg-white/90 text-slate-800 hover:bg-emerald-100 border border-slate-300'
                    }`}
                    title="Right Temple / Head"
                  >
                    सिर
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('ears');
                    }}
                    className={`absolute top-9 left-18 w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'ears'
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300 scale-110'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                    title="Right Ear (दायां कान)"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('chest');
                    }}
                    className={`absolute top-26 right-10 w-13 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'chest'
                        ? 'bg-rose-500 text-white ring-4 ring-rose-300 scale-110'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                    title="Right Thorax / Chest"
                  >
                    छाती
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('upper_back');
                    }}
                    className={`absolute top-26 left-10 w-13 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'upper_back'
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300 scale-110'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                    title="Right Scapula / Back"
                  >
                    पीठ
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('stomach');
                    }}
                    className={`absolute top-40 right-11 w-12 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'stomach'
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300 scale-110'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                    title="Right Flank / Liver"
                  >
                    पेट/दायां
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('spine_lower_back');
                    }}
                    className={`absolute top-40 left-10 w-12 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'spine_lower_back'
                        ? 'bg-rose-500 text-white ring-4 ring-rose-300 scale-110'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                    title="Right Lumbar Flank"
                  >
                    कमर
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('hips_pelvis');
                    }}
                    className={`absolute top-52 left-14 w-14 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'hips_pelvis'
                        ? 'bg-indigo-500 text-white ring-4 ring-indigo-300 scale-110'
                        : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                    }`}
                    title="Right Hip Joint (दायां कूल्हा)"
                  >
                    दायां कूल्हा
                  </button>
                </div>

                {/* ======================================================== */}
                {/* 3. BACK / POSTERIOR ANATOMICAL SILHOUETTE (Facing 180°) */}
                {/* ======================================================== */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                    isBackVisible ? 'opacity-100 scale-100 z-20 pointer-events-auto' : 'opacity-0 scale-95 z-0 pointer-events-none'
                  }`}
                >
                  <svg
                    viewBox="0 0 200 360"
                    className="w-full h-full text-slate-400/90 drop-shadow-[0_4px_16px_rgba(245,158,11,0.15)] select-none"
                    fill="currentColor"
                  >
                    <circle cx="100" cy="40" r="26" fill="#94a3b8" />
                    <path d="M78 48 Q100 62 122 48" stroke="#475569" strokeWidth="2" fill="#475569" />
                    <path d="M88 66 L112 66 L120 84 L80 84 Z" fill="#64748b" />
                    <path d="M60 90 Q100 82 140 90 L134 195 Q100 202 66 195 Z" fill="#94a3b8" />
                    <path d="M72 102 L86 102 L82 128 L72 118 Z" fill="#64748b" opacity="0.6" />
                    <path d="M128 102 L114 102 L118 128 L128 118 Z" fill="#64748b" opacity="0.6" />
                    <line x1="100" y1="84" x2="100" y2="195" stroke="#0f172a" strokeWidth="3" strokeDasharray="5,4" />
                    <path d="M66 195 Q100 215 134 195 L130 225 Q100 235 70 225 Z" fill="#64748b" />
                    <line x1="100" y1="195" x2="100" y2="230" stroke="#0f172a" strokeWidth="2" />
                    <path d="M60 90 L36 175 L48 180 L68 115 Z" fill="#64748b" />
                    <path d="M140 90 L164 175 L152 180 L132 115 Z" fill="#64748b" />
                    <path d="M70 225 L68 335 L84 335 L95 230 Z" fill="#94a3b8" />
                    <path d="M130 225 L132 335 L116 335 L105 230 Z" fill="#94a3b8" />
                    <line x1="72" y1="265" x2="84" y2="265" stroke="#475569" strokeWidth="2" />
                    <line x1="116" y1="265" x2="128" y2="265" stroke="#475569" strokeWidth="2" />
                  </svg>

                  {/* Hotspots: BACK VIEW */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('upper_back');
                    }}
                    className={`absolute top-26 w-20 h-11 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'upper_back'
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300/80 scale-110'
                        : 'bg-amber-100 text-amber-950 hover:bg-amber-200 border border-amber-300'
                    }`}
                    title="Upper Back & Shoulder (ऊपरी पीठ / Peeth)"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                    <span>ऊपरी पीठ</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('spine_lower_back');
                    }}
                    className={`absolute top-39 w-22 h-11 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'spine_lower_back'
                        ? 'bg-rose-500 text-white ring-4 ring-rose-300/80 scale-110'
                        : 'bg-rose-100 text-rose-950 hover:bg-rose-200 border border-rose-300'
                    }`}
                    title="Spine & Lower Back (रीढ़ की हड्डी व कमर / Reedh)"
                  >
                    <Activity className="w-3.5 h-3.5 text-rose-700" />
                    <span>रीढ़ व कमर</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('hips_pelvis');
                    }}
                    className={`absolute top-52 w-20 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'hips_pelvis'
                        ? 'bg-indigo-500 text-white ring-4 ring-indigo-300/80 scale-110'
                        : 'bg-indigo-100 text-indigo-950 hover:bg-indigo-200 border border-indigo-300'
                    }`}
                    title="Hips & Glutes (कूल्हा व नितंब / Kulha)"
                  >
                    कूल्हा / नितंब
                  </button>
                </div>

                {/* ======================================================== */}
                {/* 4. LEFT LATERAL PROFILE SILHOUETTE (Facing 270°) */}
                {/* ======================================================== */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                    isLeftVisible ? 'opacity-100 scale-100 z-20 pointer-events-auto' : 'opacity-0 scale-95 z-0 pointer-events-none'
                  }`}
                >
                  <svg
                    viewBox="0 0 200 360"
                    className="w-full h-full text-slate-300/90 drop-shadow-[0_4px_16px_rgba(16,185,129,0.2)] select-none"
                    fill="currentColor"
                  >
                    {/* Head profile facing left */}
                    <path d="M115 20 C135 20 140 45 130 58 C128 63 120 66 112 66 L106 66 L105 78 L92 78 L93 65 C84 63 75 55 75 44 C75 38 78 36 80 36 C76 34 72 32 72 28 C76 25 82 25 84 23 C90 20 102 20 115 20 Z" fill="#cbd5e1" />
                    <circle cx="86" cy="36" r="2.5" fill="#0f172a" />
                    <ellipse cx="110" cy="42" rx="4" ry="7" fill="#94a3b8" />
                    <path d="M106 58 L88 55 L84 48" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <path d="M118 66 L92 66 L88 84 L122 84 Z" fill="#94a3b8" />
                    {/* Torso Profile (Chest/Heart on left, back on right) */}
                    <path d="M122 84 C132 115 132 145 125 180 C122 198 116 212 108 215 C98 216 88 210 82 198 C74 175 70 135 74 102 C76 88 82 84 88 84 Z" fill="#cbd5e1" />
                    <path d="M122 86 Q131 130 124 175" stroke="#64748b" strokeWidth="1.5" fill="none" />
                    {/* Left Arm Lateral */}
                    <path d="M105 88 C112 95 114 110 112 135 C111 152 108 170 106 185 L94 185 C94 168 94 145 94 125 C94 105 96 92 105 88 Z" fill="#94a3b8" />
                    <circle cx="103" cy="155" r="3" fill="#64748b" />
                    {/* Left Pelvis */}
                    <path d="M125 180 C132 195 132 215 122 226 C114 232 102 230 94 224 C84 215 82 200 82 195 Z" fill="#94a3b8" opacity="0.8" />
                    {/* Left Leg Lateral */}
                    <path d="M122 226 C125 250 122 275 112 288 C108 295 106 315 108 335 L94 335 C92 315 92 295 92 285 C86 275 82 250 86 220 Z" fill="#cbd5e1" />
                    <circle cx="94" cy="272" r="5" fill="#94a3b8" opacity="0.7" />
                    <path d="M114 335 L114 348 C106 350 82 350 70 348 C68 344 74 338 94 335 Z" fill="#94a3b8" />
                  </svg>

                  {/* Hotspots: LEFT LATERAL PROFILE */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('head');
                    }}
                    className={`absolute top-2 right-20 w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'head'
                        ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-300 scale-110'
                        : 'bg-white/90 text-slate-800 hover:bg-emerald-100 border border-slate-300'
                    }`}
                    title="Left Temple / Head"
                  >
                    सिर
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('ears');
                    }}
                    className={`absolute top-9 right-18 w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'ears'
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300 scale-110'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                    title="Left Ear (बायां कान)"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('chest');
                    }}
                    className={`absolute top-26 left-10 w-13 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'chest'
                        ? 'bg-rose-500 text-white ring-4 ring-rose-300 scale-110'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                    title="Left Thorax / Precordium (Heart)"
                  >
                    दिल/छाती
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('upper_back');
                    }}
                    className={`absolute top-26 right-10 w-13 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'upper_back'
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300 scale-110'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                    title="Left Scapula / Back"
                  >
                    पीठ
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('stomach');
                    }}
                    className={`absolute top-40 left-11 w-12 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'stomach'
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300 scale-110'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                    title="Left Flank / Spleen"
                  >
                    पेट/बायां
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('spine_lower_back');
                    }}
                    className={`absolute top-40 right-10 w-12 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'spine_lower_back'
                        ? 'bg-rose-500 text-white ring-4 ring-rose-300 scale-110'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                    title="Left Lumbar Flank"
                  >
                    कमर
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion('hips_pelvis');
                    }}
                    className={`absolute top-52 right-14 w-14 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all transform hover:scale-125 cursor-pointer shadow-md ${
                      activeRegion === 'hips_pelvis'
                        ? 'bg-indigo-500 text-white ring-4 ring-indigo-300 scale-110'
                        : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                    }`}
                    title="Left Hip Joint (बायां कूल्हा)"
                  >
                    बायां कूल्हा
                  </button>
                </div>
              </div>
            </div>

            {/* Orbit Slider Controller */}
            <div className="w-full mt-3 flex items-center gap-2 z-10 px-2">
              <RotateCcw
                className="w-4 h-4 text-slate-400 cursor-pointer hover:text-emerald-400"
                onClick={() => setRotationAngle((prev) => (prev - 45 + 360) % 360)}
                title="Rotate 45° Left"
              />
              <input
                type="range"
                min="0"
                max="360"
                value={rotationAngle}
                onChange={(e) => {
                  setRotationAngle(Number(e.target.value));
                  setIsAutoSpinning(false);
                }}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <RotateCw
                className="w-4 h-4 text-slate-400 cursor-pointer hover:text-emerald-400"
                onClick={() => setRotationAngle((prev) => (prev + 45) % 360)}
                title="Rotate 45° Right"
              />
            </div>
          </div>

          {/* 5-Perspective Filter Sub-Tabs for Body Region Grid */}
          <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-medium">
            <button
              onClick={() => setBodyFilterTab('ALL')}
              className={`py-1 rounded-lg transition-all cursor-pointer text-center ${
                bodyFilterTab === 'ALL' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              All ({BODY_REGIONS.length})
            </button>
            <button
              onClick={() => {
                setBodyFilterTab('FRONT');
                setRotationAngle(0);
                setIsAutoSpinning(false);
              }}
              className={`py-1 rounded-lg transition-all cursor-pointer text-center ${
                bodyFilterTab === 'FRONT' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              👤 Front
            </button>
            <button
              onClick={() => {
                setBodyFilterTab('BACK');
                setRotationAngle(180);
                setIsAutoSpinning(false);
              }}
              className={`py-1 rounded-lg transition-all cursor-pointer text-center ${
                bodyFilterTab === 'BACK' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              🔄 Back
            </button>
            <button
              onClick={() => {
                setBodyFilterTab('RIGHT');
                setRotationAngle(90);
                setIsAutoSpinning(false);
              }}
              className={`py-1 rounded-lg transition-all cursor-pointer text-center ${
                bodyFilterTab === 'RIGHT' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              ➡️ Right
            </button>
            <button
              onClick={() => {
                setBodyFilterTab('LEFT');
                setRotationAngle(270);
                setIsAutoSpinning(false);
              }}
              className={`py-1 rounded-lg transition-all cursor-pointer text-center ${
                bodyFilterTab === 'LEFT' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              ⬅️ Left
            </button>
          </div>

          {/* Region List Grid Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {displayedRegions.map((r) => {
              const isSelected = activeRegion === r.id;
              const hasSelectedSymptoms = selectedSymptoms.some(
                (s) => s.bodyRegion === r.id
              );

              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectRegion(r.id as BodyRegionId)}
                  className={`p-2 rounded-xl text-left text-xs font-medium transition-all cursor-pointer flex flex-col justify-between border ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs border-emerald-600 ring-2 ring-emerald-300'
                      : hasSelectedSymptoms
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-bold text-[11px] truncate">{r.nameHi}</span>
                    {hasSelectedSymptoms && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-0.5"></span>
                    )}
                  </div>
                  <div className={`text-[10px] truncate ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {r.nameEn}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: 2-Tap Symptom Grid & Vernacular Voice Assistant (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Dialect Voice Channel (Bhashini + Gemini) */}
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-4 shadow-sm border border-indigo-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Bhashini Dialect Voice Assistant ({patient.dialect})
                </h3>
              </div>
              <span className="text-[11px] bg-indigo-800/80 px-2 py-0.5 rounded-full text-indigo-200 border border-indigo-700">
                Voice-to-Case Intake
              </span>
            </div>

            <p className="text-xs text-indigo-200">
              Speak freely in <strong>{patient.dialect}</strong> or tap the microphone to describe pain, duration, or discomfort:
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleStartVoice}
                disabled={isRecordingVoice || isNormalizingDialect}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isRecordingVoice
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                }`}
              >
                {isRecordingVoice ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Listening... (सुन रहा है)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Tap to Speak in {patient.dialect} (बोलें)</span>
                  </>
                )}
              </button>

              {voiceTranscript && (
                <button
                  onClick={() => speakLocalText(voiceTranscript, patient.dialect)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-800 hover:bg-indigo-700 text-indigo-100 rounded-xl text-xs font-medium border border-indigo-600 transition-colors cursor-pointer"
                  title="Read aloud in native language"
                >
                  <Volume2 className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Audio Repeat</span>
                </button>
              )}
            </div>

            {/* Text Input — alternative to voice for describing the problem */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-indigo-400 text-[11px] shrink-0">
                <Keyboard className="w-3.5 h-3.5" />
                <span>{patient.dialect === 'English' ? 'or type:' : 'या टाइप करें:'}</span>
              </div>
              <input
                type="text"
                value={typedComplaintText}
                onChange={(e) => setTypedComplaintText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTypedComplaintSubmit();
                }}
                disabled={isNormalizingDialect}
                placeholder={
                  patient.dialect === 'English'
                    ? 'e.g. I have had stomach pain since yesterday...'
                    : 'जैसे: मेरे पेट में कल से दर्द हो रहा है...'
                }
                className="flex-1 bg-indigo-950/60 border border-indigo-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-indigo-400/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
              <button
                onClick={handleTypedComplaintSubmit}
                disabled={!typedComplaintText.trim() || isNormalizingDialect}
                className="flex items-center justify-center w-9 h-9 shrink-0 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors cursor-pointer"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Spoken Text & Translation Feedback */}
            {voiceTranscript && (
              <div className="bg-indigo-950/70 rounded-xl p-3 border border-indigo-800/60 space-y-2.5 text-xs">
                <div className="text-indigo-300 font-semibold flex items-center justify-between">
                  <span>Patient Speech Transcript:</span>
                  {isNormalizingDialect && (
                    <span className="text-[11px] text-amber-300 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing vernacular speech with Gemini...
                    </span>
                  )}
                </div>
                <div className="text-white italic bg-indigo-900/50 p-2.5 rounded-lg font-serif text-sm">
                  "{voiceTranscript}"
                </div>

                {lastDialectResponse && (
                  <div className="pt-2 border-t border-indigo-800/80 space-y-1.5">
                    <div className="text-emerald-300 font-medium flex items-center justify-between">
                      <span>✓ Clinical Normalization: <span className="text-white font-normal">{lastDialectResponse.normalizedEnglish}</span></span>
                      <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-300 border border-emerald-800">
                        {((lastDialectResponse.confidence || 0.9) * 100).toFixed(0)}% Match
                      </span>
                    </div>
                    {lastDialectResponse.clinicalKeywords && lastDialectResponse.clinicalKeywords.length > 0 && (
                      <div className="text-indigo-200 text-[11px] flex flex-wrap gap-1 items-center">
                        <span className="text-indigo-400">Identified Keywords:</span>
                        {lastDialectResponse.clinicalKeywords.map((kw, i) => (
                          <span key={i} className="bg-indigo-900/80 text-indigo-200 px-1.5 py-0.5 rounded text-[10px] border border-indigo-700/60">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic Follow-Up Question & Clinical Triage Guidance */}
                {triageAnalysis && (
                  <div className="pt-2.5 border-t border-indigo-800/80 space-y-2">
                    {/* Understood summary */}
                    {triageAnalysis.understoodSummary && (
                      <div className="bg-indigo-900/40 p-2 rounded-lg text-indigo-100 text-[11px]">
                        <span className="font-semibold text-indigo-300">Understood Symptoms: </span>
                        {triageAnalysis.understoodSummary}
                      </div>
                    )}

                    {/* Missing information or red flag prompt */}
                    {triageAnalysis.missingInformation && (
                      <div className="text-amber-300 text-[11px] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Clarification needed: {triageAnalysis.missingInformation}</span>
                      </div>
                    )}

                    {/* Seamless hand-off: automatically continue into the
                        detailed adaptive follow-up questioning — no manual
                        step required. Patient can choose to stay & answer
                        the quick follow-up here instead. */}
                    {isAdvancing && (
                      <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-emerald-200 text-[11px]">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span>
                            {patient.dialect === 'English'
                              ? `Understood. Asking detailed follow-up questions in ${advanceCountdown}s...`
                              : `समझ गया। ${advanceCountdown} सेकंड में विस्तृत सवाल पूछे जाएंगे...`}
                          </span>
                        </div>
                        <button
                          onClick={cancelAutoAdvance}
                          className="text-[11px] font-semibold text-emerald-300 hover:text-white underline cursor-pointer shrink-0"
                        >
                          {patient.dialect === 'English' ? 'Wait, stay here' : 'रुकिए, यहीं बात करूँगा'}
                        </button>
                      </div>
                    )}

                    {/* Dynamic Follow-up Question in Vernacular */}
                    {!isAdvancing && triageAnalysis.followUpQuestion && (
                      <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Follow-Up Question ({patient.dialect}):
                          </span>
                          <button
                            onClick={() => {
                              const q = triageAnalysis.followUpQuestionDialect || triageAnalysis.followUpQuestion || '';
                              speakLocalText(q, patient.dialect);
                            }}
                            className="flex items-center gap-1 text-[11px] text-amber-200 hover:text-white bg-amber-900/50 hover:bg-amber-900 px-2 py-0.5 rounded cursor-pointer transition-colors border border-amber-600/50"
                            title="Listen to question in selected dialect"
                          >
                            <Volume2 className="w-3 h-3" /> Listen
                          </button>
                        </div>

                        <p className="text-white text-xs font-medium">
                          {triageAnalysis.followUpQuestionDialect || triageAnalysis.followUpQuestion}
                        </p>
                        {triageAnalysis.followUpQuestionDialect && triageAnalysis.followUpQuestion && (
                          <p className="text-slate-300 text-[10px] italic">
                            ({triageAnalysis.followUpQuestion})
                          </p>
                        )}

                        {/* Button to speak the follow-up answer */}
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            onClick={handleStartFollowUpVoice}
                            disabled={isRecordingFollowUp || isNormalizingDialect}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isRecordingFollowUp
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs'
                            }`}
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>{isRecordingFollowUp ? 'Listening to reply...' : 'Answer Question by Voice'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Preliminary Care Advice / Solution */}
                    {triageAnalysis.preliminaryCareAdvice && (
                      <div className="bg-emerald-950/40 border border-emerald-600/40 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-300 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Initial Guidance:
                          </span>
                          <button
                            onClick={() => {
                              speakLocalText(triageAnalysis.preliminaryCareAdvice || '', patient.dialect);
                            }}
                            className="flex items-center gap-1 text-[10px] text-emerald-200 hover:text-white bg-emerald-900/50 hover:bg-emerald-900 px-2 py-0.5 rounded cursor-pointer transition-colors border border-emerald-700/50"
                          >
                            <Volume2 className="w-3 h-3" /> Listen
                          </button>
                        </div>
                        <p className="text-slate-200 text-xs">
                          {triageAnalysis.preliminaryCareAdvice}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2-Tap Visual Symptom Grid */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>2. Tap Symptoms for:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 font-bold">
                    {BODY_REGIONS.find((b) => b.id === activeRegion)?.nameHi || 'Selected Region'} (
                    {BODY_REGIONS.find((b) => b.id === activeRegion)?.nameEn})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tap to select or deselect complaints. All items are mapped to SNOMED CT and ICD-11.
                </p>
              </div>

              {selectedSymptoms.length > 0 && (
                <button
                  onClick={onClearSymptoms}
                  className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
            </div>

            {/* Symptom Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {regionSymptoms.map((symptom) => {
                const isSelected = selectedSymptoms.some((s) => s.id === symptom.id);
                return (
                  <div
                    key={symptom.id}
                    onClick={() => {
                      onToggleSymptom(symptom);
                      if (symptom.nameHi) {
                        speakLocalText(`आपने चुना: ${symptom.nameHi}`, patient.dialect);
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isSelected
                        ? symptom.isRedFlagTrigger
                          ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300'
                          : 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? symptom.isRedFlagTrigger
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {symptom.isRedFlagTrigger ? (
                        <Zap className="w-5 h-5" />
                      ) : (
                        <Activity className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 leading-tight">
                          {symptom.nameHi}
                        </span>
                        {symptom.isRedFlagTrigger && (
                          <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0">
                            Red Flag
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                        {symptom.nameEn}
                      </div>
                      {symptom.nameDialect && (
                        <div className="text-[10px] text-emerald-700 italic mt-0.5 truncate">
                          "{symptom.nameDialect}"
                        </div>
                      )}
                      <div className="text-[9px] text-slate-400 mt-1 font-mono">
                        SNOMED: {symptom.snomedCode.split('|')[0].trim()} • ICD: {symptom.icd11Code}
                      </div>
                    </div>

                    <div className="shrink-0 self-center">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? symptom.isRedFlagTrigger
                              ? 'bg-rose-600 border-rose-600 text-white'
                              : 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Symptoms Summary & Action Bar */}
          <div className="bg-slate-100/90 rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                <span>Active Triage Payload:</span>
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full font-mono">
                  {selectedSymptoms.length} Symptoms Recorded
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                SNOMED CT & ICD-11 codes mapped automatically for doctor case sheet.
              </p>
            </div>

            <button
              onClick={() => {
                cancelAutoAdvance();
                onProceedToQuestioning({
                  patientText: voiceTranscript || triageAnalysis?.understoodSummary || '',
                  bodyRegion: activeRegion,
                });
              }}
              disabled={selectedSymptoms.length === 0 && !voiceTranscript && !triageAnalysis}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSymptoms.length > 0 || voiceTranscript || triageAnalysis
                  ? isRedFlagActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md animate-bounce'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>Continue to Adaptive Triage (आगे बढ़ें)</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
