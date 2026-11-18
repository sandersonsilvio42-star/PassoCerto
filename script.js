let GEMINI_API_KEY = localStorage.getItem('passocerto_gemini_key') || '';
let uploadedImageBase64 = null;
let uploadedImageMime = 'image/jpeg';
let cameraStream = null;

// Atualiza indicador visual da chave API
function updateApiStatus() {
  const dot = document.getElementById('apiDot');
  const text = document.getElementById('apiStatusText');
  if (GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 10) {
    dot.classList.add('active');
    text.textContent = 'IA Ativa';
  } else {
    dot.classList.remove('active');
    text.textContent = 'Chave IA';
  }
}

function openApiModal() {
  document.getElementById('apiKeyInput').value = GEMINI_API_KEY;
  document.getElementById('apiModal').style.display = 'flex';
}

function closeApiModal() {
  document.getElementById('apiModal').style.display = 'none';
}

function saveApiKey() {
  const val = document.getElementById('apiKeyInput').value.trim();
  if (!val) {
    alert('Por favor, cole uma chave válida.');
    return;
  }
  GEMINI_API_KEY = val;
  localStorage.setItem('passocerto_gemini_key', val);
  updateApiStatus();
  closeApiModal();
  alert('Chave salva com sucesso! Agora você já pode buscar ou escanear tênis.');
}

// Abre e fecha o menu lateral de 3 risquinhos (Filtros)
function toggleFilterDrawer() {
  const drawer = document.getElementById('filterDrawer');
  const backdrop = document.getElementById('filterDrawerBackdrop');
  const isOpen = drawer.classList.contains('open');

  if (isOpen) {
    drawer.classList.remove('open');
    backdrop.style.display = 'none';
  } else {
    drawer.classList.add('open');
    backdrop.style.display = 'block';
  }
}

// Troca entre as 3 abas principais
function switchTab(tabName) {
  document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`nav-${tabName}`).classList.add('active');

  if (tabName !== 'camera') {
    stopCamera();
  }

  if (tabName === 'quiz' && !document.getElementById('quizContainer').innerHTML.trim()) {
    resetQuiz();
  }
}

function setLoading(isLoading, message = 'Analisando biomecânica e preços...') {
  const loader = document.getElementById('globalLoader');
  document.getElementById('loaderText').textContent = message;
  loader.style.display = isLoading ? 'block' : 'none';
}

function quickSearch(modelName) {
  document.getElementById('searchInput').value = modelName;
  searchShoeByName();
}
// ==========================================
// CÂMERA AO VIVO (PEDE PERMISSÃO E ABRE)
// ==========================================
async function startCamera() {
  const video = document.getElementById('cameraVideo');
  const preview = document.getElementById('photoPreview');
  const placeholder = document.getElementById('cameraPlaceholder');

  document.getElementById('photoFallbackBox').style.display = 'none';
  preview.style.display = 'none';

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Seu navegador não suporta câmera ao vivo aqui. Use a opção "escolher foto da galeria" logo abaixo.');
      return;
    }

    stopCamera();
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });

    video.srcObject = cameraStream;
    video.style.display = 'block';
    placeholder.style.display = 'none';

    document.getElementById('startCameraBtn').style.display = 'none';
    document.getElementById('capturePhotoBtn').style.display = 'block';
    document.getElementById('analyzePhotoBtn').style.display = 'none';
    document.getElementById('retakePhotoBtn').style.display = 'none';
  } catch (err) {
    console.error(err);
    alert('Não foi possível acessar a câmera (permissão negada ou sem câmera disponível). Você ainda pode enviar uma foto pela galeria!');
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const video = document.getElementById('cameraVideo');
  if (video) video.style.display = 'none';
}

function capturePhotoFromCamera() {
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');
  const preview = document.getElementById('photoPreview');

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  uploadedImageMime = 'image/jpeg';
  uploadedImageBase64 = dataUrl.split(',').at(1);

  stopCamera();
  preview.src = dataUrl;
  preview.style.display = 'block';

  document.getElementById('capturePhotoBtn').style.display = 'none';
  document.getElementById('analyzePhotoBtn').style.display = 'block';
  document.getElementById('retakePhotoBtn').style.display = 'block';
}

