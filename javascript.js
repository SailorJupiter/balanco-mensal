// =============================
// Balanço Mensal — Lógica JS
// =============================
// Este arquivo controla:
// 1) Leitura do formulário
// 2) Inserção/edição/exclusão de itens nas tabelas por setor
// 3) Exportação do relatório em PDF (via janela de impressão)

// -----------------------------
// Seleção de elementos e setup
// -----------------------------
const form = document.getElementById('form-produto');
const inputProduto = document.getElementById('produto');
const btnExportar = document.getElementById('btn-exportar');

// Mapeamento dos setores: relaciona inputs do formulário e tabelas
const SETORES = {
  camera: { inputId: 'qtd-camera', tableId: 'tabela-camera', rotulo: 'Câmara Fria' },
  bar: { inputId: 'qtd-bar', tableId: 'tabela-bar', rotulo: 'Bar' },
  adegaSalao: { inputId: 'qtd-adega-salao', tableId: 'tabela-adega-salao', rotulo: 'Adega Salão' },
  adegaBar: { inputId: 'qtd-adega-bar', tableId: 'tabela-adega-bar', rotulo: 'Adega Bar' },
};

// Estado de edição (nulo quando não estamos editando)
let produtoEmEdicao = null; // guarda o nome do produto sendo editado

// -----------------------------
// Funções utilitárias
// -----------------------------
function getInputNumero(id) {
  const el = document.getElementById(id);
  const val = el.value.trim();
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0; // apenas inteiros positivos
}

function normalizarProduto(nome) {
  return nome.trim(); // pode adaptar para padronizar maiúsc/minúsc se quiser
}

