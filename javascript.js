// ==============================
// Balanço Mensal — PDF estilizado (setores normais + pesados)
// ==============================

const form = document.getElementById('form-produto');
const inputProduto = document.getElementById('produto');
const btnExportar = document.getElementById('btn-exportar');

const SETORES = {
  estoque: { inputId: 'qtd-estoque', tableId: 'tabela-estoque', rotulo: 'Estoque Geral' },
  camera: { inputId: 'qtd-camera', tableId: 'tabela-camera', rotulo: 'Câmara Fria' },
  bar: { inputId: 'qtd-bar', tableId: 'tabela-bar', rotulo: 'Bar' },
  adegaSalao: { inputId: 'qtd-adega-salao', tableId: 'tabela-adega-salao', rotulo: 'Adega Salão' },
  adegaBar: { inputId: 'qtd-adega-bar', tableId: 'tabela-adega-bar', rotulo: 'Adega Bar' },
  pesados: { inputId: 'qtd-pesados', tableId: 'tabela-pesados', rotulo: 'Produtos Pesados (kg/L)' },
};

// -----------------------------
// Utilitários
// -----------------------------
function getInputNumero(id) {
  const val = document.getElementById(id).value.trim().replace(',', '.');
  const num = parseFloat(val);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : 0;
}

function getInputNumeroDecimal(id) {
  const val = document.getElementById(id).value.trim().replace(',', '.');
  const num = parseFloat(val);
  return Number.isFinite(num) && num > 0 ? parseFloat(num.toFixed(3)) : 0;
}

// -----------------------------
// LocalStorage
// -----------------------------
function salvarDados(dados) {
  localStorage.setItem('balanco', JSON.stringify(dados));
}
function carregarDados() {
  return JSON.parse(localStorage.getItem('balanco') || '[]');
}

// -----------------------------
// Renderizar tabelas HTML
// -----------------------------
function renderizarTabela() {
  for (const cfg of Object.values(SETORES)) {
    document.querySelector(`#${cfg.tableId} tbody`).innerHTML = '';
  }

  const dados = carregarDados();
  for (const item of dados) {
    for (const [setor, qtd] of Object.entries(item.valores)) {
      if (qtd > 0) {
        const cfg = SETORES[setor];
        const tbody = document.querySelector(`#${cfg.tableId} tbody`);
        const tr = document.createElement('tr');

        let valorFormatado;
        if (setor === "pesados") {
          valorFormatado = qtd.toFixed(3); // 3 casas decimais
        } else {
          valorFormatado = Math.round(qtd); // inteiro
        }

        tr.innerHTML = `
          <td>${item.produto}</td>
          <td>${valorFormatado}</td>
          <td>
            <button class="btn-editar" data-produto="${item.produto}" data-setor="${setor}">Editar</button>
            <button class="btn-excluir" data-produto="${item.produto}" data-setor="${setor}">Excluir</button>
          </td>
        `;
        tbody.appendChild(tr);
      }
    }
  }
}

// -----------------------------
// Form submit (AJUSTADO)
// -----------------------------
form.addEventListener('submit', e => {
  e.preventDefault();
  const produto = inputProduto.value.trim();
  if (!produto) return;

  const valores = {};
  for (const [chave, cfg] of Object.entries(SETORES)) {
    if (chave === "pesados") {
      valores[chave] = getInputNumeroDecimal(cfg.inputId);
    } else {
      valores[chave] = getInputNumero(cfg.inputId);
    }
  }

  // ✅ Verifica se pelo menos um valor é maior que zero
  const temQuantidade = Object.values(valores).some(v => v > 0);
  if (!temQuantidade) {
    alert("Informe ao menos uma quantidade maior que zero.");
    return;
  }

  const dados = carregarDados();
  dados.push({ produto, valores });
  salvarDados(dados);

  form.reset();
  renderizarTabela();
});

// -----------------------------
// Editar e excluir
// -----------------------------
document.body.addEventListener('click', e => {
  if (e.target.classList.contains('btn-excluir')) {
    const produto = e.target.dataset.produto;
    const setor = e.target.dataset.setor;
    let dados = carregarDados();
    dados = dados.map(item => {
      if (item.produto === produto) item.valores[setor] = 0;
      return item;
    });
    salvarDados(dados);
    renderizarTabela();
  }

  if (e.target.classList.contains('btn-editar')) {
    const produto = e.target.dataset.produto;
    const setor = e.target.dataset.setor;
    const novoValor = prompt('Digite a nova quantidade:');
    if (novoValor !== null) {
      let dados = carregarDados();
      dados = dados.map(item => {
        if (item.produto === produto) {
          item.valores[setor] = setor === "pesados"
            ? parseFloat(parseFloat(novoValor.replace(',', '.')).toFixed(3))
            : Math.round(parseFloat(novoValor));
        }
        return item;
      });
      salvarDados(dados);
      renderizarTabela();
    }
  }
});

// -----------------------------
// Exportar PDF estilizado
// -----------------------------
function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(70, 30, 130);
  doc.text("Relatório de Estoque", 105, 20, { align: "center" });

  const dados = carregarDados();

  // Setores normais
  const setoresNormais = ["estoque","camera","bar","adegaSalao","adegaBar"];
  const cabecalhoNormais = ["Produto", ...setoresNormais.map(s => SETORES[s].rotulo)];

  const corpoNormais = dados
    .filter(item => setoresNormais.some(s => item.valores[s] > 0))
    .map(item => [
      item.produto,
      ...setoresNormais.map(s => item.valores[s] ? Math.round(item.valores[s]) : "0")
    ]);

  if (corpoNormais.length > 0) {
    doc.autoTable({
      startY: 30,
      head: [cabecalhoNormais],
      body: corpoNormais,
      theme: 'grid',
      headStyles: { fillColor: [165, 143, 255], textColor: 255, halign: 'center' },
      alternateRowStyles: { fillColor: [240, 240, 255] },
      styles: { fontSize: 10, cellPadding: 3, halign: 'center', valign: 'middle' },
      didParseCell: (data) => { data.cell.styles.lineWidth = 0.5; }
    });
  }

  // Produtos pesados
  const corpoPesados = dados
    .filter(item => item.valores.pesados > 0)
    .map(item => [item.produto, item.valores.pesados.toFixed(3)]);

  if (corpoPesados.length > 0) {
    doc.setFontSize(16);
    doc.setTextColor(70, 30, 130);
    const startY = corpoNormais.length > 0 ? doc.lastAutoTable.finalY + 10 : 30;
    doc.text("Produtos Pesados (kg/L)", 105, startY, { align: "center" });

    doc.autoTable({
      startY: startY + 5,
      head: [["Produto", "Peso/Volume"]],
      body: corpoPesados,
      theme: 'grid',
      headStyles: { fillColor: [165, 143, 255], textColor: 255, halign: 'center' },
      alternateRowStyles: { fillColor: [240, 240, 255] },
      styles: { fontSize: 10, cellPadding: 3, halign: 'center', valign: 'middle' },
      didParseCell: (data) => { data.cell.styles.lineWidth = 0.5; }
    });
  }

  doc.save("relatorio-estoque.pdf");
}

btnExportar.addEventListener('click', exportarPDF);

// Inicializar
renderizarTabela();
