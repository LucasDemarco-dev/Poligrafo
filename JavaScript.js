//Tema
const state = {
  theme: 'samaritan',
  activeQuestionnaire: null,
  currentQuestionIndex: 0,
  answersLog: [],
  stressLevel: 0.15, // 0.0 a 1.0
  isTesting: false,
  customQuestionsList: []
};

//Perguntas do polígrafos
const DEFAULT_QUESTIONNAIRES = [
  {
    id: 'preset-01',
    title: 'PROTOCOLO 01 // VIGILÂNCIA E SEGURANÇA NACIONAL',
    questions: [
      { text: "Você está ciente de que esta conversa está sendo monitorada?", category: "NEUTRA", type: "BOOL", stress: 5 },
      { text: "Você estava no local do crime?", category: "CONTROLE", type: "BOOL", stress: 40 },
      { text: "Conhece a Vítima?", category: "CONTROLE", type: "BOOL", stress: 10 },
      { text: "Você e a vítima tinham algum problema na relação?", category: "CRÍTICA", type: "BOOL", stress: 20 },
      { text: "Havia mais alguém com o senhor na sua casa durante esse periodo?", category: "CONTROLE", type: "BOOL", stress: 15 },
      { text: "O veículo [Marca/Modelo/Placa] é de sua propriedade ou uso exclusivo?", category: "CRÍTICA", type: "BOOL", stress: 5 },
      { text: "O senhor possui porte de arma?", category: "CRÍTICA", type: "BOOL", stress: 65 },
      { text: "O senhor combinou de se encontrar com a vítima em um local isolado?", category: "CRÍTICA", type: "BOOL", stress: 70 },
      { text: "Sabe onde a arma do crime foi escondida?", category: "CRÍTICA", type: "BOOL", stress: 65 },
      { text: "Você matou a vítima?", category: "CRÍTICA", type: "BOOL", stress: 90 }
    ]
  },
  {
    id: 'preset-02',
    title: 'PROTOCOLO 02 // VAZAMENTO DE DADOS CORPORATIVOS',
    questions: [
      { text: "Você está ciente de que esta conversa está sendo monitorada?", category: "NEUTRA", type: "BOOL", stress: 5 },
      { text: "Você trabalha nesta empresa há mais de dois anos?", category: "NEUTRA", type: "BOOL", stress: 5 },
      { text: "Você copiou arquivos confidenciais para um drive externo?", category: "CRÍTICA", type: "BOOL", stress: 85 },
      { text: "Você tinha acesso aos dados que foram divulgados?", category: "CONTROLE", type: "BOOL", stress: 45 },
      { text: "Você já acessou documentos que não faziam partes da suas funções?", category: "CRÍTICA", type: "BOOL", stress: 65 },
      { text: "Você instalou ou utilizou programas que não são homologados pela empresa para manipular esses dados?", category: "CONTROLE", type: "BOOL", stress: 50 },
      { text: "Você configurou ou acessou seu e-mail corporativo em um celular ou notebook que não pertence à empresa?", category: "CRÍTICA", type: "BOOL", stress: 85 },
      { text: "Você deixou seu computador corporativo desbloqueado e sem supervisão no período em que o download ocorreu?", category: "CONTROLE", type: "BOOL", stress: 50 },
      { text: "Você consegue provar que não participou dos vazamentos?", category: "CRÍTICA", type: "BOOL", stress: 70 },
      { text: "Alguém de dentro da empresa incentivou, pressionou ou chantageou você para que fizesse o download dessas informações?", category: "CRÍTICA", type: "BOOL", stress: 90 }
    ]
  }
];

