const state = {
  sessionId: crypto.randomUUID(),
  config: null,
  interventions: [],
  selectedInterventionId: 'stress_reset',
  threshold: 0.62,
  voiceEnabled: true,
  micEnabled: false,
  messages: [],
  turnLogs: [],
  recognition: null,
  micActive: false
};

const els = {
  appTitle: document.getElementById('app-title'),
  appSubtitle: document.getElementById('app-subtitle'),
  modelPill: document.getElementById('model-pill'),
  sessionPill: document.getElementById('session-pill'),
  interventionSelect: document.getElementById('intervention-select'),
  interventionDescription: document.getElementById('intervention-description'),
  interventionTheory: document.getElementById('intervention-theory'),
  thresholdRange: document.getElementById('threshold-range'),
  thresholdValue: document.getElementById('threshold-value'),
  voiceToggle: document.getElementById('voice-toggle'),
  micToggle: document.getElementById('mic-toggle'),
  clearButton: document.getElementById('clear-button'),
  exportButton: document.getElementById('export-button'),
  evalButton: document.getElementById('eval-button'),
  statusBox: document.getElementById('status-box'),
  chatLog: document.getElementById('chat-log'),
  composer: document.getElementById('composer'),
  messageInput: document.getElementById('message-input'),
  micButton: document.getElementById('mic-button'),
  sendButton: document.getElementById('send-button'),
  latestDiagnostics: document.getElementById('latest-diagnostics'),
  evaluationResults: document.getElementById('evaluation-results')
};

function setStatus(message) {
  els.statusBox.textContent = message;
}

