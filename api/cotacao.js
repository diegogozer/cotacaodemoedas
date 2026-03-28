export default async function handler(req, res) {
  let moeda = req.query.moeda ?? "EUR";
  let dataInicial = req.query.dataInicial ?? "01-01-2020";
  let dataFinal = req.query.dataFinal ?? "11-30-2024";

  if (Array.isArray(moeda)) moeda = moeda[0];
  if (Array.isArray(dataInicial)) dataInicial = dataInicial[0];
  if (Array.isArray(dataFinal)) dataFinal = dataFinal[0];

  moeda = String(moeda).trim().toUpperCase();
  dataInicial = String(dataInicial).trim();
  dataFinal = String(dataFinal).trim();

  if (!/^[A-Z]{3}$/.test(moeda)) {
    res.status(400).send(`invalid moeda: "${moeda}"`);
    return;
  }

  // formato exigido pela API do BCB no exemplo: MM-DD-YYYY
  const reDate = /^\d{2}-\d{2}-\d{4}$/;
  if (!reDate.test(dataInicial) || !reDate.test(dataFinal)) {
    res.status(400).send(`invalid date format. Use MM-DD-YYYY`);
    return;
  }

  const upstream =
    `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
    `CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@moeda='${encodeURIComponent(moeda)}'` +
    `&@dataInicial='${encodeURIComponent(dataInicial)}'` +
    `&@dataFinalCotacao='${encodeURIComponent(dataFinal)}'` +
    `&$format=json` +
    `&$select=paridadeCompra,paridadeVenda,cotacaoCompra,cotacaoVenda,dataHoraCotacao,tipoBoletim`;

  try {
    const r = await fetch(upstream, {
      headers: { "Accept": "application/json" }
    });

    const text = await r.text();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).send(JSON.stringify({ error: "proxy error", detail: String(e) }));
  }
}