//Gráfico das reaações biométricas
class PolygraphCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.xOffset = 0;
    this.pointsECG = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const color = getComputedStyle(document.body).getPropertyValue('--border-color').trim();

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, h); this.ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(w, y); this.ctx.stroke();
    }

   
    this.drawChannel(h * 0.25, color, state.stressLevel, 'BPM / BATIMENTOS');
    this.drawChannel(h * 0.55, '#00ccff', state.stressLevel * 0.7, 'GSR / RESPOSTA GALVÂNICA');
    this.drawChannel(h * 0.82, '#ff9900', state.stressLevel * 0.4, 'RESPIRAÇÃO');

    this.xOffset += 2;
    requestAnimationFrame(() => this.draw());
  }

  drawChannel(yBase, color, noiseLevel, label) {
    const w = this.canvas.width;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.8;
    this.ctx.beginPath();

    for (let x = 0; x < w; x += 2) {
      const t = (x + this.xOffset) * 0.03;
      let noise = (Math.sin(t) + Math.cos(t * 2.5)) * (8 * (1 + noiseLevel * 3));
 

      if (label.includes('BPM') && (x + this.xOffset) % 120 < 6) {
        noise -= 35 * (1 + noiseLevel);
      }

      const y = yBase + noise;
      if (x === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();

  
    this.ctx.fillStyle = '#666';
    this.ctx.font = '10px Share Tech Mono';
    this.ctx.fillText(label, 10, yBase - 25);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const canvasEngine = new PolygraphCanvas('polygraph-canvas');
  canvasEngine.draw();

  loadQuestionnaires();
  setupNavigation();
  setupFormEvents();
  setupEditorEvents();
  setupVitalStatsLoop();
});


function loadQuestionnaires() {
  const select = document.getElementById('select-questionnaire');
  if (!select) return;
  select.innerHTML = '';

  const savedForms = JSON.parse(localStorage.getItem('poi_custom_forms') || '[]');
  const allForms = [...DEFAULT_QUESTIONNAIRES, ...savedForms];

  allForms.forEach(q => {
    const opt = document.createElement('option');
    opt.value = q.id;
    opt.textContent = q.title;
    select.appendChild(opt);
  });
}

//troca de paginas

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

      e.target.classList.add('active');
      document.getElementById(e.target.dataset.tab).classList.add('active');

      if (e.target.dataset.tab === 'tab-history') renderHistory();
    });
  });
}

//calcula o valor dos sinais vitais
function setupVitalStatsLoop() {
  setInterval(() => {
    const baseBpm = 65 + Math.floor(state.stressLevel * 60) + Math.floor(Math.random() * 4);
    const baseGsr = (1.5 + state.stressLevel * 8 + Math.random() * 0.3).toFixed(1);
    const baseResp = 14 + Math.floor(state.stressLevel * 12);

    const elBpm = document.getElementById('val-bpm');
    const elGsr = document.getElementById('val-gsr');
    const elResp = document.getElementById('val-resp');
    const elStress = document.getElementById('val-stress');

    if (elBpm) elBpm.innerHTML = `${baseBpm} <small>BPM</small>`;
    if (elGsr) elGsr.innerHTML = `${baseGsr} <small>µS</small>`;
    if (elResp) elResp.innerHTML = `${baseResp} <small>RPM</small>`;
    if (elStress) elStress.textContent = `${Math.floor(state.stressLevel * 100)}%`;

    const threatBadge = document.getElementById('threat-level');
    if (threatBadge) {
      if (state.stressLevel > 0.65) {
        threatBadge.textContent = 'NÍVEL DE AMEAÇA: CRÍTICO / MENTIRA';
        threatBadge.style.color = '#ff3333';
      } else {
        threatBadge.textContent = 'NÍVEL DE AMEAÇA: NORMAL';
        threatBadge.style.color = 'var(--text-main)';
      }
    }
  }, 800);
}

//inicia o formulário
function setupFormEvents() {
  const btnStart = document.getElementById('btn-start-form');
  const activeForm = document.getElementById('active-question-form');
  if (!btnStart || !activeForm) return;

  btnStart.addEventListener('click', () => {
    const select = document.getElementById('select-questionnaire');
    const savedForms = JSON.parse(localStorage.getItem('poi_custom_forms') || '[]');
    const allForms = [...DEFAULT_QUESTIONNAIRES, ...savedForms];
    
    state.activeQuestionnaire = allForms.find(q => q.id === select.value);
    state.currentQuestionIndex = 0;
    state.answersLog = [];
    state.isTesting = true;

    document.getElementById('select-questionnaire-container').classList.add('hidden');
    document.getElementById('form-active-area').classList.remove('hidden');

    renderCurrentQuestion();
  });

  activeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    recordAnswerAndNext();
  });
}

