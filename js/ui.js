export class UI {
    constructor(callbacks) {
        this.cb = callbacks;
        this.setupListeners();
    }

    setupListeners() {
        // Modal Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const isLong = e.target.dataset.tab === 'long';
                document.getElementById('groupSingle').classList.toggle('hidden', isLong);
                document.getElementById('groupLong').classList.toggle('hidden', !isLong);
            });
        });

        // Modal Actions
        document.getElementById('btnAdd').onclick = () => {
            document.getElementById('addModal').style.display = 'flex';
            document.getElementById('inDate').valueAsDate = new Date();
        };
        document.getElementById('btnCancel').onclick = () => document.getElementById('addModal').style.display = 'none';
        
        // Form Submit
        document.getElementById('recordForm').onsubmit = (e) => {
            e.preventDefault();
            this.cb.onAddRecord(this.getFormData());
            document.getElementById('addModal').style.display = 'none';
            document.getElementById('recordForm').reset();
        };
    }

    getFormData() {
        const isLong = document.querySelector('.tab-btn[data-tab="long"]').classList.contains('active');
        return {
            type: document.getElementById('inType').value,
            amount: parseFloat(document.getElementById('inAmount').value),
            currency: document.getElementById('inCurrency').value,
            note: document.getElementById('inNote').value,
            isRecurring: isLong,
            date: document.getElementById('inDate').value,
            start: document.getElementById('inStartDate').value,
            end: document.getElementById('inEndDate').value
        };
    }

    renderHeader(date) {
        document.getElementById('currentDateLabel').innerText = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
    }

    renderStats(dataArr) {
        let tInc = 0, tExp = 0;
        dataArr.forEach(d => { tInc += d.inc; tExp += d.exp; });
        
        document.getElementById('dispTotalInc').innerText = `¥${tInc.toFixed(0)}`;
        document.getElementById('dispTotalExp').innerText = `¥${tExp.toFixed(0)}`;
        document.getElementById('dispBalance').innerText = `¥${(tInc - tExp).toFixed(0)}`;
        document.getElementById('dispWeekly').innerText = `¥${(tExp / 4.3).toFixed(0)}`; // 粗略月周数

        return { tInc, tExp, dailyNets: dataArr.map(d => d.net) };
    }

    renderCalendar(year, month, dataArr) {
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        
        // Headers
        ['日','一','二','三','四','五','六'].forEach(d => grid.innerHTML += `<div style="text-align:center;color:#666">${d}</div>`);

        const firstDay = new Date(year, month, 1).getDay();
        
        // Empties
        for(let i=0; i<firstDay; i++) grid.appendChild(document.createElement('div'));

        // Days
        dataArr.forEach((dayData, idx) => {
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            let html = `<div style="opacity:0.5; margin-bottom:5px">${idx + 1}</div>`;
            
            dayData.items.slice(0, 3).forEach(item => {
                const s = item.currency === 'USD' ? '$' : '¥';
                const c = item.type === 'income' ? 'inc' : 'exp';
                const l = item.isRecurring ? 'long' : '';
                html += `<div class="tag ${c} ${l}">${s}${item.amount} ${item.note}</div>`;
            });
            
            cell.innerHTML = html;
            cell.onclick = () => {
                document.getElementById('addModal').style.display = 'flex';
                const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(idx+1).padStart(2,'0')}`;
                document.getElementById('inDate').value = dStr;
            };
            grid.appendChild(cell);
        });
    }

    toggleLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }
}