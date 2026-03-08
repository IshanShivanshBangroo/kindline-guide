# KindLine Guide

## What this project is

KindLine Guide is a bounded, uncertainty-aware support tool for reflective coping practice. It is meant for public demonstration, rapid evaluation, and research prototyping in human-centered AI. The core claim is simple: a public-facing support system should not behave like an open-ended assistant and then hope for the best. It should stay inside scope, expose its safety logic, and make evaluation straightforward.

This version is built for **Cloudflare Pages + Pages Functions + Workers AI** so that:
1. the site has a normal public URL,
2. the model runs on the backend,
3. no API key is exposed in the browser,
4. deployment does not require renting a dedicated server.

The system is intentionally narrow. It supports guided reflection for stressful moments, self-criticism, stigma-related self-judgment, and values-based next steps. It does **not** provide diagnosis, medication guidance, emergency management, or crisis counseling.

## Why this project is worth building

For PhD-facing work, the contribution should not be framed as “yet another chat wrapper.” The meaningful contribution is a deployable scaffold for a public research demo that combines three things in one place:

- a theory-grounded micro-skill library,
- a visible and auditable gating mechanism,
- structured outputs and session logs that are usable for evaluation.

That makes the project useful both as a public demo and as a research instrument.

## Core method

Each turn follows this sequence.

1. The user selects an intervention mode and submits a typed message, or uses browser speech input if available.
2. The backend runs a **pre-generation safety screen**. Crisis and clear medical requests are routed before the model is called.
3. The model receives a bounded system prompt and returns a structured object containing:
   - a draft response,
   - the micro-skill it claims to be using,
   - the support move,
   - a conservative self-rated risk score,
   - a short scope note.
4. The backend computes an uncertainty proxy from token log probabilities when the model exposes them.
5. The backend combines three signals:
   - token-level uncertainty,
   - model self-rated risk,
   - deterministic rule risk.
6. If the combined score exceeds the threshold, or if the content violates scope, the draft is blocked and replaced with a narrower fallback.
7. The final response, diagnostics, and local session log are returned to the browser.

## Important conceptual correction

The uncertainty value in this project is a **practical risk proxy**, not a pure measure of epistemic uncertainty. Token log probabilities can help detect hesitation or unstable generations, but a model can still be confidently wrong. That is why the gate combines logprob-based uncertainty with explicit rules and a structured self-risk field.

## Current intervention modes

### Stress reset
For an acute stressful moment. The system reflects the event, labels affect carefully, and offers one immediate next step.

### Self-compassion practice
For harsh self-talk, shame, and global self-condemnation. The system tries to separate the event from the self.

### Stigma reappraisal
For internalized stigma and identity-based self-judgment. The system helps the user distinguish context from global labels.

### Values-based next step
For procrastination and avoidance. The system identifies the value underneath the task and reduces the action to one realistic next step.

## Repository structure

```text
kindline-guide/
├── functions/
│   └── api/
│       ├── chat.js
│       ├── config.js
│       ├── evaluate.js
│       └── health.js
├── lib/
│   ├── engine.js
│   ├── evaluation.js
│   ├── interventions.js
│   ├── parsing.js
│   ├── prompting.js
│   ├── response-schema.js
│   ├── safety.js
│   └── uncertainty.js
├── public/
│   ├── _headers
│   ├── app.js
│   ├── index.html
│   ├── manifest.webmanifest
│   └── styles.css
├── DEPLOY.md
├── RESEARCH_FIT.md
├── package.json
└── wrangler.jsonc
```

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Authenticate Wrangler

```bash
npx wrangler login
```

### 3. Run the project locally

```bash
npm run dev
```

Open the local address printed by Wrangler.

## Public deployment

Read `DEPLOY.md` and follow it exactly. The short version is:

1. Put the entire folder in a GitHub repository.
2. Connect that repository to Cloudflare Pages.
3. Use `public` as the build output directory.
4. Confirm the Workers AI binding is named `AI`.
5. Deploy.
Deployment check

## What the evaluation panel is doing
The built-in evaluation endpoint runs a small fixed suite of cases through the same backend gate used by the live demo. It is not a substitute for a real benchmark, but it gives a reviewer a direct way to inspect how the gate behaves on obvious crisis, medical, and benign prompts.

## What this project does not claim
This is not a clinical system, not a therapy replacement, and not a crisis service. The public version should be positioned as a bounded support and evaluation tool. If you later want to study real users, storage, consent, and human-subjects review need to be handled properly.

## Suggested next research steps

1. Calibrate the threshold with a labeled dataset.
2. Compare uncertainty-only gating against rules-only gating and combined gating.
3. Measure how often gating improves safety without collapsing perceived helpfulness.
4. Add an explicit consent flow before storing any public user data.
5. Add stronger abuse protection if the public URL receives substantial traffic.

## License

MIT