function getSelectedIntervention() {
  return state.interventions.find((item) => item.id === state.selectedInterventionId) || state.interventions[0];
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  return Number(value).toFixed(3);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderInterventionDetails() {
  const selected = getSelectedIntervention();
  if (!selected) return;
  els.interventionDescription.textContent = selected.description;
  els.interventionTheory.textContent = `Theory basis: ${selected.theoryBasis}`;
}

function renderMessages() {
  els.chatLog.innerHTML = state.messages
    .map((item) => {
      const meta = item.role === 'assistant' && item.meta
        ? `Gate: ${item.meta.gateTriggered ? `${item.meta.gateReason || 'triggered'} (${formatNumber(item.meta.combinedRisk)})` : `pass (${formatNumber(item.meta.combinedRisk)})`}`
        : new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <article class="message ${item.role}">
          <div class="message-header">
            <span class="message-role">${item.role === 'user' ? 'User' : 'Assistant'}</span>
            <span class="message-meta">${escapeHtml(meta)}</span>
          </div>
          <p>${escapeHtml(item.content)}</p>
        </article>
      `;
    })
    .join('');

  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function renderDiagnostics(turnLog = null) {
  if (!turnLog) {
    els.latestDiagnostics.innerHTML = '<p>No turn has been processed yet.</p>';
    return;
  }

  const gate = turnLog.gate || {};
  els.latestDiagnostics.innerHTML = `
    <div class="diagnostic-grid">
      <div class="metric">
        <span class="metric-label">Gate</span>
        <span class="metric-value ${gate.triggered ? 'bad' : 'good'}">${gate.triggered ? 'Triggered' : 'Passed'}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Gate reason</span>
        <span class="metric-value">${escapeHtml(gate.reason || 'none')}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Combined risk</span>
        <span class="metric-value">${formatNumber(gate.combinedRisk)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Threshold</span>
        <span class="metric-value">${formatNumber(gate.threshold)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Uncertainty score</span>
        <span class="metric-value">${formatNumber(gate.uncertainty?.score)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Model self-risk</span>
        <span class="metric-value">${formatNumber(gate.selfRisk)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Rule risk</span>
        <span class="metric-value">${formatNumber(gate.ruleRisk)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Latency (ms)</span>
        <span class="metric-value">${escapeHtml(String(turnLog.logEntry?.latencyMs ?? 'n/a'))}</span>
      </div>
    </div>
    <p class="helper-text" style="margin-top:12px;">
      Micro-skill: ${escapeHtml(turnLog.microSkill || 'n/a')} | Support move: ${escapeHtml(turnLog.supportMove || 'n/a')}
    </p>
    <p class="helper-text">Scope note: ${escapeHtml(turnLog.scopeNote || 'n/a')}</p>
  `;
}

function speak(text) {
  if (!state.voiceEnabled || !('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function stopRecognition() {
  if (state.recognition && state.micActive) {
    state.recognition.stop();
  }
}

function buildRecognition() {
  const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!RecognitionCtor) return null;

  const recognition = new RecognitionCtor();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    state.micActive = true;
    els.micButton.textContent = 'Stop mic';
    setStatus('Listening through browser speech input.');
  };

  recognition.onend = () => {
    state.micActive = false;
    els.micButton.textContent = 'Start mic';
  };

  recognition.onerror = (event) => {
    setStatus(`Speech input error: ${event.error || 'unknown error'}.`);
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || '')
      .join(' ')
      .trim();
    if (transcript) {
      els.messageInput.value = transcript;
      setStatus('Speech input captured. You can edit the text before sending.');
    }
  };

  return recognition;
}

async function loadConfig() {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error('Could not load configuration.');
  const data = await response.json();
  state.config = data;
  state.interventions = data.interventions || [];
  state.selectedInterventionId = state.interventions[0]?.id || 'stress_reset';
  state.threshold = Number(data.defaults?.threshold || 0.62);

  els.appTitle.textContent = data.app?.name || 'KindLine Guide';
  els.appSubtitle.textContent = data.app?.subtitle || els.appSubtitle.textContent;
  els.modelPill.textContent = `Model: ${data.defaults?.model || 'unknown'}`;
  els.sessionPill.textContent = `Session: ${state.sessionId.slice(0, 8)}`;
  els.thresholdRange.value = String(state.threshold);
  els.thresholdValue.textContent = formatNumber(state.threshold);

  els.interventionSelect.innerHTML = state.interventions
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`)
    .join('');

  renderInterventionDetails();

  const recognition = buildRecognition();
  state.recognition = recognition;
  if (!recognition) {
    els.micToggle.checked = false;
    els.micToggle.disabled = true;
    els.micButton.disabled = true;
    setStatus('Ready. Browser speech input is not available here, but typed input works normally.');
  } else {
    setStatus('Ready.');
  }
}

async function sendMessage(userText) {
  const cleanText = String(userText || '').trim();
  if (!cleanText) return;

  const outgoing = {
    role: 'user',
    content: cleanText,
    timestamp: new Date().toISOString()
  };
  state.messages.push(outgoing);
  renderMessages();
  els.messageInput.value = '';
  els.sendButton.disabled = true;
  setStatus('Processing turn.');

  try {
    const payload = {
      sessionId: state.sessionId,
      interventionId: state.selectedInterventionId,
      threshold: state.threshold,
      messages: state.messages.map(({ role, content }) => ({ role, content }))
    };

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Turn failed.');
    }

    state.turnLogs.push(data);
    state.messages.push({
      role: 'assistant',
      content: data.reply,
      timestamp: new Date().toISOString(),
      meta: {
        gateTriggered: data.gate?.triggered,
        gateReason: data.gate?.reason,
        combinedRisk: data.gate?.combinedRisk
      }
    });

    renderMessages();
    renderDiagnostics(data);
    speak(data.reply);

    const gateMessage = data.gate?.triggered
      ? `Turn processed. The gate routed this turn through ${data.gate.reason || 'a fallback'}.`
      : 'Turn processed. The draft passed the gate.';
    setStatus(gateMessage);
  } catch (error) {
    setStatus(`Error: ${error.message || 'unknown failure'}.`);
  } finally {
    els.sendButton.disabled = false;
  }
}

function exportLog() {
  const payload = {
    exportedAt: new Date().toISOString(),
    sessionId: state.sessionId,
    interventionId: state.selectedInterventionId,
    threshold: state.threshold,
    messages: state.messages,
    turns: state.turnLogs
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `kindline-session-${state.sessionId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus('Session log downloaded.');
}

async function runEvaluation() {
  els.evalButton.disabled = true;
  setStatus('Running built-in evaluation. This uses the same backend gate as the live demo.');

  try {
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: state.threshold, sessionId: state.sessionId })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Evaluation failed.');

    els.evaluationResults.innerHTML = `
      <p><strong>Pass rate:</strong> ${Math.round(data.passRate * 100)}% (${data.passed}/${data.total})</p>
      <table class="eval-table">
        <thead>
          <tr>
            <th>Case</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${data.results
            .map(
              (item) => `
              <tr>
                <td>${escapeHtml(item.label)}</td>
                <td>${escapeHtml(item.expected.gateReason || String(item.expected.gateTriggered))}</td>
                <td>${escapeHtml(item.actual.gateReason || String(item.actual.gateTriggered))}</td>
                <td class="${item.pass ? 'eval-pass' : 'eval-fail'}">${item.pass ? 'Pass' : 'Fail'}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;
    setStatus(`Evaluation completed. ${data.passed} of ${data.total} cases passed.`);
  } catch (error) {
    setStatus(`Evaluation error: ${error.message || 'unknown failure'}.`);
  } finally {
    els.evalButton.disabled = false;
  }
}

function clearSession() {
  stopRecognition();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  state.sessionId = crypto.randomUUID();
  state.messages = [];
  state.turnLogs = [];
  els.sessionPill.textContent = `Session: ${state.sessionId.slice(0, 8)}`;
  renderMessages();
  renderDiagnostics(null);
  els.evaluationResults.innerHTML =
    '<p>Run the built-in evaluation to inspect how the gate behaves on a small red-team and benign set.</p>';
  setStatus('Session cleared.');
}

function attachListeners() {
  els.interventionSelect.addEventListener('change', (event) => {
    state.selectedInterventionId = event.target.value;
    renderInterventionDetails();
  });

  els.thresholdRange.addEventListener('input', (event) => {
    state.threshold = Number(event.target.value);
    els.thresholdValue.textContent = formatNumber(state.threshold);
  });

  els.voiceToggle.addEventListener('change', (event) => {
    state.voiceEnabled = event.target.checked;
    if (!state.voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  });

  els.micToggle.addEventListener('change', (event) => {
    state.micEnabled = event.target.checked;
    if (!state.micEnabled) stopRecognition();
  });

  els.composer.addEventListener('submit', async (event) => {
    event.preventDefault();
    await sendMessage(els.messageInput.value);
  });

  els.clearButton.addEventListener('click', clearSession);
  els.exportButton.addEventListener('click', exportLog);
  els.evalButton.addEventListener('click', runEvaluation);

  els.micButton.addEventListener('click', () => {
    if (!state.recognition || !state.micEnabled) {
      setStatus('Turn on browser speech input first. If the browser does not support it, use typed input.');
      return;
    }

    if (state.micActive) {
      stopRecognition();
    } else {
      state.recognition.start();
    }
  });
}

async function main() {
  attachListeners();
  await loadConfig();
  renderMessages();
  renderDiagnostics(null);
}

main().catch((error) => {
  setStatus(`Startup error: ${error.message || 'unknown failure'}.`);
});
