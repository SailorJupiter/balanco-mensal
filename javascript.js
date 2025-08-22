// ==============================
// Balanço Mensal — JS com LocalStorage + PDF
// ==============================

// Seleção de elementos
const form = document.getElementById('form-produto');
const inputProduto = document.getElementById('produto');
const btnExportar = document.getElementById('btn-exportar');

const SETORES = {
  estoque: { inputId: 'qtd-estoque', tableId: 'tabela-estoque', rotulo: 'Estoque Geral' },
  camera: { inputId: 'qtd-camera', tableId: 'tabela-camera', rotulo: 'Câmara Fria' },
  bar: { inputId: 'qtd-bar', tableId: 'tabela-bar', rotulo: 'Bar' },
  adegaSalao: { inputId: 'qtd-adega-salao', tableId: 'tabela-adega-salao', rotulo: 'Adega Salão' },
  adegaBar: { inputId: 'qtd-adega-bar', tableId: 'tabela-adega-bar', rotulo: 'Adega Bar' },
};

let produtoEmEdicao = null;

// -----------------------------
// Funções utilitárias
// -----------------------------
function getInputNumero(id) {
  const val = document.getElementById(id).value.trim();
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
}

function normalizarProduto(nome) { return nome.trim(); }

function obterTBody(idTabela) {
  return document.getElementById(idTabela).querySelector('tbody');
}

function encontrarLinhaPorProduto(tbody, produto) {
  return Array.from(tbody.querySelectorAll('tr'))
    .find(r => r.dataset.produto && r.dataset.produto.toLowerCase() === produto.toLowerCase()) || null;
}

// -----------------------------
// LocalStorage
// -----------------------------
function salvarLocalStorage() {
  const produtos = [];
  for (const [chave, cfg] of Object.entries(SETORES)) {
    const tbody = obterTBody(cfg.tableId);
    tbody.querySelectorAll('tr').forEach(tr => {
      let prod = produtos.find(p => p.produto === tr.dataset.produto);
      if (!prod) prod = { produto: tr.dataset.produto, estoque:0, camera:0, bar:0, adegaSalao:0, adegaBar:0, };
      prod[chave] = Number(tr.querySelector('[data-col="qtd"]').textContent) || 0;
      if (!produtos.includes(prod)) produtos.push(prod);
    });
  }
  localStorage.setItem('balancoMensal', JSON.stringify(produtos));
}

function carregarLocalStorage() {
  const dados = localStorage.getItem('balancoMensal');
  if (!dados) return;
  JSON.parse(dados).forEach(p => {
    for (const [chave, cfg] of Object.entries(SETORES)) {
      criarOuSomarLinha(cfg.tableId, p.produto, p[chave], true);
    }
  });
}

// -----------------------------
// Criação/atualização de linhas
// -----------------------------
function criarOuSomarLinha(tableId, produto, quantidade, modoEdicao = false) {
  if (quantidade <= 0) return;
  const tbody = obterTBody(tableId);
  let tr = encontrarLinhaPorProduto(tbody, produto);

  if (tr && !modoEdicao) {
    const celulaQtd = tr.querySelector('[data-col="qtd"]');
    celulaQtd.textContent = String(Number(celulaQtd.textContent) + quantidade);
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
    btnEditar.className = 'btn btn-warning btn-editar';
    btnEditar.textContent = 'Editar';
    btnEditar.setAttribute('aria-label', `Editar ${produto}`);

    const btnExcluir = document.createElement('button');
    btnExcluir.type = 'button';
    btnExcluir.className = 'btn btn-danger btn-excluir ms-2';
    btnExcluir.textContent = 'Excluir';
    btnExcluir.setAttribute('aria-label', `Excluir ${produto}`);

    tdAcoes.append(btnEditar, btnExcluir);
    tr.append(tdProduto, tdQtd, tdAcoes);
    tbody.appendChild(tr);
  } else {
    tr.querySelector('[data-col="qtd"]').textContent = String(quantidade);
  }
}

// -----------------------------
// Edição
// -----------------------------
function coletarQuantidadesDeProduto(produto) {
  const quantidades = {estoque:0, camera:0, bar:0, adegaSalao:0, adegaBar:0};
  for (const [chave, cfg] of Object.entries(SETORES)) {
    const linha = encontrarLinhaPorProduto(obterTBody(cfg.tableId), produto);
    if (linha) quantidades[chave] = Number(linha.querySelector('[data-col="qtd"]').textContent) || 0;
  }
  return quantidades;
}

function entrarModoEdicao(produto) {
  const quantidades = coletarQuantidadesDeProduto(produto);
  produtoEmEdicao = produto;

  inputProduto.value = produto;
  for (const [chave, cfg] of Object.entries(SETORES)) {
    document.getElementById(cfg.inputId).value = quantidades[chave] || '';
  }

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
// Delegação de eventos nas tabelas
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
        salvarLocalStorage();
      }
      if (alvo.classList.contains('btn-editar')) {
        entrarModoEdicao(produto);
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

  const produto = normalizarProduto(inputProduto.value);
  if (!produto) { inputProduto.focus(); return; }

  const valores = {};
  for (const [chave, cfg] of Object.entries(SETORES)) {
    valores[chave] = getInputNumero(cfg.inputId);
  }

  if (!Object.values(valores).some(v => v > 0)) {
    alert('Informe ao menos uma quantidade maior que zero.');
    return;
  }

  if (produtoEmEdicao) {
    for (const cfg of Object.values(SETORES)) {
      const tbody = obterTBody(cfg.tableId);
      const linha = encontrarLinhaPorProduto(tbody, produtoEmEdicao);
      if (linha) linha.remove();
    }
  }

  for (const cfg of Object.values(SETORES)) {
    const qtd = valores[Object.keys(SETORES).find(k => SETORES[k].tableId === cfg.tableId)];
    criarOuSomarLinha(cfg.tableId, produto, qtd, Boolean(produtoEmEdicao));
  }

  salvarLocalStorage();
  sairModoEdicao();
});

// -----------------------------
// Exportar PDF estilizado
// -----------------------------
btnExportar.addEventListener('click', () => {
  const titulo = "Balanço do mês";
  let conteudo = `<h1 style="text-align:center;">${titulo}</h1>`;

  for (const [chave, cfg] of Object.entries(SETORES)) {
    const tabela = document.getElementById(cfg.tableId);
    const linhas = tabela.querySelectorAll('tbody tr');
    if (linhas.length === 0) continue;

    const tabelaClonada = tabela.cloneNode(true);
    tabelaClonada.querySelectorAll('thead th:last-child, tbody td:last-child').forEach(el => el.remove());

    tabelaClonada.style.width = '100%';
    tabelaClonada.style.borderCollapse = 'collapse';
    tabelaClonada.querySelectorAll('th, td').forEach(cell => {
      cell.style.border = '1px solid #999';
      cell.style.padding = '6px 8px';
      cell.style.fontSize = '12px';
    });
    const thead = tabelaClonada.querySelector('thead');
    if (thead) { thead.style.background = '#8a7fff'; thead.style.color = 'white'; }

    conteudo += `<h2 style="text-align:center;">${cfg.rotulo}</h2>${tabelaClonada.outerHTML}`;
  }

  const jan = window.open('', '_blank');
  jan.document.write(`
    <html>
      <head>
        <meta charset="utf-8">
        <title>${titulo}</title>
      </head>
      <body>
        ${conteudo}
        <script>
          window.onload = function() { window.print(); };
        </script>
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
  carregarLocalStorage();
})();
