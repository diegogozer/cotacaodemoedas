const API_BASE = "/api/cotacao";

const MOEDAS = [
"AUD","CAD","CHF","DKK","EUR","GBP","JPY","NOK","NZD","SEK","USD",
"ARS","BOB","CLP","COP","MXN","PEN","PYG","UYU","VEF",
"CNY","HKD","INR","KRW","SGD","THB","TWD","ZAR"
];

const selMoeda = document.getElementById("selMoeda");
const dtIni = document.getElementById("dtIni");
const dtFim = document.getElementById("dtFim");
const btn = document.getElementById("btn");
const btnCsv = document.getElementById("btnCsv");
const btnXlsx = document.getElementById("btnXlsx");
const btnResetZoom = document.getElementById("btnResetZoom");

const filterEl = document.getElementById("filter");
const selBoletim = document.getElementById("selBoletim");

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

let rawRows = [];
let viewRows = [];
let chart;
let sortKey = "dataHoraCotacao";
let sortDir = "desc";

function fmtNumber(n, dec=6){
if(n==null) return "—";
return Number(n).toLocaleString("pt-BR",{minimumFractionDigits:dec,maximumFractionDigits:dec});
}

function fmtDateTime(v){
return new Date(v).toLocaleString("pt-BR");
}

function ymdToApiDate(v){
const [y,m,d]=v.split("-");
return `${m}-${d}-${y}`;
}

function normalizeRows(json){
return (json.value||[]).map(r=>({
paridadeCompra:r.paridadeCompra,
paridadeVenda:r.paridadeVenda,
cotacaoCompra:r.cotacaoCompra,
cotacaoVenda:r.cotacaoVenda,
dataHoraCotacao:r.dataHoraCotacao,
tipoBoletim:r.tipoBoletim||""
})).sort((a,b)=>new Date(b.dataHoraCotacao)-new Date(a.dataHoraCotacao));
}

function updateSelectedPoint(row){
if(!row){
selectedPointMain.textContent="—";
selectedPointDate.textContent="Data: —";
selectedPointCompra.textContent="Compra: —";
selectedPointVenda.textContent="Venda: —";
selectedPointTipo.textContent="Boletim: —";
return;
}

selectedPointMain.textContent=`${selMoeda.value} Venda ${fmtNumber(row.cotacaoVenda)}`;
selectedPointDate.textContent=`Data: ${fmtDateTime(row.dataHoraCotacao)}`;
selectedPointCompra.textContent=`Compra: ${fmtNumber(row.cotacaoCompra)}`;
selectedPointVenda.textContent=`Venda: ${fmtNumber(row.cotacaoVenda)}`;
selectedPointTipo.textContent=`Boletim: ${row.tipoBoletim}`;
}

function renderKPIs(rows){
if(!rows.length) return;

const last=rows[0];
const prev=rows[1];

kpiCompra.textContent=fmtNumber(last.cotacaoCompra);
kpiVenda.textContent=fmtNumber(last.cotacaoVenda);
kpiData.textContent=`Data: ${fmtDateTime(last.dataHoraCotacao)}`;
kpiMoeda.textContent=`Moeda: ${selMoeda.value}`;
kpiTipo.textContent=`Boletim: ${last.tipoBoletim}`;

if(prev){
const delta=last.cotacaoVenda-prev.cotacaoVenda;
const pct=(delta/prev.cotacaoVenda)*100;

kpiDelta.textContent=fmtNumber(delta);
kpiDeltaPct.textContent=`${pct.toFixed(2)}%`;
kpiPrev.textContent=`Anterior: ${fmtNumber(prev.cotacaoVenda)}`;
}
}

function renderTable(rows){
tbody.innerHTML="";
rows.forEach(r=>{
const tr=document.createElement("tr");

tr.innerHTML=`
<td>${fmtDateTime(r.dataHoraCotacao)}</td>
<td class="right">${fmtNumber(r.cotacaoCompra)}</td>
<td class="right">${fmtNumber(r.cotacaoVenda)}</td>
<td class="right">${fmtNumber(r.paridadeCompra,8)}</td>
<td class="right">${fmtNumber(r.paridadeVenda,8)}</td>
<td>${r.tipoBoletim}</td>
`;

tbody.appendChild(tr);
});

countEl.textContent=`${rows.length} linhas`;
}

