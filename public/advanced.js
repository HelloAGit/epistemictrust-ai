(() => {
  const add = (id, title, setup) => {
    const details = document.createElement('details');
    details.className = 'card section';
    const heading = document.createElement('summary');
    heading.textContent = title;
    details.append(heading);
    document.getElementById(id).append(details);
    setup(details);
  };
  const submit = async (path, input) => {
    const response = await fetch(path, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  };
  const control = (parent, label, path, input, display) => {
    const button = document.createElement('button');
    button.className = 'button section';
    button.textContent = label;
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    parent.append(button, status);
    button.addEventListener('click', async () => {
      button.disabled = true;
      status.textContent = 'Calculating…';
      try {
        display(await submit(path, input()));
        status.textContent = 'Calculation complete.';
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  };
  add('calibration', 'Advanced calibration', parent => {
    const label = document.createElement('label');
    label.textContent = 'Binning';
    const select = document.createElement('select');
    select.add(new Option('Equal width', 'equal_width'));
    select.add(new Option('Adaptive frequency', 'equal_frequency'));
    label.append(select);
    const output = document.createElement('p');
    const chart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chart.id = 'advancedReliability';
    chart.setAttribute('class', 'chart');
    chart.setAttribute('viewBox', '0 0 540 285');
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', 'Advanced calibration reliability chart');
    chart.hidden = true;
    parent.append(label);
    control(parent, 'Analyze browser cases', '/api/calibration/analyze', () => ({
      cases: cases.map(({ p, y }) => ({ confidence: p, outcome: y })), binning: select.value,
    }), result => {
      output.textContent = [
        result.count + ' browser cases',
        'Brier ' + num(result.brierScore),
        'Log loss ' + num(result.logLoss),
        'Accuracy ' + pct(result.accuracy),
        'ECE ' + pct(result.expectedCalibrationError),
        'MCE ' + pct(result.maximumCalibrationError),
        'AUROC ' + (result.auroc === null ? 'undefined' : num(result.auroc)),
        result.brierInterval ? '95% bootstrap Brier interval ' + num(result.brierInterval.lower) + '–' + num(result.brierInterval.upper) : '',
        ...result.warnings,
      ].filter(Boolean).join(' · ');
      svgChart(chart.id, result.bins.map(bin => ({ n: bin.count, confidence: bin.confidence, accuracy: bin.observed })));
      chart.hidden = false;
    });
    parent.append(output, chart);
  });
  add('decisions', 'Advanced simulation', parent => {
    const label = document.createElement('label');
    label.textContent = 'Scenario JSON';
    const editor = document.createElement('textarea');
    editor.rows = 9;
    editor.value = JSON.stringify({
      probabilities: [0.65, 0.35], unit: 'GBP', baseline: 'Wait',
      actions: [{ name: 'Wait', payoffs: [0, -12000] },
        { name: 'Act', payoffs: [-4000, 0] }, { name: 'Review', payoffs: [-1500, -2500] }],
      trials: 2000, seed: 42,
    }, null, 2);
    label.append(editor);
    const output = document.createElement('div');
    parent.append(label);
    control(parent, 'Simulate scenario', '/api/decisions/simulate', () => JSON.parse(editor.value), result => {
      output.replaceChildren();
      const summary = document.createElement('p');
      summary.textContent = 'Assumed scenario · Baseline ' + result.baseline
        + ' · Value of perfect information ' + result.expectedValueOfPerfectInformation.toFixed(2) + ' ' + result.unit;
      output.append(summary);
      const list = document.createElement('ul');
      for (const action of result.actions) {
        const item = document.createElement('li');
        item.textContent = action.name + ' · Expected utility ' + action.expectedUtility.toFixed(2)
          + ' · Expected regret ' + action.expectedRegret.toFixed(2)
          + ' · Baseline difference ' + action.improvementOverBaseline.toFixed(2)
          + ' · Simulated mean ' + action.simulatedMean.toFixed(2) + ' ' + result.unit;
        list.append(item);
      }
      output.append(list);
    });
    parent.append(output);
  });
})();
