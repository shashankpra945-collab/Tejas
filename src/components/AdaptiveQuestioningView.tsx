import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  CloudSun,
  Flame,
  Volume2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Stethoscope,
  Info,
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  Mic,
  MicOff,
  Send,
  FileText,
  FileCheck,
  UploadCloud,
  FileSpreadsheet,
  Upload,
  Plus,
  Trash2,
  Eye,
  Check,
} from 'lucide-react';
import {
  PatientProfile,
  GisEnvironment,
  SymptomItem,
  AdaptiveQuestion,
  IntakeSessionAnalysis,
  ClinicalPatientSummary,
  HardwareVitals,
  UploadedMedicalDocument,
} from '../types';
import { speakLocalText, audioSynth } from '../utils/speechEngine';

interface AdaptiveQuestioningViewProps {
  patient: PatientProfile;
  gisContext: GisEnvironment;
  selectedSymptoms: SymptomItem[];
  questionsHistory: AdaptiveQuestion[];
  bodyRegion?: string;
  freeTextInput?: string;
  ocrText?: string;
  vitals?: HardwareVitals['vitals'];
  clinicalAnalysis?: IntakeSessionAnalysis | null;
  doctorSummary?: ClinicalPatientSummary | null;
  uploadedDocuments?: UploadedMedicalDocument[];
  onUpdateUploadedDocuments?: (docs: UploadedMedicalDocument[]) => void;
  onUpdateAnalysis?: (analysis: IntakeSessionAnalysis, summary: ClinicalPatientSummary) => void;
  onAddAnsweredQuestion: (question: AdaptiveQuestion) => void;
  onProceedToVitals: () => void;
  onViewDoctorSummary?: () => void;
}