function mesAnoExtenso(date) {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${meses[date.getMonth()]} ${date.getFullYear()}`;
}

function obterTBody(idTabela) {
  const tabela = document.getElementById(idTabela);
  return tabela.querySelector('tbody');
}

function encontrarLinhaPorProduto(tbody, produto) {
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const alvo = produto.toLowerCase();
  return rows.find(r => r.dataset.produto && r.dataset.produto.toLowerCase() === alvo) || null;
}

function coletarQuantidadesDeProduto(produto) {
  // Lê as quantidades atuais desse produto em TODAS as tabelas
  const quantidades = { camera: 0, bar: 0, adegaSalao: 0, adegaBar: 0 };
  for (const [chave, cfg] of Object.entries(SETORES)) {
    const tbody = obterTBody(cfg.tableId);
    const linha = encontrarLinhaPorProduto(tbody, produto);
    if (linha) {
      const qtd = Number(linha.querySelector('[data-col="qtd"]').textContent) || 0;
      quantidades[chave] = qtd;
    }
  }
  return quantidades;
}

function removerLinhasDoProduto(produto) {
  // Remove o produto de todas as tabelas (usado ao salvar edição)
  for (const cfg of Object.values(SETORES)) {
    const tbody = obtenerTBodySeguro(cfg.tableId);
    if (!tbody) continue;
    const linha = encontrarLinhaPorProduto(tbody, produto);
    if (linha) linha.remove();
  }
}

function obtenerTBodySeguro(idTabela) {
  const tabela = document.getElementById(idTabela);
  return tabela ? tabela.querySelector('tbody') : null;
}

// -----------------------------
// Criação e atualização de linhas
// -----------------------------
function criarOuSomarLinha(tableId, produto, quantidade, modoEdicao = false) {
  if (quantidade <= 0) return; // não insere zero
  const tbody = obterTBody(tableId);
  let tr = encontrarLinhaPorProduto(tbody, produto);

  if (tr && !modoEdicao) {
    // Se já existe e NÃO estamos editando, somamos a quantidade
    const celulaQtd = tr.querySelector('[data-col="qtd"]');
    const atual = Number(celulaQtd.textContent) || 0;
    celulaQtd.textContent = String(atual + quantidade);
    return;
  }

  if (!tr) {
    tr = document.createElement('tr');
    tr.dataset.produto = produto;

    const tdProduto = document.createElement('td');
    tdProduto.textContent = produto;

    const tdQtd = document.createElement('td');
    tdQtd.dataset.col = 'qtd';
    tdQtd.textContent = String(quantidade);

    const tdAcoes = document.createElement('td');

    const btnEditar = document.createElement('button');
    btnEditar.type = 'button';
    btnEditar.className = 'btn-editar';
    btnEditar.textContent = 'Editar';
    btnEditar.setAttribute('aria-label', `Editar ${produto}`);

    const btnExcluir = document.createElement('button');
    btnExcluir.type = 'button';
    btnExcluir.className = 'btn-excluir';
    btnExcluir.textContent = 'Excluir';
    btnExcluir.style.marginLeft = '8px';
    btnExcluir.setAttribute('aria-label', `Excluir ${produto}`);

    tdAcoes.append(btnEditar, btnExcluir);
    tr.append(tdProduto, tdQtd, tdAcoes);
    tbody.appendChild(tr);
  } else {
    // Se já existe e estamos em edição, substitui a quantidade
    const celulaQtd = tr.querySelector('[data-col="qtd"]');
    celulaQtd.textContent = String(quantidade);
  }
}

// -----------------------------
// Modo de edição
// -----------------------------
function entrarModoEdicao(produto) {
  const quantidades = coletarQuantidadesDeProduto(produto);
  produtoEmEdicao = produto;

  // Preenche o formulário com o produto e suas quantidades atuais
  inputProduto.value = produto;
  document.getElementById('qtd-camera').value = quantidades.camera || '';
  document.getElementById('qtd-bar').value = quantidades.bar || '';
  document.getElementById('qtd-adega-salao').value = quantidades.adegaSalao || '';
  document.getElementById('qtd-adega-bar').value = quantidades.adegaBar || '';

  // Atualiza UI do botão principal e cria botão cancelar
  const btnSubmit = form.querySelector('button[type="submit"]');
  btnSubmit.textContent = 'Salvar';
  btnSubmit.dataset.modo = 'edicao';

  if (!document.getElementById('btn-cancelar-edicao')) {
    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.id = 'btn-cancelar-edicao';
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.style.marginLeft = '8px';
    btnCancelar.addEventListener('click', sairModoEdicao);
    btnSubmit.insertAdjacentElement('afterend', btnCancelar);
  }

  inputProduto.focus();
}

function sairModoEdicao() {
  produtoEmEdicao = null;
  const btnSubmit = form.querySelector('button[type="submit"]');
  btnSubmit.textContent = 'Adicionar';
  delete btnSubmit.dataset.modo;

  const btnCancelar = document.getElementById('btn-cancelar-edicao');
  if (btnCancelar) btnCancelar.remove();

  form.reset();
}

// -----------------------------
// Handlers de clique nas tabelas (delegação)
// -----------------------------
function instalarDelegacaoDeEventos() {
  for (const cfg of Object.values(SETORES)) {
    const tabela = document.getElementById(cfg.tableId);
    tabela.addEventListener('click', (ev) => {
      const alvo = ev.target;
      if (!(alvo instanceof HTMLElement)) return;
      const linha = alvo.closest('tr');
      if (!linha) return;
      const produto = linha.dataset.produto || '';

      if (alvo.classList.contains('btn-excluir')) {
        linha.remove();
      }
      if (alvo.classList.contains('btn-editar')) {
        entrarModoEdicao(produto);
        // rola até o formulário para facilitar
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

// -----------------------------
// Envio do formulário
// -----------------------------
form.addEventListener('submit', (ev) => {
  ev.preventDefault();

  const produtoRaw = inputProduto.value;
  const produto = normalizarProduto(produtoRaw);
  if (!produto) {
    inputProduto.focus();
    return;
  }

  // Lê quantidades do formulário
  const valores = {};
  for (const [chave, cfg] of Object.entries(SETORES)) {
    valores[chave] = getInputNumero(cfg.inputId);
  }

  const algumaQtd = Object.values(valores).some(v => v > 0);
  if (!algumaQtd) {
    alert('Informe ao menos uma quantidade maior que zero.');
    return;
  }

  // Se estamos editando, remove todas as linhas antigas desse produto
  if (produtoEmEdicao) {
    for (const cfg of Object.values(SETORES)) {
      const tbody = obterTBody(cfg.tableId);
      const linha = encontrarLinhaPorProduto(tbody, produtoEmEdicao);
      if (linha) linha.remove();
    }
  }

  // Cria/atualiza linhas conforme as quantidades
  for (const cfg of Object.values(SETORES)) {
    const qtd = valores[Object.keys(SETORES).find(k => SETORES[k].tableId === cfg.tableId)];
    criarOuSomarLinha(cfg.tableId, produto, qtd, Boolean(produtoEmEdicao));
  }

  // Limpa e sai do modo de edição (se ativo)
  sairModoEdicao();
});

// -----------------------------
// Exportar para PDF (via janela de impressão)
// -----------------------------
btnExportar.addEventListener('click', () => {
  const agora = new Date();
  const titulo = `Balanço ${mesAnoExtenso(agora)}`;

  // Monta HTML só com as tabelas preenchidas
  let conteudo = `
    <h1 style="text-align:center; margin: 0 0 8px 0;">${titulo}</h1>
    <p style="text-align:center; margin: 0 0 16px 0; font-size: 12px; color:#444;">
      Emitido em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR')}
    </p>
  `;

  for (const [chave, cfg] of Object.entries(SETORES)) {
    const tabela = document.getElementById(cfg.tableId);
    const linhas = tabela.querySelectorAll('tbody tr');
    if (linhas.length === 0) continue; // pula setor vazio

    // Clona a tabela (apenas thead + tbody atuais)
    const tabelaClonada = tabela.cloneNode(true);
    // remove coluna "Ações" da cópia para o PDF
    tabelaClonada.querySelectorAll('thead th:last-child, tbody td:last-child').forEach(el => el.remove());

    // Ajustes visuais mínimos para impressão
    tabelaClonada.style.width = '100%';
    tabelaClonada.style.borderCollapse = 'collapse';
    tabelaClonada.querySelectorAll('th, td').forEach((cell) => {
      cell.style.border = '1px solid #999';
      cell.style.padding = '6px 8px';
      cell.style.fontSize = '12px';
    });
    const thead = tabelaClonada.querySelector('thead');
    if (thead) {
      thead.style.background = '#eaeaea';
    }

    conteudo += `
      <h2 style="margin: 16px 0 8px 0;">${cfg.rotulo}</h2>
      ${tabelaClonada.outerHTML}
    `;
  }

  const jan = window.open('', '_blank');
  if (!jan) {
    alert('Permita pop-ups para exportar o PDF.');
    return;
  }

  jan.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>${titulo}</title>
      <style>
        @media print {
          @page { size: A4; margin: 16mm; }
          h1, h2 { font-family: Arial, Helvetica, sans-serif; }
          h1 { font-size: 20px; }
          h2 { font-size: 16px; }
        }
        body { font-family: Arial, Helvetica, sans-serif; color: #111; }
      </style>
    </head>
    <body>
      ${conteudo}
      <script>
        window.onload = function(){
          window.print();
          window.onafterprint = function(){ window.close(); };
        };
      <\/script>
    </body>
    </html>
  `);
  jan.document.close();
});

// -----------------------------
// Inicialização
// -----------------------------
(function init() {
  instalarDelegacaoDeEventos();
})();
