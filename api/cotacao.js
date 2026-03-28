export default async function handler(req, res) {
  try {
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
      return res.status(400).json({ error: `invalid moeda: "${moeda}"` });
    }

    const reDate = /^\d{2}-\d{2}-\d{4}$/;
    if (!reDate.test(dataInicial) || !reDate.test(dataFinal)) {
      return res.status(400).json({ error: "invalid date format. Use MM-DD-YYYY" });
    }

    const upstream =
      "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/" +
      "CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)" +
      `?@moeda='${moeda}'` +
      `&@dataInicial='${dataInicial}'` +
      `&@dataFinalCotacao='${dataFinal}'` +
      "&$top=10000" +
      "&$format=json" +
      "&$select=paridadeCompra,paridadeVenda,cotacaoCompra,cotacaoVenda,dataHoraCotacao,tipoBoletim";

    const response = await fetch(upstream, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    const text = await response.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (!response.ok) {
      return res.status(response.status).send(
        JSON.stringify({
          error: "upstream_error",
          status: response.status,
          upstream,
          body: text
        })
      );
    }

    return res.status(200).send(text);
  } catch (error) {
    return res.status(500).json({
      error: "proxy_error",
      detail: String(error)
    });
  }
}
