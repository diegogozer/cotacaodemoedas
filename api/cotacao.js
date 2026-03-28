const API_BASE = "/api/cotacao";

const MOEDAS = [
  "AUD","CAD","CHF","DKK","EUR","GBP","JPY","NOK","NZD","SEK","USD",
  "ARS","BOB","CLP","COP","MXN","PEN","PYG","UYU","VEF",
  "CNY","HKD","INR","KRW","SGD","THB","TWD","ZAR"
];

const selMoeda = document.getElementById("selMoeda");
const dtIni = document.getElementById("dtIni");
const dtFim = document.getElementById("dtFim");
const selBoletim = document.getElementById("selBoletim");

const btn = document.getElementById("btn");
const btnResetZoom = document.getElementById("btnResetZoom");
const btnCsv = document.getElementById("btnCsv");
const btnXlsx = document.getElementById("btnXlsx");

const filterEl = document.getElementById("filter");

const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");

const kpiCompra = document.getElementById("kpiCompra");
const kpiVenda = document.getElementById("kpiVenda");
const kpiData = document.getElementById("kpiData");
const kpiMoeda = document.getElementById("kpiMoeda");
const kpiTipo = document.getElementById("kpiTipo");
const kpiDelta = document.getElementById("kpiDelta");
const kpiDeltaPct = document.getElementById("kpiDeltaPct");
const kpiPrev = document.getElementById("kpiPrev");

const selectedPointMain = document.getElementById("selectedPointMain");
const selectedPointDate = document.getElementById("selectedPointDate");
const selectedPointCompra = document.getElementById("selectedPointCompra");
const selectedPointVenda = document.getElementById("selectedPointVenda");
const selectedPointTipo = document.getElementById("selectedPointTipo");

const tbody = document.querySelector("#tbl tbody");
const chartCanvas = document.getElementById("chart");

let rawRows = [];
let viewRows = [];
let chart = null;
let sortKey = "dataHoraCotacao";
let sortDir = "desc";