function handleGalleryUpload(event) {
  const file = event.target.files.item(0);
  if (!file) return;

  stopCamera();
  uploadedImageMime = file.type || 'image/jpeg';
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('photoPreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('cameraPlaceholder').style.display = 'none';

    document.getElementById('startCameraBtn').style.display = 'none';
    document.getElementById('capturePhotoBtn').style.display = 'none';
    document.getElementById('analyzePhotoBtn').style.display = 'block';
    document.getElementById('retakePhotoBtn').style.display = 'block';
    document.getElementById('photoFallbackBox').style.display = 'none';

    uploadedImageBase64 = e.target.result.split(',').at(1);
  };
  reader.readAsDataURL(file);
}

function analyzeShoePhoto() {
  if (!uploadedImageBase64) return;
  fetchShoeAnalysis('Identifique com máxima precisão o modelo exato deste tênis na imagem.', true);
}
// ==========================================
// QUIZ "O QUE ME INDICA?" & FILTROS
// ==========================================
const quizSteps = [
  {
    key: 'uso',
    question: 'Qual será o uso principal do tênis?',
    options: ['Corrida de rua ou esteira', 'Caminhada longa e uso diário', 'Academia e musculação', 'Futebol (Campo ou Society)', 'Uso casual / estilo']
  },
  {
    key: 'joelho',
    question: 'Como você avalia o conforto e impacto nos joelhos?',
    options: ['Tenho dor ou sensibilidade (preciso de máximo amortecimento)', 'Quero prevenção e maciez equilibrada', 'Prefiro solado mais firme e estável']
  },
  {
    key: 'marca',
    question: 'Tem preferência por alguma marca?',
    options: ['Tanto faz, quero o melhor custo-benefício', 'Nike ou Adidas', 'Asics ou Mizuno', 'Olympikus ou New Balance']
  },
  {
    key: 'cor',
    question: 'Qual estilo de cor você prefere?',
    options: ['Preto ou cores escuras discretas', 'Branco ou tons claros', 'Colorido / chamativo esportivo']
  }
];

let currentQuizStep = 0;
let quizAnswers = {};

function resetQuiz() {
  currentQuizStep = 0;
  quizAnswers = {};
  renderQuizStep();
}

function renderQuizStep() {
  const container = document.getElementById('quizContainer');
  if (currentQuizStep >= quizSteps.length) {
    const promptQuery = `Recomende o melhor modelo exato de tênis disponível no Brasil para: Uso=${quizAnswers.uso}, Saúde/Joelho=${quizAnswers.joelho}, Marca=${quizAnswers.marca}, Cor=${quizAnswers.cor}.`;
    switchTab('home');
    fetchShoeAnalysis(promptQuery, false);
    return;
  }

  const step = quizSteps.at(currentQuizStep);
  container.innerHTML = `
    <div class="quiz-step-label">Pergunta ${currentQuizStep + 1} de ${quizSteps.length}</div>
    <div class="quiz-question">${step.question}</div>
    <div class="quiz-options">
      ${step.options.map(opt => `
        <button class="quiz-opt-btn" onclick="selectQuizOption('${step.key}', '${opt}')">${opt}</button>
      `).join('')}
    </div>
  `;
}

function selectQuizOption(key, value) {
  quizAnswers[key] = value;
  currentQuizStep++;
  renderQuizStep();
}

// Busca pelo menu de 3 risquinhos (Filtros)
function searchByFilters() {
  const gender = document.getElementById('filterGender').value;
  const brand = document.getElementById('filterBrand').value;
  const size = document.getElementById('filterSize').value;
  const cat = document.getElementById('filterCategory').value;

  toggleFilterDrawer();
  const query = `Indique o melhor modelo exato de tênis ${gender}, marca ${brand}, tamanho BR ${size}, focado em ${cat}.`;
  switchTab('home');
  fetchShoeAnalysis(query, false);
}

