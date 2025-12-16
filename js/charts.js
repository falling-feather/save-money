export class ChartManager {
    constructor() {
        this.pieChart = null;
        this.barChart = null;
    }

    render(totalInc, totalExp, dailyNets, days) {
        this._renderPie(totalInc, totalExp);
        this._renderBar(dailyNets, days);
    }

    _renderPie(inc, exp) {
        const ctx = document.getElementById('pieChart').getContext('2d');
        if (this.pieChart) this.pieChart.destroy();
        
        this.pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['收入', '支出', '结余'],
                datasets: [{
                    data: [inc, exp, Math.max(0, inc - exp)],
                    backgroundColor: ['#00d26a', '#f94144', '#4cc9f0'],
                    borderWidth: 0
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { position: 'right', labels: { color: 'white', boxWidth: 10 } } } 
            }
        });
    }

    _renderBar(dailyNets, days) {
        const ctx = document.getElementById('barChart').getContext('2d');
        if (this.barChart) this.barChart.destroy();
        
        const labels = Array.from({length: days}, (_, i) => i + 1);
        
        this.barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '每日净值 (CNY)',
                    data: dailyNets,
                    backgroundColor: dailyNets.map(v => v >= 0 ? '#00d26a' : '#f94144'),
                    borderRadius: 3
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { display: false },
                    y: { ticks: { color: '#666' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}