//muda as perguntas do questionario e aumenta a barra de conclusão
function renderCurrentQuestion() {
  const q = state.activeQuestionnaire.questions[state.currentQuestionIndex];
  const total = state.activeQuestionnaire.questions.length;

  document.getElementById('form-progress-text').textContent = `PASSO ${state.currentQuestionIndex + 1} / ${total}`;
  document.getElementById('form-progress-fill').style.width = `${((state.currentQuestionIndex + 1) / total) * 100}%`;

  document.getElementById('q-category').textContent = `CATEGORIA: ${q.category}`;
  document.getElementById('q-text').textContent = q.text;

  state.stressLevel = (q.stress / 100);

  const inputContainer = document.getElementById('q-input-container');
  inputContainer.innerHTML = '';

  if (q.type === 'BOOL') {
    inputContainer.innerHTML = `
      <div class="bool-buttons">
        <button type="button" class="btn-bool selected" data-val="SIM">SIM</button>
        <button type="button" class="btn-bool" data-val="NÃO">NÃO</button>
      </div>
      <input type="hidden" id="user-response-val" value="SIM">
    `;
    
    document.querySelectorAll('.btn-bool').forEach(b => {
      b.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-bool').forEach(x => x.classList.remove('selected'));
        e.target.classList.add('selected');
        document.getElementById('user-response-val').value = e.target.dataset.val;
      });
    });
  } else if (q.type === 'TEXT') {
    inputContainer.innerHTML = `
      <input type="text" id="user-response-val" placeholder="Digite sua resposta aqui..." required autocomplete="off">
    `;
  } else if (q.type === 'SCALE') {
    inputContainer.innerHTML = `
      <label>SELECIONE O NÍVEL (1 A 10):</label>
      <input type="number" id="user-response-val" min="1" max="10" value="5" required>
    `;
  }
}

//salva as respostas do questionario
function recordAnswerAndNext() {
  const valInput = document.getElementById('user-response-val');
  const answerValue = valInput ? valInput.value : 'N/A';
  const q = state.activeQuestionnaire.questions[state.currentQuestionIndex];

  state.answersLog.push({
    question: q.text,
    category: q.category,
    userAnswer: answerValue,
    stressRecorded: state.stressLevel
  });

  state.currentQuestionIndex++;

  if (state.currentQuestionIndex < state.activeQuestionnaire.questions.length) {
    renderCurrentQuestion();
  } else {
    finishFormTest();
  }
}