function searchShoeByName() {
  const input = document.getElementById('searchInput').value.trim();
  if (!input) {
    alert('Digite o nome de um tênis para pesquisar.');
    return;
  }
  fetchShoeAnalysis(`Analise o tênis: ${input}`, false);
}
// ==========================================
// CHAMADA DA API DO GEMINI (CORRIGIDA)
// ==========================================
async function fetchShoeAnalysis(userPrompt, isImageMode) {
  if (!GEMINI_API_KEY) {
    alert('Configure primeiro a sua chave gratuita do Google AI Studio no botão superior direito!');
    openApiModal();
    return;
  }

  setLoading(true, isImageMode ? 'Identificando modelo pela foto...' : 'Gerando ficha de saúde e preços...');

  const systemInstruction = `Você é um especialista sênior em biomecânica de calçados, ortopedia esportiva e mercado brasileiro de tênis.
Responda ESTRITAMENTE em formato JSON válido, sem markdown e sem texto fora do JSON.
Se for uma imagem e você NÃO conseguir identificar um tênis ou calçado com segurança, retorne apenas:
{"encontrado": false}

Se identificar o tênis (ou recomendar um modelo exato), retorne neste formato exato:
{
  "encontrado": true,
  "marca": "Nome da marca",
  "modelo": "Nome exato do modelo",
  "categoria": "Ex: Corrida / Caminhada / Casual / Chuteira",
  "material": "Resumo dos materiais do cabedal e entressola",
  "pisada": "Neutra / Pronada / Supinada / Todas",
  "amortecimento": "Macio / Equilibrado / Firme",
  "status_joelho": "good ou warn ou bad",
  "selo_joelho": "Ex: Excelente para os joelhos / Impacto moderado / Firme (mais impacto)",
  "analise_saude": "Explicação clara de 2 a 3 frases sobre absorção de impacto, conforto articular, coluna e indicação de uso.",
  "pros": ["Ponto positivo 1", "Ponto positivo 2", "Ponto positivo 3"],
  "contras": ["Ponto negativo 1", "Ponto negativo 2"],
  "preco_menor": "R$ 000",
  "preco_medio": "R$ 000",
  "preco_maior": "R$ 000"
}`;

  const partsList = Array.of({ text: `${systemInstruction}\n\nPedido do usuário: ${userPrompt}` });
  if (isImageMode && uploadedImageBase64) {
    partsList.push({
      inline_data: {
        mime_type: uploadedImageMime || 'image/jpeg',
        data: uploadedImageBase64
      }
    });
  }

  const requestBody = {
    contents: Array.of({ parts: partsList }),
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  };

  const cleanKey = GEMINI_API_KEY.replace(/\s+/g, '');

  try {
    const response = await fetch(
      'https://googleapis.com',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey
        },
        body: JSON.stringify(requestBody)
      }
    );

    const data = await response.json();
    setLoading(false);

    if (!response.ok || data.error) {
      const msg = data.error ? data.error.message : `Erro HTTP ${response.status}`;
      alert(`Erro na API Gemini: ${msg}`);
      return;
    }

    const firstCandidate = data.candidates && data.candidates.at(0);
    const firstPart = firstCandidate && firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.at(0);
    const rawText = firstPart ? firstPart.text : null;

    if (!rawText) {
      alert('A IA não retornou dados válidos. Tente novamente.');
      return;
    }

    const parsed = JSON.parse(rawText);

    // Plano B: Não reconheceu o tênis na foto -> cai no Quiz de Indicação
    if (!parsed.encontrado) {
      const fallback = document.getElementById('photoFallbackBox');
      fallback.style.display = 'block';
      fallback.innerHTML = `
        <div class="result-card" style="border-color: #FCD34D; background: #FFFBEB;">
          <h3 style="font-size: 15px; color: #92400E; margin-bottom: 6px;">Não foi possível encontrar esse modelo em específico</h3>
          <p style="font-size: 12px; color: #78350F; line-height: 1.5; margin-bottom: 12px;">
            A imagem pode estar distante ou sem detalhes suficientes. Vamos encontrar o modelo ideal respondendo o que você procura hoje!
          </p>
          <button class="primary-full-btn" style="background: #B45309;" onclick="switchTab('quiz'); resetQuiz();">
            Iniciar Indicação Guiada →
          </button>
        </div>
      `;
      return;
    }

    switchTab('home');
    renderShoeResult(parsed);

  } catch (err) {
    setLoading(false);
    alert(`Falha na leitura da resposta: ${err.message}`);
    console.error(err);
  }
}

