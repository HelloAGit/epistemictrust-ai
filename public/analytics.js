(() => {
  const page = document.createElement('section');
  page.id = 'analytics';
  page.className = 'page hidden';
  page.innerHTML = `
    <div class="card">
      <div class="row between">
        <div>
          <h2>Calibration analytics</h2>
          <p class="sub">Explore the confidence and outcomes of cases in this browser.</p>
        </div>
        <div>
          <label for="analyticsModel">Model</label>
          <select id="analyticsModel"><option value="">All models</option></select>
        </div>
      </div>
      <p id="analyticsSummary" class="panel-note" aria-live="polite"></p>
      <p class="hint">Charts use browser calculations. MLStatSoft is awaiting API configuration.</p>
    </div>
    <div class="grid two section">
      <div class="card">
        <h2>Confidence vs. observed outcomes</h2>
        <svg class="chart" id="analyticsChart" viewBox="0 0 540 285" role="img" aria-label="Observed event rate versus predicted probability"></svg>
      </div>
      <div class="card">
        <h2>Brier score by model</h2>
        <div id="analyticsBars"></div>
        <p class="hint">The scale runs from 0 to 1. Lower scores indicate smaller squared prediction errors.</p>
      </div>
    </div>
    <div class="card section">
      <h2>Model comparison</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Model</th><th>Cases</th><th>Classification accuracy</th><th>Brier</th><th>ECE</th></tr></thead>
        <tbody id="analyticsRows"></tbody>
      </table></div>
      <p class="hint">Classification uses a 50% threshold. ECE uses five equal-width bins. Small groups make comparisons sensitive to individual cases.</p>
    </div>`;
  document.querySelector('main .foot').before(page);
  pages.analytics = ['Analytics', 'Explore evaluation outcomes', 'Compare calibration and prediction error across models.'];
  const button = document.createElement('button');
  button.dataset.tab = 'analytics';
  button.textContent = 'Analytics';
  document.querySelector('.nav').append(button);

  const select = $('analyticsModel');
  const percent = value => (value * 100).toFixed(1) + '%';

  function summarize(records) {
    const bins = Array.from({ length: 5 }, () => ({ n: 0, total: 0, observed: 0 }));
    let correct = 0;
    let error = 0;
    for (const { p, y } of records) {
      const bin = bins[Math.min(4, Math.floor(p * 5))];
      bin.n++;
      bin.total += p;
      bin.observed += y;
      correct += Number(Number(p >= 0.5) === y);
      error += (p - y) ** 2;
    }
    const n = records.length;
    return {
      n, accuracy: correct / n, brier: error / n,
      ece: bins.reduce((sum, bin) => sum + Math.abs(bin.total - bin.observed), 0) / n,
      gap: bins.reduce((sum, bin) => sum + bin.total - bin.observed, 0) / n,
      bins: bins.filter(bin => bin.n).map(bin => ({
        n: bin.n, confidence: bin.total / bin.n, accuracy: bin.observed / bin.n,
      })),
    };
  }

  function renderAnalytics() {
    const groups = Map.groupBy(cases, record => record.model);
    const selected = select.value;
    select.replaceChildren(new Option('All models', ''), ...Array.from(groups.keys(), model => new Option(model, model)));
    select.value = groups.has(selected) ? selected : '';
    const records = select.value ? groups.get(select.value) : cases;
    const summary = summarize(records);
    svgChart('analyticsChart', summary.bins);
    const direction = summary.gap >= 0 ? 'above' : 'below';
    const gap = (Math.abs(summary.gap) * 100).toFixed(1);
    $('analyticsSummary').textContent = summary.n
      ? `${summary.n} cases · ${percent(summary.accuracy)} classification accuracy · Mean predicted probability is ${gap} percentage points ${direction} the observed event rate.`
      : 'No cases available for this selection.';
    const rows = $('analyticsRows');
    const bars = $('analyticsBars');
    rows.replaceChildren();
    bars.replaceChildren();
    for (const [model, modelCases] of groups) {
      if (select.value && select.value !== model) continue;
      const metrics = summarize(modelCases);
      const row = rows.insertRow();
      for (const value of [model, metrics.n, percent(metrics.accuracy), metrics.brier.toFixed(3), percent(metrics.ece)]) {
        row.insertCell().textContent = value;
      }
      const bar = document.createElement('div');
      bar.className = 'axisbar';
      const name = document.createElement('span');
      name.textContent = model;
      const track = document.createElement('div');
      track.className = 'progress';
      track.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('div');
      fill.className = 'fill';
      fill.style.width = percent(metrics.brier);
      track.append(fill);
      const score = document.createElement('strong');
      score.textContent = metrics.brier.toFixed(3);
      bar.append(name, track, score);
      bars.append(bar);
    }
  }

  select.addEventListener('change', renderAnalytics);
  button.addEventListener('click', () => {
    go('analytics');
    renderAnalytics();
  });
})();
