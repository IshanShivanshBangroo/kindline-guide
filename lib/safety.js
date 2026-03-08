const CRISIS_PATTERNS = [
  /suicid/i,
  /kill myself/i,
  /end my life/i,
  /hurt myself/i,
  /self[-\s]?harm/i,
  /overdose/i,
  /i want to die/i,
  /can'?t go on/i,
  /not safe with myself/i,
  /jump off/i,
  /cut myself/i
];

const MEDICAL_PATTERNS = [
  /diagnos/i,
  /prescrib/i,
  /dose/i,
  /dosage/i,
  /medication/i,
  /should i take/i,
  /what pill/i,
  /side effect/i,
  /chest pain/i,
  /shortness of breath/i,
  /cannot breathe/i,
  /can'?t breathe/i,
  /seizure/i,
  /pregnan/i,
  /blood pressure/i,
  /urgent care/i
];

const DISTRESS_PATTERNS = [
  /hopeless/i,
  /worthless/i,
  /ashamed/i,
  /panic/i,
  /i hate myself/i,
  /burden/i,
  /disgusted with myself/i,
  /nobody would care/i,
  /i am broken/i,
  /i ruin everything/i
];

const VIOLENCE_PATTERNS = [
  /kill them/i,
  /hurt them/i,
  /stab/i,
  /shoot/i,
  /attack/i,
  /violence/i
];

function matchAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function assessSafety(text = '') {
  const normalized = String(text || '').trim();
  const flags = {
    crisis: matchAny(normalized, CRISIS_PATTERNS),
    medical: matchAny(normalized, MEDICAL_PATTERNS),
    highDistress: matchAny(normalized, DISTRESS_PATTERNS),
    violence: matchAny(normalized, VIOLENCE_PATTERNS)
  };

  let ruleRisk = 0;
  if (flags.highDistress) ruleRisk = Math.max(ruleRisk, 0.4);
  if (flags.medical) ruleRisk = Math.max(ruleRisk, 0.85);
  if (flags.crisis || flags.violence) ruleRisk = 1;

  return { flags, ruleRisk };
}

export function buildFallback({ reason, interventionLabel = 'this support mode' }) {
  switch (reason) {
    case 'crisis_precheck':
    case 'crisis_postcheck':
      return 'I am really glad you said that directly. I cannot help with a plan to harm yourself or someone else. Please contact local emergency services now or reach an immediate crisis resource where you are. If you are in the U.S. or Canada, call or text 988 now. If possible, move near another person and tell them you need immediate help.';
    case 'medical_boundary':
      return 'I can help you reflect on what you are feeling, but I cannot assess symptoms, diagnose, or give treatment instructions. For urgent symptoms, please contact a licensed clinician, urgent care, or local emergency services. Tell me what is worrying you in one or two sentences, and I can help you phrase it clearly for a clinician.';
    case 'uncertainty_gate':
      return `I want to stay careful here. Let us continue with ${interventionLabel.toLowerCase()} in a narrower way. Tell me either what happened, what you are feeling, or what you need to do next. Choose just one.`;
    case 'invalid_model_output':
    case 'model_error':
      return 'I am going to keep this simple rather than guess. Tell me what happened in one short paragraph, and tell me what feels most difficult right now.';
    default:
      return 'Let us slow this down and keep it precise. Tell me what happened in one short paragraph, and then name the part that feels hardest.';
  }
}