function renderChart(rows){

const asc=[...rows].sort((a,b)=>new Date(a.dataHoraCotacao)-new Date(b.dataHoraCotacao));

const labels=asc.map(r=>fmtDateTime(r.dataHoraCotacao));
const venda=asc.map(r=>r.cotacaoVenda);
const compra=asc.map(r=>r.cotacaoCompra);

const ctx=document.getElementById("chart");

if(chart) chart.destroy();

chart=new Chart(ctx,{
type:"line",
data:{
labels,
datasets:[
{
label:"Venda",
data:venda,
borderWidth:2,
pointRadius:2,
pointHoverRadius:6,
tension:0.15
},
{
label:"Compra",
data:compra,
borderWidth:2,
pointRadius:2,
pointHoverRadius:6,
tension:0.15,
hidden:true
}
]
},
options:{
responsive:true,
interaction:{mode:"nearest",intersect:false},

plugins:{
legend:{display:true},

zoom:{
pan:{enabled:true,mode:"x"},
zoom:{
wheel:{enabled:true},
pinch:{enabled:true},
drag:{enabled:true},
mode:"x"
}
}
},

onClick(evt,elements){
if(!elements.length) return;

const idx=elements[0].index;
const row=asc[idx];

updateSelectedPoint(row);
}

}
});

btnResetZoom.disabled=false;
}

function applyFilterAndSort(){

const q=filterEl.value.toLowerCase();

viewRows=[...rawRows];

if(selBoletim.value!=="TODOS"){
viewRows=viewRows.filter(r=>r.tipoBoletim===selBoletim.value);
}

if(q){
viewRows=viewRows.filter(r=>
fmtDateTime(r.dataHoraCotacao).toLowerCase().includes(q)||
r.tipoBoletim.toLowerCase().includes(q)
);
}

viewRows.sort((a,b)=>new Date(b.dataHoraCotacao)-new Date(a.dataHoraCotacao));

renderTable(viewRows);
renderChart(viewRows);
updateSelectedPoint(viewRows[0]||null);
}

async function loadSeries(){

btn.disabled=true;
statusEl.textContent="Carregando...";

try{

const url=`${API_BASE}?moeda=${selMoeda.value}&dataInicial=${ymdToApiDate(dtIni.value)}&dataFinal=${ymdToApiDate(dtFim.value)}`;

const res=await fetch(url);

const json=await res.json();

rawRows=normalizeRows(json);

renderKPIs(rawRows);

applyFilterAndSort();

btnCsv.disabled=false;
btnXlsx.disabled=false;

statusEl.textContent="OK";

}catch(e){

statusEl.textContent="Erro ao carregar";

}

btn.disabled=false;
}

function exportCSV(){

let lines=["dataHoraCotacao;cotacaoCompra;cotacaoVenda"];

viewRows.forEach(r=>{
lines.push(`${fmtDateTime(r.dataHoraCotacao)};${r.cotacaoCompra};${r.cotacaoVenda}`);
});

const blob=new Blob([lines.join("\n")],{type:"text/csv"});
const a=document.createElement("a");
a.href=URL.createObjectURL(blob);
a.download="ptax.csv";
a.click();
}

function exportExcel(){

const aoa=[["dataHoraCotacao","cotacaoCompra","cotacaoVenda"]];

viewRows.forEach(r=>{
aoa.push([fmtDateTime(r.dataHoraCotacao),r.cotacaoCompra,r.cotacaoVenda]);
});

const ws=XLSX.utils.aoa_to_sheet(aoa);
const wb=XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb,ws,"PTAX");

XLSX.writeFile(wb,"ptax.xlsx");
}

MOEDAS.forEach(m=>{
const o=document.createElement("option");
o.value=m;
o.textContent=m;
selMoeda.appendChild(o);
});

btn.addEventListener("click",loadSeries);
btnCsv.addEventListener("click",exportCSV);
btnXlsx.addEventListener("click",exportExcel);
btnResetZoom.addEventListener("click",()=>chart.resetZoom());
filterEl.addEventListener("input",applyFilterAndSort);
selBoletim.addEventListener("change",applyFilterAndSort);

loadSeries();