//contabiliza as respostas sim 
function finishFormTest() {
  document.getElementById('form-active-area').classList.add('hidden');
  document.getElementById('select-questionnaire-container').classList.remove('hidden');


  let pontuacaoTotal = 0;
  state.answersLog.forEach(item => {
    if (String(item.userAnswer).toUpperCase() === "SIM") {
      pontuacaoTotal += 1;
    }
  });

  let veredito = "";
  let corVeredito = "";

  if (pontuacaoTotal < 5) {
    veredito = "INOCENTE";
    corVeredito = "#00ff00"; 
  } else if (pontuacaoTotal === 5) {
    veredito = "SUSPEITO";
    corVeredito = "#ffcc00"; 
  } else if (pontuacaoTotal >= 6 && pontuacaoTotal <= 8) {
    veredito = "CÚMPLICE";
    corVeredito = "#ff9900"; 
  } else {
    veredito = "CULPADO";
    corVeredito = "#ff3333"; 
  }


  const modal = document.getElementById('modal-report');
  const content = document.getElementById('report-content');

  let reportHtml = `
    <h3>RELATÓRIO DE AVALIAÇÃO DO SAMARITANO</h3>
    <p><strong>TOTAL DE RESPOSTAS 'SIM':</strong> ${pontuacaoTotal}</p>
    <p><strong>VEREDITO DO SISTEMA:</strong> <span style="color:${corVeredito}; font-weight:bold;">${veredito}</span></p>
    <hr style="margin: 10px 0; border-color: var(--text-dim);">
    <h4>DETALHAMENTO DO INTERROGATÓRIO:</h4>
    <ul style="list-style: none; padding: 0;">
  `;

  state.answersLog.forEach((item, idx) => {
    reportHtml += `
      <li style="margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 4px;">
        <strong>${idx + 1}. ${item.question}</strong><br>
        Resposta: <em>"${item.userAnswer}"</em>
      </li>
    `;
  });

  reportHtml += `</ul>`;
  content.innerHTML = reportHtml;
  modal.classList.remove('hidden');

  document.getElementById('btn-save-report').onclick = () => {
    const history = JSON.parse(localStorage.getItem('poi_polygraph_reports') || '[]');
    history.push({
      date: new Date().toLocaleString('pt-BR'),
      title: state.activeQuestionnaire.title,
      pontuacaoTotal: pontuacaoTotal,
      veredito: veredito,
      details: state.answersLog
    });
    localStorage.setItem('poi_polygraph_reports', JSON.stringify(history));
    modal.classList.add('hidden');
    alert('Laudo salvo com sucesso no LocalStorage!');
  };

  document.getElementById('btn-close-modal').onclick = () => modal.classList.add('hidden');
  document.getElementById('btn-print-report').onclick = () => window.print();
}

// criação de questionarios personalizados
function setupEditorEvents() {
  const btnAddQ = document.getElementById('btn-add-q-to-list');
  const formCreate = document.getElementById('create-form-schema');
  if (!btnAddQ || !formCreate) return;

  btnAddQ.addEventListener('click', () => {
    const text = document.getElementById('new-q-text').value;
    const category = document.getElementById('new-q-cat').value;
    const type = document.getElementById('new-q-type').value;
    const stress = parseInt(document.getElementById('new-q-stress').value);

    if (!text) {
      alert('Por favor, digite o texto da pergunta.');
      return;
    }

    state.customQuestionsList.push({ text, category, type, stress });
    renderQuestionsPreview();

    document.getElementById('new-q-text').value = '';
  });

  formCreate.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('new-form-title').value;

    if (state.customQuestionsList.length === 0) {
      alert('Adicione pelo menos uma pergunta ao formulário!');
      return;
    }

    const newForm = {
      id: 'custom-' + Date.now(),
      title: `[CUSTOM] ${title.toUpperCase()}`,
      questions: [...state.customQuestionsList]
    };

    const savedForms = JSON.parse(localStorage.getItem('poi_custom_forms') || '[]');
    savedForms.push(newForm);
    localStorage.setItem('poi_custom_forms', JSON.stringify(savedForms));

    alert('Formulário salvo no sistema!');
    state.customQuestionsList = [];
    renderQuestionsPreview();
    formCreate.reset();
    loadQuestionnaires();
  });
}
//mostra as peguntas personalizadas atualizadas em tempo real
function renderQuestionsPreview() {
  const ul = document.getElementById('preview-q-list');
  if (!ul) return;
  ul.innerHTML = '';
  state.customQuestionsList.forEach((q, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. [${q.category}] ${q.text} (${q.stress}% Estresse)`;
    ul.appendChild(li);
  });
}

//mostra laudos se hover algum
function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;
  const history = JSON.parse(localStorage.getItem('poi_polygraph_reports') || '[]');

  if (history.length === 0) {
    container.innerHTML = '<p>Nenhum laudo registrado no histórico do LocalStorage.</p>';
    return;
  }

  container.innerHTML = '';
  history.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <h4>${item.title}</h4>
      <p><small>DATA: ${item.date}</small></p>
      <p>TOTAL DE SIM: <strong>${item.pontuacaoTotal}</strong></p>
      <p>VEREDITO: <strong style="color:var(--border-color);">${item.veredito}</strong></p>
    `;
    container.appendChild(card);
  });
}
