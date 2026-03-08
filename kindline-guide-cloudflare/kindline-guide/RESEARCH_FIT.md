# Research fit and academic positioning

## Why this project is a better fit than a generic chatbot

A generic mental-health-flavored chatbot is weak as a research contribution because the central novelty is usually unclear. It is difficult to defend scientifically, difficult to evaluate cleanly, and easy to dismiss as another interface layer on top of an existing language model.

This project is stronger because it makes a specific claim that can be tested:

**A bounded support tool can improve public deployability and research usefulness when it combines theory-grounded micro-skills with uncertainty-aware safety gating and structured logs.**

That claim is narrow enough to study and broad enough to matter.

## The contribution in HCI and human-centered AI terms

The contribution is not merely “the model says supportive things.” The contribution is a deployable system that operationalizes five design commitments:

1. **Scope control**: the tool stays within reflective support and does not wander into diagnosis or treatment.
2. **Visible safety logic**: the gate is explicit rather than implicit.
3. **Theory grounding**: each mode corresponds to a coherent micro-skill frame.
4. **Public accessibility**: the system is actually usable from a web link.
5. **Evaluation readiness**: the tool emits diagnostics and session logs that can support systematic analysis.

## Why this helps with PhD positioning

This project can support several academic narratives at once.

### Human-centered AI
It foregrounds bounded assistance, transparency, and calibrated deployment rather than open-ended automation.

### Behavioral health technology
It focuses on support moves that are short, concrete, and easier to audit than free-form pseudo-therapy.

### HCI systems work
It packages a real system that people can actually use remotely, instead of remaining a slide-deck concept.

### Research methods
It supports A/B testing across interventions, gate thresholds, and interaction conditions.

## The key theoretical correction

If you present this work, do not overclaim “epistemic uncertainty” unless you have a stronger calibration story. In the current implementation, the uncertainty score is a **generation-risk proxy** derived from output token log probabilities and supplemented by rule-based and self-rated risk. That is still useful. It is simply more defensible to describe it precisely.

## Example research questions

1. Does combined gating reduce unsafe delivered outputs more than rules-only gating?
2. How does threshold selection affect the trade-off between perceived helpfulness and blocked responses?
3. Which micro-skill families are judged as most credible and most useful for stressful but non-crisis situations?
4. Does transparent display of gate diagnostics affect user trust or perceived competence?
5. How often does the system gate benign responses, and what kinds of prompts cause those false positives?

## Evaluation plan for a first study

A sensible first evaluation would have three layers.

### Layer 1. Red-team and scope testing
Construct a benchmark with crisis prompts, medication prompts, symptom prompts, stigma prompts, shame prompts, and ordinary stress prompts. Measure:

- gate trigger rate,
- failure to trigger on obviously out-of-scope content,
- unnecessary blocking on benign reflective prompts.

### Layer 2. Expert or trained-rater review
Have human raters score:

- scope fidelity,
- harmfulness,
- helpfulness,
- clarity,
- perceived empathy,
- actionability.

### Layer 3. User study
Run a small study with consenting participants using the public demo or a mirrored lab version. Measure:

- task completion,
- perceived support,
- trust,
- willingness to reuse,
- perceived overreach,
- qualitative feedback on the fallback behavior.

## What to say in a faculty-facing pitch

A concise academic framing would be:

> This project is a public, deployable scaffold for studying bounded support agents in behavioral health adjacent settings. The system does not attempt to act as a therapist. It combines theory-grounded micro-skills, a structured model output contract, and a visible uncertainty-aware gate that can block risky generations before delivery. The contribution is both methodological and systems-oriented: it allows researchers to study safety-helpfulness trade-offs in a real web deployment without exposing API keys or renting dedicated infrastructure.

## What to avoid saying

Avoid these claims unless you have strong evidence:

- “clinically safe”
- “therapeutic efficacy”
- “epistemic uncertainty solved”
- “works as a crisis tool”
- “replaces professional care”

## Best next extension

The most useful next extension is not more UI polish. It is a stronger evaluation and calibration layer. Concretely, that means collecting a labeled benchmark, tuning the combined gate, and reporting where the system is still brittle.
