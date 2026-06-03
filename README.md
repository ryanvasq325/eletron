
function BAR() {
    _type = 'bar';
    return api;
  }

  function PIE() {
    _type = 'pie';
    return api;
  }

  async function render() {
    const el = document.getElementById(_id);
    if (!el) {
      console.error(`Charts: elemento #${_id} não encontrado.`);
      return;
    }

    const chart = echarts.init(el);
    chart.showLoading();

    try {
      const json = await request.get(_url);
      const option = _type === 'bar' ? buildBAR(json) : buildPIE(json);
      chart.hideLoading();
      chart.setOption(option);
      window.addEventListener('resize', () => chart.resize());
    } catch (err) {
      chart.hideLoading();
      console.error(`Charts: erro ao buscar "${_url}" →`, err.message);
    }
  }

  function buildBAR(json) {
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: json.series.map(s => s.name) },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: json.labels },
      yAxis: { type: 'value' },
      series: json.series.map(s => ({
        name: s.name,
        type: 'bar',
        data: s.data,
        emphasis: { focus: 'series' },
      })),
    };
  }

  function buildPIE(json) {
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        padAngle: 5,
        itemStyle: { borderRadius: 8 },
        data: json.labels.map((label, i) => ({
          name: label,
          value: json.values[i],
        })),
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' },
        },
      }],
    };
  }

  const api = { setId, getData, BAR, PIE, render };
  return api;
})();

window.Charts = Charts;
