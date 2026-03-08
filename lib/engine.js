import { buildModelMessages } from './prompting.js';
import { assessSafety, buildFallback } from './safety.js';
import { computeUncertainty } from './uncertainty.js';
import { extractStructuredResponse } from './parsing.js';
import { RESPONSE_SCHEMA } from './response-schema.js';

const DEFAULT_MODEL = '@cf/zai-org/glm-4.7-flash';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeHistory(history) {
  return Array.isArray(history)
    ? history
        .filter((item) => item && typeof item.content === 'string' && (item.role === 'user' || item.role === 'assistant'))
        .map((item) => ({ role: item.role, content: item.content.trim() }))
    : [];
}

function computeCombinedRisk({ uncertainty, selfRisk, ruleRisk }) {
  const u = uncertainty?.available ? uncertainty.score : 0.5;
  const s = clamp(asNumber(selfRisk, 0.5), 0, 1);
  const r = clamp(asNumber(ruleRisk, 0), 0, 1);
  return Number((0.55 * u + 0.25 * s + 0.2 * r).toFixed(4));
}

function currentTimestamp() {
  return new Date().toISOString();
}

function getUsage(modelResponse) {
  return modelResponse?.usage || modelResponse?.response?.usage || null;
}

export async function runSupportTurn({ env, sessionId, interventionId, threshold, history, evalCaseId = null }) {
  const startedAt = Date.now();
  const normalizedHistory = normalizeHistory(history);
  const latestUserMessage = [...normalizedHistory].reverse().find((item) => item.role === 'user');
  const userText = latestUserMessage?.content || '';
  const safeThreshold = clamp(asNumber(threshold, 0.62), 0.2, 0.95);

  const precheck = assessSafety(userText);
  if (precheck.flags.crisis || precheck.flags.violence) {
    const finalText = buildFallback({ reason: 'crisis_precheck' });
    return {
      ok: true,
      model: env.MODEL_NAME || DEFAULT_MODEL,
      reply: finalText,
      draft: null,
      gate: {
        triggered: true,
        reason: 'crisis_precheck',
        combinedRisk: 1,
        uncertainty: { available: false, score: null, meanEntropy: null, meanSurprisal: null, tokenCount: 0 },
        selfRisk: 1,
        ruleRisk: 1,
        threshold: safeThreshold
      },
      intervention: null,
      scopeNote: 'Crisis content was handled before model generation.',
      usage: null,
      logEntry: {
        sessionId,
        evalCaseId,
        timestamp: currentTimestamp(),
        userText,
        assistantDraft: null,
        assistantFinal: finalText,
        gateTriggered: true,
        gateReason: 'crisis_precheck',
        combinedRisk: 1,
        uncertaintyScore: null,
        selfRisk: 1,
        ruleRisk: 1,
        threshold: safeThreshold,
        latencyMs: Date.now() - startedAt,
        usage: null
      }
    };
  }

  if (precheck.flags.medical) {
    const finalText = buildFallback({ reason: 'medical_boundary' });
    return {
      ok: true,
      model: env.MODEL_NAME || DEFAULT_MODEL,
      reply: finalText,
      draft: null,
      gate: {
        triggered: true,
        reason: 'medical_boundary',
        combinedRisk: 0.95,
        uncertainty: { available: false, score: null, meanEntropy: null, meanSurprisal: null, tokenCount: 0 },
        selfRisk: 1,
        ruleRisk: 0.85,
        threshold: safeThreshold
      },
      intervention: null,
      scopeNote: 'Medical content was handled before model generation.',
      usage: null,
      logEntry: {
        sessionId,
        evalCaseId,
        timestamp: currentTimestamp(),
        userText,
        assistantDraft: null,
        assistantFinal: finalText,
        gateTriggered: true,
        gateReason: 'medical_boundary',
        combinedRisk: 0.95,
        uncertaintyScore: null,
        selfRisk: 1,
        ruleRisk: 0.85,
        threshold: safeThreshold,
        latencyMs: Date.now() - startedAt,
        usage: null
      }
    };
  }

  const { intervention, messages } = buildModelMessages({ interventionId, history: normalizedHistory });
  const model = env.MODEL_NAME || DEFAULT_MODEL;

  let modelResponse;
  try {
    modelResponse = await env.AI.run(model, {
      messages,
      response_format: RESPONSE_SCHEMA,
      logprobs: true,
      top_logprobs: 5,
      max_completion_tokens: 220,
      temperature: 0.3,
      top_p: 0.9
    });
  } catch (error) {
    const finalText = buildFallback({ reason: 'model_error', interventionLabel: intervention.label });
    return {
      ok: true,
      model,
      reply: finalText,
      draft: null,
      gate: {
        triggered: true,
        reason: 'model_error',
        combinedRisk: 0.9,
        uncertainty: { available: false, score: null, meanEntropy: null, meanSurprisal: null, tokenCount: 0 },
        selfRisk: 1,
        ruleRisk: precheck.ruleRisk,
        threshold: safeThreshold
      },
      intervention,
      scopeNote: 'Model call failed. Safe fallback used.',
      usage: null,
      logEntry: {
        sessionId,
        evalCaseId,
        timestamp: currentTimestamp(),
        userText,
        assistantDraft: null,
        assistantFinal: finalText,
        gateTriggered: true,
        gateReason: 'model_error',
        combinedRisk: 0.9,
        uncertaintyScore: null,
        selfRisk: 1,
        ruleRisk: precheck.ruleRisk,
        threshold: safeThreshold,
        latencyMs: Date.now() - startedAt,
        usage: null,
        errorMessage: String(error?.message || error)
      }
    };
  }

  const parsed = extractStructuredResponse(modelResponse);
  if (!parsed || typeof parsed.draft_response !== 'string') {
    const finalText = buildFallback({ reason: 'invalid_model_output', interventionLabel: intervention.label });
    return {
      ok: true,
      model,
      reply: finalText,
      draft: null,
      gate: {
        triggered: true,
        reason: 'invalid_model_output',
        combinedRisk: 0.82,
        uncertainty: computeUncertainty(modelResponse),
        selfRisk: 1,
        ruleRisk: precheck.ruleRisk,
        threshold: safeThreshold
      },
      intervention,
      scopeNote: 'Model output could not be parsed as the required structured object.',
      usage: getUsage(modelResponse),
      logEntry: {
        sessionId,
        evalCaseId,
        timestamp: currentTimestamp(),
        userText,
        assistantDraft: null,
        assistantFinal: finalText,
        gateTriggered: true,
        gateReason: 'invalid_model_output',
        combinedRisk: 0.82,
        uncertaintyScore: computeUncertainty(modelResponse).score,
        selfRisk: 1,
        ruleRisk: precheck.ruleRisk,
        threshold: safeThreshold,
        latencyMs: Date.now() - startedAt,
        usage: getUsage(modelResponse)
      }
    };
  }

  const uncertainty = computeUncertainty(modelResponse);
  const postcheck = assessSafety(parsed.draft_response);
  const selfRisk = clamp(asNumber(parsed.model_risk, 0.5), 0, 1);
  const ruleRisk = Math.max(precheck.ruleRisk, postcheck.ruleRisk);
  const combinedRisk = computeCombinedRisk({ uncertainty, selfRisk, ruleRisk });

  let gateReason = null;
  let finalText = String(parsed.draft_response || '').trim();
  if (postcheck.flags.crisis || postcheck.flags.violence) {
    gateReason = 'crisis_postcheck';
    finalText = buildFallback({ reason: 'crisis_postcheck' });
  } else if (postcheck.flags.medical) {
    gateReason = 'medical_boundary';
    finalText = buildFallback({ reason: 'medical_boundary' });
  } else if (combinedRisk >= safeThreshold) {
    gateReason = 'uncertainty_gate';
    finalText = buildFallback({ reason: 'uncertainty_gate', interventionLabel: intervention.label });
  }

  const gateTriggered = Boolean(gateReason);
  const usage = getUsage(modelResponse);
  const responsePayload = {
    ok: true,
    model,
    reply: finalText,
    draft: String(parsed.draft_response || '').trim(),
    intervention: {
      id: intervention.id,
      label: intervention.label,
      theoryBasis: intervention.theoryBasis
    },
    microSkill: parsed.micro_skill,
    supportMove: parsed.support_move,
    scopeNote: parsed.scope_note,
    gate: {
      triggered: gateTriggered,
      reason: gateReason,
      combinedRisk,
      uncertainty,
      selfRisk,
      ruleRisk,
      threshold: safeThreshold
    },
    usage,
    logEntry: {
      sessionId,
      evalCaseId,
      timestamp: currentTimestamp(),
      userText,
      assistantDraft: String(parsed.draft_response || '').trim(),
      assistantFinal: finalText,
      interventionId: intervention.id,
      interventionLabel: intervention.label,
      microSkill: parsed.micro_skill,
      supportMove: parsed.support_move,
      scopeNote: parsed.scope_note,
      gateTriggered,
      gateReason,
      combinedRisk,
      uncertaintyScore: uncertainty.score,
      meanEntropy: uncertainty.meanEntropy,
      meanSurprisal: uncertainty.meanSurprisal,
      selfRisk,
      ruleRisk,
      threshold: safeThreshold,
      latencyMs: Date.now() - startedAt,
      usage
    }
  };

  return responsePayload;
}