// ==========================================
// RENDERIZA A FICHA TÉCNICA E OS 3 MENORES PREÇOS
// ==========================================
function renderShoeResult(shoe) {
  const container = document.getElementById('resultContainer');
  const badgeClass = shoe.status_joelho === 'good' ? 'badge-good' : (shoe.status_joelho === 'bad' ? 'badge-bad' : 'badge-warn');
  const queryEncoded = encodeURIComponent(`${shoe.marca} ${shoe.modelo}`);

  container.innerHTML = `
    <div class="result-card">
      <div class="shoe-header">
        <span class="shoe-brand-tag">${shoe.marca} • ${shoe.categoria}</span>
        <h2>${shoe.modelo}</h2>
        <div class="shoe-subtitle"><strong>Material:</strong> ${shoe.material}</div>
      </div>

      <div class="health-box">
        <div class="health-header">
          <span>🩺 Saúde & Biomecânica</span>
          <span class="health-badge ${badgeClass}">${shoe.selo_joelho}</span>
        </div>

        <div class="metrics-grid">
          <div class="metric-item">
            <small>Tipo de Pisada</small>
            <strong>${shoe.pisada}</strong>
          </div>
          <div class="metric-item">
            <small>Amortecimento</small>
            <strong>${shoe.amortecimento}</strong>
          </div>
        </div>

        <div class="health-verdict">${shoe.analise_saude}</div>
      </div>

      <div class="pros-cons">
        <div class="pc-box pc-pros">
          <h4>✅ Pontos Positivos (Prós)</h4>
          <ul>${shoe.pros.map(item => `<li>${item}</li>`).join('')}</ul>
        </div>
        <div class="pc-box pc-cons">
          <h4>⚠️ Pontos de Atenção (Contras)</h4>
          <ul>${shoe.contras.map(item => `<li>${item}</li>`).join('')}</ul>
        </div>
      </div>

      <div class="section-title" style="margin-top: 14px;">
        <span>📊 Histórico & Média de Preços</span>
      </div>
      <div class="price-history">
        <div class="ph-card best">
          <small>Menor Histórico</small>
          <strong>${shoe.preco_menor}</strong>
        </div>
        <div class="ph-card">
          <small>Preço Médio</small>
          <strong>${shoe.preco_medio}</strong>
        </div>
        <div class="ph-card">
          <small>Maior Valor</small>
          <strong>${shoe.preco_maior}</strong>
        </div>
      </div>

      <div class="section-title" style="margin-top: 14px;">
        <span>🏷️ Buscar os 3 Menores Preços</span>
      </div>
      <div class="store-list">
        <a class="store-item" href="https://google.com{queryEncoded}" target="_blank" rel="noopener">
          <div>
            <div class="store-name">1. Comparador Google Shopping</div>
            <div class="store-tag">Ordenar pelo menor preço agora</div>
          </div>
          <span class="store-cta">Ver oferta →</span>
        </a>
        <a class="store-item" href="https://amazon.com.br{queryEncoded}&s=price-asc-rank" target="_blank" rel="noopener">
          <div>
            <div class="store-name">2. Amazon Brasil</div>
            <div class="store-tag">Filtrado do menor para o maior valor</div>
          </div>
          <span class="store-cta">Ver oferta →</span>
        </a>
        <a class="store-item" href="https://netshoes.com.br{queryEncoded}&sort=lowest-price" target="_blank" rel="noopener">
          <div>
            <div class="store-name">3. Netshoes / Lojas Esportivas</div>
            <div class="store-tag">Menor preço disponível no estoque</div>
          </div>
          <span class="store-cta">Ver oferta →</span>
        </a>
      </div>
    </div>
  `;
}

// Inicializa status da chave ao abrir o app
updateApiStatus();