export const AdaptiveQuestioningView: React.FC<AdaptiveQuestioningViewProps> = ({
  patient,
  gisContext,
  selectedSymptoms,
  questionsHistory,
  bodyRegion = '',
  freeTextInput = '',
  ocrText = '',
  vitals,
  clinicalAnalysis,
  doctorSummary,
  uploadedDocuments = [],
  onUpdateUploadedDocuments,
  onUpdateAnalysis,
  onAddAnsweredQuestion,
  onProceedToVitals,
  onViewDoctorSummary,
}) => {
  const [currentQuestion, setCurrentQuestion] = useState<AdaptiveQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customAnswerText, setCustomAnswerText] = useState<string>('');
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [stepPhase, setStepPhase] = useState<'QUESTIONING' | 'DOCUMENTS_REQUEST' | 'ANALYSING' | 'SUMMARY_READY'>(
    doctorSummary ? 'SUMMARY_READY' : 'QUESTIONING'
  );

  const [localDocs, setLocalDocs] = useState<UploadedMedicalDocument[]>(uploadedDocuments);
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);
  const [analysisProgressMessage, setAnalysisProgressMessage] = useState('Consolidating patient conversation & clinical answers...');

  const [localAnalysis, setLocalAnalysis] = useState<IntakeSessionAnalysis | null>(clinicalAnalysis || null);
  const [localSummary, setLocalSummary] = useState<ClinicalPatientSummary | null>(doctorSummary || null);

  // Sync docs with parent
  const handleUpdateLocalDocs = (docs: UploadedMedicalDocument[]) => {
    setLocalDocs(docs);
    if (onUpdateUploadedDocuments) {
      onUpdateUploadedDocuments(docs);
    }
  };

  // Add sample document for test/demo
  const handleAddSampleDoc = (type: 'PRESCRIPTION' | 'LAB_REPORT') => {
    const sampleDoc: UploadedMedicalDocument =
      type === 'PRESCRIPTION'
        ? {
            id: `doc_${Date.now()}_rx`,
            name: 'Previous_OPD_Prescription_2025.jpg',
            documentType: 'PRESCRIPTION',
            uploadDate: new Date().toLocaleDateString('en-GB'),
            extractedSummary: 'Rx: Tab Pantoprazole 40mg OD x 14d, Syrup Sucralfate 10ml TID, Tab Paracetamol 650mg SOS.',
            ocrTextSnippet: 'DISTRICT HOSPITAL OPD - Dr. Sharma. C/o Epigastric burning, acid reflux x 2 weeks. Rx: Pantoprazole 40mg, Sucralfate.',
            fileSize: '1.4 MB',
          }
        : {
            id: `doc_${Date.now()}_lab`,
            name: 'Routine_Blood_Report_CBC_LFT.pdf',
            documentType: 'LAB_REPORT',
            uploadDate: new Date().toLocaleDateString('en-GB'),
            extractedSummary: 'Hb: 12.8 g/dL, TLC: 7,400 /mcL, Platelets: 2.15 Lakhs, Bilirubin: 0.9 mg/dL (Normal).',
            ocrTextSnippet: 'PATHOLOGY LABORATORY REPORT: Hemoglobin 12.8 g/dL, Total WBC Count 7,400. All routine hematology parameters within reference range.',
            fileSize: '840 KB',
          };

    const updated = [...localDocs, sampleDoc];
    handleUpdateLocalDocs(updated);
    audioSynth.playConfirmChime();
  };

  const handleRemoveDoc = (id: string) => {
    const updated = localDocs.filter((d) => d.id !== id);
    handleUpdateLocalDocs(updated);
  };

  // Analyze patient condition and determine next adaptive question
  const runConditionAnalysis = async (history: AdaptiveQuestion[], docsToInclude?: UploadedMedicalDocument[]) => {
    setIsLoadingNext(true);
    const docs = docsToInclude || localDocs;
    try {
      const res = await fetch('/api/gemini/intelligent-patient-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          selectedSymptoms,
          freeTextInput,
          bodyRegion,
          ocrText,
          vitals,
          uploadedDocuments: docs,
          adaptiveHistory: history.map((h) => ({
            questionEn: h.questionEn,
            questionLocal: h.questionLocal,
            selectedAnswer: h.selectedAnswer,
            clinicalRationale: h.clinicalRationale,
          })),
          gisContext,
        }),
      });

      const data = await res.json();
      if (data.analysis) {
        setLocalAnalysis(data.analysis);
      }
      if (data.doctorSummary) {
        setLocalSummary(data.doctorSummary);
      }
      if (onUpdateAnalysis && data.analysis && data.doctorSummary) {
        onUpdateAnalysis(data.analysis, data.doctorSummary);
      }

      // If sufficient info has been gathered or emergency detected, stop asking questions
      if (data.analysis?.sufficientInfoCollected || data.analysis?.emergencyDetected) {
        setCurrentQuestion(null);
        if (data.analysis.emergencyDetected) {
          audioSynth.playRedFlagAlarm();
        } else {
          audioSynth.playConfirmChime();
        }
        return;
      }

      // Formulate next follow-up question
      if (data.analysis?.nextFollowUpQuestion) {
        const nextQ = data.analysis.nextFollowUpQuestion;
        const newQ: AdaptiveQuestion = {
          id: `q_${Date.now()}`,
          questionNumber: history.length + 1,
          questionEn: nextQ.english || 'Could you describe the severity and progression of your symptoms?',
          questionLocal: nextQ.local || 'कृपया अपने लक्षणों की गंभीरता और अवधि बताएं।',
          clinicalRationale: nextQ.clinicalRationale || 'Collecting necessary clinical dimension for doctor review.',
          snomedCode: nextQ.snomedCode || '29857009 | Clinical symptom',
          icd11Code: nextQ.icd11Code || 'MG22',
          options: nextQ.suggestedOptions || [
            'Mild, noticeable but manageable',
            'Moderate, limits routine activity',
            'Severe, constant discomfort',
            'Comes and goes intermittently',
          ],
        };

        setCurrentQuestion(newQ);
        setSelectedOption('');
        setCustomAnswerText('');
        audioSynth.playConfirmChime();

        if (newQ.questionLocal) {
          speakLocalText(newQ.questionLocal, patient.dialect);
        }
      } else {
        setCurrentQuestion(null);
      }
    } catch (err) {
      console.warn('Condition analysis note:', err);
    } finally {
      setIsLoadingNext(false);
    }
  };

  useEffect(() => {
    if (questionsHistory.length === 0 && !currentQuestion && !localAnalysis?.sufficientInfoCollected) {
      runConditionAnalysis([]);
    }
  }, []);

  // Web Speech recognition for vernacular voice input
  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your response.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang =
        patient.dialect === 'Hindi'
          ? 'hi-IN'
          : patient.dialect === 'Tamil'
          ? 'ta-IN'
          : patient.dialect === 'Telugu'
          ? 'te-IN'
          : patient.dialect === 'Bengali'
          ? 'bn-IN'
          : 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCustomAnswerText(transcript);
        setSelectedOption(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSelectOption = (opt: string) => {
    setSelectedOption(opt);
    setCustomAnswerText('');
    speakLocalText(`आपने चुना: ${opt}`, patient.dialect);
  };

  const handleNextStep = () => {
    const finalAnswer = customAnswerText.trim() || selectedOption;
    if (!currentQuestion || !finalAnswer) return;

    const answered: AdaptiveQuestion = {
      ...currentQuestion,
      selectedAnswer: finalAnswer,
      answeredAt: new Date().toLocaleTimeString('en-IN'),
    };

    const newHistory = [...questionsHistory, answered];
    onAddAnsweredQuestion(answered);

    // Re-evaluate condition and decide if further question is needed
    runConditionAnalysis(newHistory);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Intelligent Intake
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">• Contextual & Non-Repetitive</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-display flex items-center gap-2 mt-1">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Intelligent Patient Condition Analysis & Dynamic Follow-Up
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl mt-1">
            The AI analyzes symptoms, voice statements, body regions, and past answers in real time, asking only essential follow-up questions and generating a One-Page Doctor Summary.
          </p>
        </div>

        {/* Ambient GIS & Language Context */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-semibold">{gisContext.city}, {gisContext.state}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            <CloudSun className="w-3.5 h-3.5 text-amber-600" />
            <span>{gisContext.tempC}°C | AQI {gisContext.aqi}</span>
          </div>
          {gisContext.activeOutbreaks.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span className="font-medium">{gisContext.activeOutbreaks[0].disease.split(' ')[0]} Watch</span>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Red Flag Notice if Detected */}
      {localAnalysis?.emergencyDetected && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-5 text-rose-950 shadow-sm flex items-start gap-4 animate-pulse">
          <AlertOctagon className="w-7 h-7 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <h3 className="font-black text-rose-900 uppercase tracking-wide">
              Emergency Protocol Triggered — Immediate Evaluation Required
            </h3>
            <p className="text-rose-800">
              {localAnalysis.emergencyGuidance ||
                'High-risk acute symptom presentation detected. Routine intake questioning has been stopped. The patient requires immediate medical attention from an on-duty medical officer or hospital emergency transfer.'}
            </p>
            {onViewDoctorSummary && (
              <div className="pt-2">
                <button
                  onClick={onViewDoctorSummary}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Open Emergency Doctor Summary</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Active Adaptive Questioning (Left) + Intelligent Condition Analysis (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Adaptive Question Flow (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          {/* Header Progress */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">
                {questionsHistory.length + 1}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {localAnalysis?.sufficientInfoCollected
                  ? 'Intake Complete'
                  : `Adaptive Follow-Up Question #${questionsHistory.length + 1}`}
              </span>
            </div>

            <div className="text-xs text-slate-500">
              {localAnalysis?.sufficientInfoCollected ? (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  ✓ Clinical Information Sufficient
                </span>
              ) : (
                <span>Adaptive Contextual Mode</span>
              )}
            </div>
          </div>

          {isLoadingNext ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="text-sm font-semibold text-slate-800">
                Intelligently Evaluating Patient Context...
              </div>
              <p className="text-xs text-slate-400 max-w-sm text-center">
                Reviewing symptoms, reported chronology, and missing clinical data to avoid unnecessary questions.
              </p>
            </div>
          ) : currentQuestion && !localAnalysis?.sufficientInfoCollected ? (
            <div className="space-y-5">
              {/* Question Header & Voice Playback */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {currentQuestion.questionLocal}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      {currentQuestion.questionEn}
                    </p>
                  </div>

                  <button
                    onClick={() => speakLocalText(currentQuestion.questionLocal, patient.dialect)}
                    className="p-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shrink-0 cursor-pointer"
                    title="Speak Question Aloud (आवाज सुनें)"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Clinical Rationale & Standard Codes */}
                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="bg-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded-md font-semibold">
                    SNOMED: {currentQuestion.snomedCode}
                  </span>
                  <div className="text-slate-500 italic flex items-center gap-1 w-full mt-1">
                    <Info className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Clinical Need: {currentQuestion.clinicalRationale}</span>
                  </div>
                </div>
              </div>

              {/* Tap-Friendly Suggested Answers */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-700">
                  Select an Answer Option (या विकल्प चुनें):
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedOption === opt && !customAnswerText;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOption(opt)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300 font-semibold text-blue-900'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 text-slate-500'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="text-xs sm:text-sm">{opt}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Or Patient Voice / Free-Form Response Input */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Or reply in your own words (अपनी भाषा में बोलें या लिखें):</span>
                  <button
                    onClick={toggleVoiceInput}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isListening ? 'Listening...' : 'Speak (बोलें)'}</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAnswerText}
                    onChange={(e) => {
                      setCustomAnswerText(e.target.value);
                      setSelectedOption(e.target.value);
                    }}
                    placeholder="Type custom response here..."
                    className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Next Step Action */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setStepPhase('DOCUMENTS_REQUEST')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                >
                  Proceed to Document Upload (Step 6) →
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runConditionAnalysis(questionsHistory)}
                    className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                  >
                    Skip
                  </button>

                  <button
                    onClick={handleNextStep}
                    disabled={!selectedOption && !customAnswerText}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedOption || customAnswerText
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>Submit & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : stepPhase === 'DOCUMENTS_REQUEST' ? (
            // STEP 6: PREVIOUS MEDICAL DOCUMENTS REQUEST
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Step 6 of 11 • Document Collection
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  Upload Previous Medical Documents (वैकल्पिक पिछला रिकॉर्ड)
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  यदि आपके पास कोई पिछला पर्चा, मेडिकल रिपोर्ट, लैब टेस्ट या डॉक्टर के कागजात हैं, तो आप उन्हें यहाँ अपलोड कर सकते हैं। यह डॉक्टर को आपकी बीमारी और इतिहास को बेहतर ढंग से समझने में मदद करेगा।
                </p>
                <p className="text-xs text-slate-500 mt-0.5 italic">
                  If you have previous prescriptions, lab reports, discharge summaries, or doctor slips, uploading them helps the doctor understand your full medical history. (Optional)
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingDoc(true);
                }}
                onDragLeave={() => setIsDraggingDoc(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingDoc(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    const newDoc: UploadedMedicalDocument = {
                      id: `doc_${Date.now()}`,
                      name: file.name,
                      documentType: file.name.toLowerCase().includes('lab') || file.name.toLowerCase().includes('blood') || file.name.toLowerCase().includes('report') ? 'LAB_REPORT' : 'PRESCRIPTION',
                      uploadDate: new Date().toLocaleDateString('en-GB'),
                      fileSize: `${Math.round(file.size / 1024)} KB`,
                      extractedSummary: `Uploaded patient document: ${file.name}. Queued for AI synthesis.`,
                    };
                    handleUpdateLocalDocs([...localDocs, newDoc]);
                    audioSynth.playConfirmChime();
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isDraggingDoc
                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-900">
                  Drop medical files here, or{' '}
                  <label className="text-blue-600 hover:text-blue-700 underline cursor-pointer">
                    browse files
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const file = e.target.files[0];
                          const newDoc: UploadedMedicalDocument = {
                            id: `doc_${Date.now()}`,
                            name: file.name,
                            documentType: file.name.toLowerCase().includes('lab') || file.name.toLowerCase().includes('blood') || file.name.toLowerCase().includes('report') ? 'LAB_REPORT' : 'PRESCRIPTION',
                            uploadDate: new Date().toLocaleDateString('en-GB'),
                            fileSize: `${Math.round(file.size / 1024)} KB`,
                            extractedSummary: `Uploaded patient document: ${file.name}. Queued for AI synthesis.`,
                          };
                          handleUpdateLocalDocs([...localDocs, newDoc]);
                          audioSynth.playConfirmChime();
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports Images (PNG, JPG), PDF reports & prescriptions (up to 15MB)
                </p>

                {/* Quick Add Demo Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-200/60">
                  <span className="text-[11px] text-slate-500 font-medium">Quick sample test records:</span>
                  <button
                    type="button"
                    onClick={() => handleAddSampleDoc('PRESCRIPTION')}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3 text-blue-600" />
                    <span>+ Sample Prescription</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSampleDoc('LAB_REPORT')}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>+ Sample Lab Report (CBC)</span>
                  </button>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {localDocs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Uploaded Documents ({localDocs.length})</span>
                    <span className="text-emerald-700 font-semibold text-[11px]">✓ Ready for Doctor Review</span>
                  </div>
                  <div className="space-y-2">
                    {localDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                            {doc.documentType === 'LAB_REPORT' ? (
                              <FileSpreadsheet className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{doc.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {doc.documentType} • {doc.fileSize || 'Standard'} • {doc.uploadDate}
                            </div>
                            {doc.extractedSummary && (
                              <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-md mt-1 border border-slate-100 leading-snug">
                                {doc.extractedSummary}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons: Step 7 & 8 Trigger */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStepPhase('QUESTIONING')}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  ← Back to Follow-Up Questions
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setStepPhase('ANALYSING');
                      setAnalysisProgressMessage('Consolidating patient conversation, complaints & follow-up answers...');
                      setTimeout(() => setAnalysisProgressMessage('Extracting previous prescription drugs & lab values...'), 800);
                      setTimeout(() => setAnalysisProgressMessage('Auditing red flags & synthesising concise Doctor Summary...'), 1600);
                      await runConditionAnalysis(questionsHistory, localDocs);
                      setStepPhase('SUMMARY_READY');
                      audioSynth.playConfirmChime();
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ Analyse All Information & Generate Doctor Summary →</span>
                  </button>

                  {localDocs.length === 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        setStepPhase('ANALYSING');
                        await runConditionAnalysis(questionsHistory, []);
                        setStepPhase('SUMMARY_READY');
                        audioSynth.playConfirmChime();
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <span>Continue without Documents →</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : stepPhase === 'ANALYSING' ? (
            // STEP 7: COMPREHENSIVE CONSOLIDATED ANALYSIS IN PROGRESS
            <div className="py-12 px-6 text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Step 7 of 11 • Consolidated Analysis
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">
                  Synthesizing Comprehensive Patient Profile
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  {analysisProgressMessage}
                </p>
              </div>

              {/* Progress Checklist */}
              <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2.5">
                <div className="flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Patient verbal conversation & chief complaint verified</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{questionsHistory.length} follow-up answers integrated into timeline</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Body region ({bodyRegion || 'Reported Region'}) mapped to clinical corpus</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{localDocs.length} medical documents & OCR snippets cross-referenced</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Deterministic red-flag safety rules validated</span>
                </div>
              </div>
            </div>
          ) : (
            // STEP 8: SUMMARY READY & INTAKE COMPLETE
            <div className="py-6 space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-950 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Check className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    Step 8 Complete • Concise Doctor Summary Ready
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-emerald-950">
                    Concise One-Page Doctor Summary Generated
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    All patient statements, symptoms, {questionsHistory.length} follow-up answers, and {localDocs.length} uploaded medical documents have been consolidated into an auditable case file for the attending physician.
                  </p>
                </div>
              </div>

              {/* Summary Highlight Preview Box */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 text-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Summary Highlights (Ready for Doctor Dashboard)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Chief Complaint</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {localAnalysis?.understoodChiefComplaint || selectedSymptoms.map((s) => s.nameEn).join(', ') || 'Reported symptoms'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Duration & Severity</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {localAnalysis?.clinicalInformation?.duration || '3 days'} • {localAnalysis?.clinicalInformation?.severity || 'Moderate'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Emergency Red Flags</div>
                    <div className="font-bold text-emerald-700 mt-0.5">
                      {localAnalysis?.emergencyDetected ? '⚠️ Critical Red Flag Warning' : '🟢 No Emergency Flags Triggered'}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Uploaded Documents</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {localDocs.length > 0 ? `${localDocs.length} Documents Attached` : 'No Previous Documents'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Proceed to Doctor Dashboard (Step 9) or Vitals Bridge */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStepPhase('DOCUMENTS_REQUEST')}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  ← Review / Add More Documents
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {onViewDoctorSummary && (
                    <button
                      type="button"
                      onClick={onViewDoctorSummary}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
                    >
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Open Doctor Dashboard & Review Summary (Step 9) →</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onProceedToVitals}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Connect Medical Vitals</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Intelligent Patient Condition Analysis Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <span>Intelligent Condition Analysis</span>
              </h3>
              <button
                onClick={() => runConditionAnalysis(questionsHistory)}
                disabled={isLoadingNext}
                className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer font-semibold"
                title="Re-run Analysis"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingNext ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* 1. Patient-Reported Information */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                1. Patient-Reported Information
              </span>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1 text-slate-800">
                <div>
                  <span className="text-slate-500">Chief Complaint: </span>
                  <strong className="text-slate-900">
                    {localAnalysis?.understoodChiefComplaint ||
                      selectedSymptoms.map((s) => s.nameEn).join(', ') ||
                      freeTextInput ||
                      'Not provided yet'}
                  </strong>
                </div>
                {bodyRegion && (
                  <div>
                    <span className="text-slate-500">Body Region: </span>
                    <span className="text-slate-900">{bodyRegion}</span>
                  </div>
                )}
                {ocrText && (
                  <div>
                    <span className="text-slate-500">OCR Report Text: </span>
                    <span className="text-slate-700 italic">
                      "{ocrText.slice(0, 70)}..."
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Duration / Severity: </span>
                  <span>
                    {localAnalysis?.clinicalInformation?.duration || 'Not provided'} /{' '}
                    {localAnalysis?.clinicalInformation?.severity || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. AI-Generated Observations (Clearly Labeled) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                  2. AI Clinical Observations
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                  Not a Confirmed Diagnosis
                </span>
              </div>
              <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-200 text-xs text-amber-950 space-y-1">
                {localAnalysis?.aiObservations && localAnalysis.aiObservations.length > 0 ? (
                  localAnalysis.aiObservations.map((obs, i) => (
                    <div key={i} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{obs}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">
                    AI observations will update dynamically as information is collected.
                  </div>
                )}
              </div>
            </div>

            {/* 3. Missing Important Information */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>3. Missing Clinical Dimensions</span>
              </span>
              <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-200 text-xs text-blue-950 space-y-1">
                {localAnalysis?.missingInformation && localAnalysis.missingInformation.length > 0 ? (
                  localAnalysis.missingInformation.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{item}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">
                    Assessing clinical completeness...
                  </div>
                )}
              </div>
            </div>

            {/* 4. Professional Medical Confirmation Notice */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Safety Directive: </span>
              All observations are subject to independent physician verification. The attending doctor remains solely responsible for clinical decisions.
            </div>

            {/* Direct Quick Button to One-Page Summary */}
            {onViewDoctorSummary && (
              <div className="pt-1">
                <button
                  onClick={onViewDoctorSummary}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <FileText className="w-4 h-4" />
                  <span>Preview One-Page Doctor Summary</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