function fmtNumber(value, decimals = 6) {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function fmtPercent(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

function fmtDateTime(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("pt-BR");
}

function ymdToApiDate(value) {
  const [year, month, day] = value.split("-");
  return `${month}-${day}-${year}`;
}

function buildUrl() {
  const moeda = selMoeda.value;
  const dataInicial = ymdToApiDate(dtIni.value);
  const dataFinal = ymdToApiDate(dtFim.value);

  return `${API_BASE}?moeda=${encodeURIComponent(moeda)}&dataInicial=${encodeURIComponent(dataInicial)}&dataFinal=${encodeURIComponent(dataFinal)}`;
}

function normalizeRows(json) {
  const arr = Array.isArray(json?.value) ? json.value : [];
  return arr
    .map((row) => ({
      paridadeCompra: row.paridadeCompra,
      paridadeVenda: row.paridadeVenda,
      cotacaoCompra: row.cotacaoCompra,
      cotacaoVenda: row.cotacaoVenda,
      dataHoraCotacao: row.dataHoraCotacao,
      tipoBoletim: row.tipoBoletim || ""
    }))
    .sort((a, b) => new Date(b.dataHoraCotacao) - new Date(a.dataHoraCotacao));
}

function boletimMatchesFilter(row, selectedFilter) {
  const tipo = (row.tipoBoletim || "").trim().toLowerCase();

  switch (selectedFilter) {
    case "TODOS":
      return true;
    case "FECHAMENTO":
      return tipo === "fechamento";
    case "FECHAMENTO_INTERBANCARIO":
      return tipo === "fechamento interbancário" || tipo === "fechamento interbancario";
    case "ABERTURA":
      return tipo === "abertura";
    case "INTERMEDIARIO":
      return tipo === "intermediário" || tipo === "intermediario";
    default:
      return true;
  }
}

function updateSelectedPoint(row) {
  if (!row) {
    selectedPointMain.textContent = "—";
    selectedPointDate.textContent = "Data/Hora: —";
    selectedPointCompra.textContent = "Compra: —";
    selectedPointVenda.textContent = "Venda: —";
    selectedPointTipo.textContent = "Boletim: —";
    return;
  }

  selectedPointMain.textContent = `${selMoeda.value} • Venda ${fmtNumber(row.cotacaoVenda)}`;
  selectedPointDate.textContent = `Data/Hora: ${fmtDateTime(row.dataHoraCotacao)}`;
  selectedPointCompra.textContent = `Compra: ${fmtNumber(row.cotacaoCompra)}`;
  selectedPointVenda.textContent = `Venda: ${fmtNumber(row.cotacaoVenda)}`;
  selectedPointTipo.textContent = `Boletim: ${row.tipoBoletim || "—"}`;
}

function resetKpis() {
  kpiCompra.textContent = "—";
  kpiVenda.textContent = "—";
  kpiData.textContent = "Data: —";
  kpiMoeda.textContent = "Moeda: —";
  kpiTipo.textContent = "Boletim: —";
  kpiDelta.textContent = "—";
  kpiDeltaPct.textContent = "—";
  kpiPrev.textContent = "Anterior: —";
  kpiDeltaPct.classList.remove("good", "bad");
}

function renderKPIs(rows) {
  resetKpis();

  if (!rows.length) return;

  const last = rows[0];
  const prev = rows[1];

  kpiCompra.textContent = fmtNumber(last.cotacaoCompra);
  kpiVenda.textContent = fmtNumber(last.cotacaoVenda);
  kpiData.textContent = `Data: ${fmtDateTime(last.dataHoraCotacao)}`;
  kpiMoeda.textContent = `Moeda: ${selMoeda.value}`;
  kpiTipo.textContent = `Boletim: ${last.tipoBoletim || "—"}`;

  if (prev && Number.isFinite(Number(last.cotacaoVenda)) && Number.isFinite(Number(prev.cotacaoVenda))) {
    const delta = Number(last.cotacaoVenda) - Number(prev.cotacaoVenda);
    const pct = Number(prev.cotacaoVenda) !== 0 ? (delta / Number(prev.cotacaoVenda)) * 100 : NaN;

    kpiDelta.textContent = fmtNumber(delta);
    kpiDeltaPct.textContent = fmtPercent(pct);
    kpiPrev.textContent = `Anterior: ${fmtDateTime(prev.dataHoraCotacao)} • ${fmtNumber(prev.cotacaoVenda)}`;

    kpiDeltaPct.classList.remove("good", "bad");
    if (delta > 0) kpiDeltaPct.classList.add("good");
    if (delta < 0) kpiDeltaPct.classList.add("bad");
  }
}

function renderTable(rows) {
  tbody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fmtDateTime(row.dataHoraCotacao)}</td>
      <td class="right">${fmtNumber(row.cotacaoCompra)}</td>
      <td class="right">${fmtNumber(row.cotacaoVenda)}</td>
      <td class="right">${fmtNumber(row.paridadeCompra, 8)}</td>
      <td class="right">${fmtNumber(row.paridadeVenda, 8)}</td>
      <td>${row.tipoBoletim || ""}</td>
    `;
    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);
  countEl.textContent = `${rows.length} linhas`;
}

function destroyChartIfExists() {
  if (chart) {
    chart.destroy();
    chart = null;
  }
}

function renderChart(rows) {
  destroyChartIfExists();

  if (!rows.length) {
    btnResetZoom.disabled = true;
    return;
  }

  const asc = [...rows].sort((a, b) => new Date(a.dataHoraCotacao) - new Date(b.dataHoraCotacao));

  const labels = asc.map((row) => fmtDateTime(row.dataHoraCotacao));
  const vendaSeries = asc.map((row) => row.cotacaoVenda);
  const compraSeries = asc.map((row) => row.cotacaoCompra);

  chart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Cotação Venda",
          data: vendaSeries,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointHitRadius: 14,
          tension: 0.15
        },
        {
          label: "Cotação Compra",
          data: compraSeries,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointHitRadius: 14,
          tension: 0.15,
          hidden: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      normalized: true,
      animation: false,
      interaction: {
        mode: "nearest",
        intersect: false
      },
      elements: {
        line: {
          borderJoinStyle: "round"
        }
      },
      plugins: {
        legend: {
          display: true,
          position: "top"
        },
        tooltip: {
          enabled: true,
          mode: "nearest",
          intersect: false,
          callbacks: {
            title(items) {
              if (!items.length) return "";
              const index = items[0].dataIndex;
              return labels[index];
            },
            label(context) {
              const index = context.dataIndex;
              const row = asc[index];
              return `${context.dataset.label}: ${fmtNumber(context.raw)} | ${row.tipoBoletim || ""}`;
            },
            afterBody(items) {
              if (!items.length) return "";
              const index = items[0].dataIndex;
              const row = asc[index];
              return [
                `Compra: ${fmtNumber(row.cotacaoCompra)}`,
                `Venda: ${fmtNumber(row.cotacaoVenda)}`,
                `Paridade Compra: ${fmtNumber(row.paridadeCompra, 8)}`,
                `Paridade Venda: ${fmtNumber(row.paridadeVenda, 8)}`,
                `Boletim: ${row.tipoBoletim || ""}`
              ];
            }
          }
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "x"
          },
          zoom: {
            wheel: {
              enabled: true
            },
            pinch: {
              enabled: true
            },
            drag: {
              enabled: true
            },
            mode: "x"
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 10
          }
        },
        y: {
          ticks: {
            callback(value) {
              return Number(value).toLocaleString("pt-BR");
            }
          }
        }
      },
      onClick(event, elements) {
        if (!elements.length) return;
        const index = elements[0].index;
        updateSelectedPoint(asc[index]);
      }
    }
  });

  btnResetZoom.disabled = false;
}

function sortRows(rows) {
  const sorted = [...rows];

  sorted.sort((a, b) => {
    let av = a[sortKey];
    let bv = b[sortKey];

    if (sortKey === "dataHoraCotacao") {
      av = new Date(av).getTime();
      bv = new Date(bv).getTime();
    } else if (typeof av === "string" || typeof bv === "string") {
      av = String(av || "").toLowerCase();
      bv = String(bv || "").toLowerCase();
    } else {
      av = Number(av);
      bv = Number(bv);
    }

    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return sorted;
}

function applyFilterAndSort() {
  const filterText = filterEl.value.trim().toLowerCase();
  const boletimFilter = selBoletim.value;

  let rows = [...rawRows];

  rows = rows.filter((row) => boletimMatchesFilter(row, boletimFilter));

  if (filterText) {
    rows = rows.filter((row) => {
      return (
        fmtDateTime(row.dataHoraCotacao).toLowerCase().includes(filterText) ||
        String(row.tipoBoletim || "").toLowerCase().includes(filterText) ||
        String(row.cotacaoCompra ?? "").toLowerCase().includes(filterText) ||
        String(row.cotacaoVenda ?? "").toLowerCase().includes(filterText)
      );
    });
  }

  viewRows = sortRows(rows);

  renderKPIs(viewRows);
  renderTable(viewRows);
  renderChart(viewRows);
  updateSelectedPoint(viewRows[0] || null);

  btnCsv.disabled = viewRows.length === 0;
  btnXlsx.disabled = viewRows.length === 0;
}

function toCsv(rows) {
  const header = [
    "dataHoraCotacao",
    "cotacaoCompra",
    "cotacaoVenda",
    "paridadeCompra",
    "paridadeVenda",
    "tipoBoletim"
  ];

  const lines = [header.join(";")];

  rows.forEach((row) => {
    lines.push([
      fmtDateTime(row.dataHoraCotacao),
      String(row.cotacaoCompra ?? "").replace(".", ","),
      String(row.cotacaoVenda ?? "").replace(".", ","),
      String(row.paridadeCompra ?? "").replace(".", ","),
      String(row.paridadeVenda ?? "").replace(".", ","),
      row.tipoBoletim || ""
    ].join(";"));
  });

  return lines.join("\n");
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCsv() {
  const fileName = `ptax_${selMoeda.value}_${dtIni.value}_${dtFim.value}.csv`;
  downloadBlob(toCsv(viewRows), fileName, "text/csv;charset=utf-8");
}

function exportExcel() {
  const aoa = [[
    "dataHoraCotacao",
    "cotacaoCompra",
    "cotacaoVenda",
    "paridadeCompra",
    "paridadeVenda",
    "tipoBoletim"
  ]];

  viewRows.forEach((row) => {
    aoa.push([
      fmtDateTime(row.dataHoraCotacao),
      row.cotacaoCompra,
      row.cotacaoVenda,
      row.paridadeCompra,
      row.paridadeVenda,
      row.tipoBoletim || ""
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PTAX");
  XLSX.writeFile(wb, `ptax_${selMoeda.value}_${dtIni.value}_${dtFim.value}.xlsx`);
}

function setDefaultDates() {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);

  const startDate = new Date();
  startDate.setFullYear(today.getFullYear() - 1);
  const start = startDate.toISOString().slice(0, 10);

  dtIni.value = localStorage.getItem("ptax_last_dtIni") || start;
  dtFim.value = localStorage.getItem("ptax_last_dtFim") || end;
}

function fillMoedasSelect() {
  MOEDAS.forEach((moeda) => {
    const option = document.createElement("option");
    option.value = moeda;
    option.textContent = moeda;
    selMoeda.appendChild(option);
  });

  selMoeda.value = localStorage.getItem("ptax_last_moeda") || "EUR";
}

async function loadSeries() {
  if (!dtIni.value || !dtFim.value) {
    statusEl.textContent = "Preencha a data inicial e final.";
    return;
  }

  btn.disabled = true;
  btnCsv.disabled = true;
  btnXlsx.disabled = true;
  btnResetZoom.disabled = true;
  statusEl.textContent = "Carregando...";

  rawRows = [];
  viewRows = [];
  resetKpis();
  updateSelectedPoint(null);
  renderTable([]);
  destroyChartIfExists();

  try {
    const url = buildUrl();
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    rawRows = normalizeRows(json);

    applyFilterAndSort();

    statusEl.textContent = `OK • ${selMoeda.value}`;

    localStorage.setItem("ptax_last_moeda", selMoeda.value);
    localStorage.setItem("ptax_last_dtIni", dtIni.value);
    localStorage.setItem("ptax_last_dtFim", dtFim.value);
  } catch (error) {
    statusEl.textContent = `Erro ao carregar: ${error.message}`;
  } finally {
    btn.disabled = false;
  }
}

function bindTableSorting() {
  document.querySelectorAll("#tbl thead th").forEach((th) => {
    th.addEventListener("click", () => {
      const nextKey = th.dataset.k;
      if (!nextKey) return;

      if (sortKey === nextKey) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = nextKey;
        sortDir = nextKey === "dataHoraCotacao" ? "desc" : "asc";
      }

      applyFilterAndSort();
    });
  });
}

function bindEvents() {
  btn.addEventListener("click", loadSeries);
  btnCsv.addEventListener("click", exportCsv);
  btnXlsx.addEventListener("click", exportExcel);
  btnResetZoom.addEventListener("click", () => {
    if (chart) chart.resetZoom();
  });

  filterEl.addEventListener("input", applyFilterAndSort);
  selBoletim.addEventListener("change", applyFilterAndSort);
}

function init() {
  fillMoedasSelect();
  setDefaultDates();
  bindTableSorting();
  bindEvents();
  loadSeries();
}

init();
