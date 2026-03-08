function softmaxFromLogProbs(logProbs) {
  const valid = logProbs.filter((value) => Number.isFinite(value));
  if (!valid.length) return [];
  const max = Math.max(...valid);
  const exps = logProbs.map((value) => (Number.isFinite(value) ? Math.exp(value - max) : 0));
  const sum = exps.reduce((acc, value) => acc + value, 0);
  if (!sum) return [];
  return exps.map((value) => value / sum);
}

function normalizedEntropy(probs) {
  const clean = probs.filter((value) => value > 0);
  if (clean.length <= 1) return 0;
  const entropy = -clean.reduce((acc, p) => acc + p * Math.log(p), 0);
  const denom = Math.log(clean.length);
  if (!denom) return 0;
  return entropy / denom;
}

function normalizeSurprisal(logprob) {
  if (!Number.isFinite(logprob)) return 0.5;
  const surprisal = -logprob;
  return Math.max(0, Math.min(1, surprisal / 5));
}

function extractOpenAIStyleLogprobContent(modelResponse) {
  const choices = modelResponse?.choices;
  if (Array.isArray(choices) && choices[0]?.logprobs?.content) {
    return choices[0].logprobs.content;
  }

  const response = modelResponse?.response;
  if (response?.choices?.[0]?.logprobs?.content) {
    return response.choices[0].logprobs.content;
  }

  return null;
}

export function computeUncertainty(modelResponse) {
  const content = extractOpenAIStyleLogprobContent(modelResponse);
  if (!Array.isArray(content) || content.length === 0) {
    return {
      available: false,
      score: null,
      meanEntropy: null,
      meanSurprisal: null,
      tokenCount: 0
    };
  }

  const entropies = [];
  const surprisals = [];

  for (const tokenInfo of content) {
    const chosenLogProb = Number(tokenInfo?.logprob);
    const candidates = Array.isArray(tokenInfo?.top_logprobs)
      ? tokenInfo.top_logprobs.map((item) => Number(item?.logprob)).filter(Number.isFinite)
      : [];

    if (Number.isFinite(chosenLogProb) && !candidates.includes(chosenLogProb)) {
      candidates.push(chosenLogProb);
    }

    const probs = softmaxFromLogProbs(candidates);
    entropies.push(normalizedEntropy(probs));
    surprisals.push(normalizeSurprisal(chosenLogProb));
  }

  const meanEntropy = entropies.reduce((acc, value) => acc + value, 0) / entropies.length;
  const meanSurprisal = surprisals.reduce((acc, value) => acc + value, 0) / surprisals.length;
  const score = 0.7 * meanEntropy + 0.3 * meanSurprisal;

  return {
    available: true,
    score: Number(score.toFixed(4)),
    meanEntropy: Number(meanEntropy.toFixed(4)),
    meanSurprisal: Number(meanSurprisal.toFixed(4)),
    tokenCount: content.length
  };
}
