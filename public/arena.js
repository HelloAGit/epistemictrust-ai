(() => {
  const panel = document.createElement('section');
  panel.className = 'page hidden';
  panel.id = 'arena';
  panel.innerHTML = `
    <div class="card">
      <div class="row between"><h2>Live Model Arena</h2><span class="pill">LIVE EVALUATION</span></div>
      <p class="sub">Run the same labelled claims against the selected models. Each model reports a probability that the claim is true.</p>
      <form class="form section" id="arenaForm">
        <div><label for="arenaModels">Models (select up to two)</label><select id="arenaModels" multiple required></select></div>
        <div><label for="arenaDataset">Benchmark</label><select id="arenaDataset" required></select></div>
        <div><label for="arenaSize">Cases per model</label><input id="arenaSize" type="number" min="1" max="4" value="2" required></div>
        <div><label for="arenaBudget">Maximum billable calls</label><input id="arenaBudget" type="number" min="1" max="4" value="4" required></div>
        <div class="wide"><label for="arenaToken">Evaluation bearer token</label><input id="arenaToken" type="password" autocomplete="off" required></div>
        <div class="row wide"><button class="button" id="arenaRun" disabled>Run evaluation</button>
        <button class="button secondary" id="arenaCancel" type="button" disabled>Cancel</button>
        <button class="button secondary" id="arenaDownload" type="button" disabled>Download JSON</button></div>
      </form>
      <p role="status" id="arenaStatus"></p>
    </div>
    <div id="arenaResults"></div>`;
  document.querySelector('main .foot').before(panel);
  pages.arena = ['Model Arena', 'Evaluate models on the same benchmark', 'Compare live confidence predictions against fixed reference labels.'];
  const nav = document.createElement('button');
  nav.dataset.tab = 'arena';
  nav.textContent = 'Model Arena';
  document.querySelector('.nav').append(nav);
  const status = $('arenaStatus');
  const select = $('arenaModels');
  const results = $('arenaResults');
  const run = $('arenaRun');
  let loaded = false;
  let active;
  let latest;
  nav.addEventListener('click', async () => {
    go('arena');
    if (loaded) return;
    try {
      const response = await fetch('/api/models');
      if (!response.ok) throw new Error('Model registry unavailable.');
      const { models, dataset } = await response.json();
      $('arenaDataset').replaceChildren(new Option(dataset.title, dataset.id));
      $('arenaSize').max = dataset.count;
      select.replaceChildren(...models.map(model => {
        const option = new Option(model.model + ' · ' + model.provider + (model.available ? '' : ' · unavailable'), model.id);
        option.disabled = !model.available;
        return option;
      }));
      const available = Array.from(select.options).filter(option => !option.disabled);
      if (available.length) available[0].selected = true;
      run.disabled = !available.length;
      status.textContent = available.length ? '' : 'Live providers are unavailable in this environment.';
      loaded = true;
    } catch {
      status.textContent = 'Model registry unavailable. Reopen Model Arena to retry.';
    }
  });

  function render(result) {
    results.replaceChildren();
    for (const model of result.comparison) {
      const card = document.createElement('div');
      card.className = 'card section';
      const heading = document.createElement('h2');
      heading.textContent = model.modelId;
      const summary = document.createElement('p');
      const m = model.metrics;
      summary.textContent = model.completed + '/' + model.requested + ' completed' +
        (m ? ' · Accuracy ' + pct(m.accuracy) + ' · Brier ' + num(m.brierScore) + ' · Mean latency ' + Math.round(model.meanLatencyMs) + ' ms' : ' · Metrics unavailable for incomplete runs');
      card.append(heading, summary);
      if (m) {
        const chart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        chart.id = 'arena-chart-' + results.childElementCount;
        chart.setAttribute('class', 'chart');
        chart.setAttribute('viewBox', '0 0 540 285');
        chart.setAttribute('role', 'img');
        chart.setAttribute('aria-label', 'Reliability chart for ' + model.modelId);
        card.append(chart);
      }
      for (const row of result.predictions.filter(item => item.modelId === model.modelId)) {
        const detail = document.createElement('details');
        const title = document.createElement('summary');
        title.textContent = row.claim + ' · ' + row.status;
        const record = document.createElement('p');
        record.textContent = row.status === 'completed'
          ? 'Probability ' + pct(row.confidence) + ' · Label ' + (row.outcome ? 'True' : 'False') + ' · ' + row.rationale
          : 'No model prediction was recorded for this case.';
        detail.append(title, record);
        card.append(detail);
      }
      results.append(card);
      if (m) svgChart(card.querySelector('svg').id, m.bins.filter(bin => bin.count).map(bin => ({
        n: bin.count, confidence: bin.meanConfidence, accuracy: bin.observedFrequency,
      })));
    }
  }

  $('arenaCancel').onclick = () => active?.abort();
  $('arenaDownload').onclick = () => {
    if (latest) download('epistemictrust-arena-' + latest.id + '.json', 'application/json', JSON.stringify(latest, null, 2));
  };
  $('arenaForm').addEventListener('submit', async event => {
    event.preventDefault();
    const modelIds = Array.from(select.selectedOptions, option => option.value);
    const sampleSize = Number($('arenaSize').value);
    const maxCalls = Number($('arenaBudget').value);
    if (modelIds.length > 2 || modelIds.length * sampleSize > maxCalls) {
      status.textContent = 'Select up to two models within the call budget.';
      return;
    }
    active = new AbortController();
    run.disabled = true;
    $('arenaCancel').disabled = false;
    $('arenaDownload').disabled = true;
    results.replaceChildren();
    status.textContent = 'Evaluating models…';
    try {
      const response = await fetch('/api/evaluations', {
        method: 'POST', signal: active.signal,
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + $('arenaToken').value.trim() },
        body: JSON.stringify({ modelIds, datasetId: $('arenaDataset').value, sampleSize, maxCalls }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Evaluation failed.');
      latest = result;
      render(result);
      status.textContent = result.predictions.every(row => row.status === 'completed')
        ? 'Evaluation complete.' : 'Evaluation finished with incomplete results.';
      $('arenaDownload').disabled = false;
    } catch (error) {
      status.textContent = active.signal.aborted ? 'Request cancelled. A submitted provider call may still be billed.' : error.message;
    } finally {
      $('arenaToken').value = '';
      $('arenaCancel').disabled = true;
      run.disabled = false;
      active = undefined;
    }
  });
})();
