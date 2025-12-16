export class UI {
    constructor(callbacks) {
        this.cb = callbacks;
        this.setupListeners();
    }

    setupListeners() {
        // Tab 切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const isLong = e.target.dataset.tab === 'long';
                document.getElementById('groupSingle').classList.toggle('hidden', isLong);
                document.getElementById('groupLong').classList.toggle('hidden', !isLong);
            });
        });

        // Modal 操作
        document.getElementById('btnAdd').onclick = () => {
            document.getElementById('addModal').style.display = 'flex';
            document.getElementById('inDate').valueAsDate = new Date();
        };
        document.getElementById('btnCancel').onclick = () => document.getElementById('addModal').style.display = 'none';
        
        // 表单提交
        document.getElementById('recordForm').onsubmit = (e) => {
            e.preventDefault();
            this.cb.onAddRecord(this.getFormData());
            document.getElementById('addModal').style.display = 'none';
            document.getElementById('recordForm').reset();
        };

        // 视图切换监听
        document.getElementById('viewMode').addEventListener('change', (e) => {
            this.cb.onViewModeChange(e.target.value);
        });
        
        // 前后翻页
        document.getElementById('btnPrev').onclick = () => this.cb.onNavigate(-1);
        document.getElementById('btnNext').onclick = () => this.cb.onNavigate(1);
    }

    getFormData() {
        const isLong = document.querySelector('.tab-btn[data-tab="long"]').classList.contains('active');
        return {
            type: document.getElementById('inType').value,
            amount: parseFloat(document.getElementById('inAmount').value),
            currency: document.getElementById('inCurrency').value,
            note: document.getElementById('inNote').value,
            isRecurring: isLong,
            // 如果是周期模式，读取 cycle
            cycle: isLong ? parseInt(document.getElementById('inCycle').value) : 1, 
            date: document.getElementById('inDate').value,
            start: document.getElementById('inStartDate').value,
            end: document.getElementById('inEndDate').value
        };
    }

    renderHeader(date, mode) {
        const y = date.getFullYear();
        if (mode === 'year') {
            document.getElementById('currentDateLabel').innerText = `${y} 年概览`;
        } else {
            document.getElementById('currentDateLabel').innerText = `${y} 年 ${date.getMonth() + 1} 月`;
        }
    }

    renderStats(totalInc, totalExp) {
        document.getElementById('dispTotalInc').innerText = `¥${totalInc.toFixed(0)}`;
        document.getElementById('dispTotalExp').innerText = `¥${totalExp.toFixed(0)}`;
        const balance = totalInc - totalExp;
        document.getElementById('dispBalance').innerText = `¥${balance.toFixed(0)}`;
        document.getElementById('dispBalance').style.color = balance >= 0 ? '#00d26a' : '#f94144';
        // 平均值简单显示
        document.getElementById('dispAvg').innerText = '统计中...'; 
    }

    // === 渲染月视图 (经典日历) ===
    renderMonthGrid(year, month, dataArr) {
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        grid.className = 'calendar-grid'; // 恢复 grid 布局
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(7, 1fr)';

        // 星期头
        ['日','一','二','三','四','五','六'].forEach(d => {
            grid.innerHTML += `<div style="text-align:center;color:#666;font-size:0.8em;padding-bottom:5px;">${d}</div>`;
        });

        const firstDay = new Date(year, month, 1).getDay();
        for(let i=0; i<firstDay; i++) grid.appendChild(document.createElement('div'));

        dataArr.forEach((dayData, idx) => {
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            let html = `<div style="opacity:0.5; margin-bottom:5px">${idx + 1}</div>`;
            
            dayData.items.slice(0, 3).forEach(item => {
                const s = item.currency === 'USD' ? '$' : '¥';
                const c = item.type === 'income' ? 'inc' : 'exp';
                // 增加周期标记 P (Period)
                const l = item.isRecurring ? 'long' : '';
                const icon = item.isRecurring ? '<i class="fas fa-redo-alt" style="font-size:0.6em"></i> ' : '';
                html += `<div class="tag ${c} ${l}">${icon}${s}${item.amount} ${item.note}</div>`;
            });
            if(dayData.items.length > 3) html += `<div class="tag">...</div>`;

            cell.innerHTML = html;
            cell.onclick = () => {
                document.getElementById('addModal').style.display = 'flex';
                const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(idx+1).padStart(2,'0')}`;
                document.getElementById('inDate').value = dStr;
            };
            grid.appendChild(cell);
        });
    }

    // === 渲染年视图 (12个月份卡片) ===
    renderYearGrid(yearData) {
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        
        // 调整样式为 4列 x 3行
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(80px, 1fr))'; 
        grid.style.gap = '10px';

        const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
        
        yearData.forEach((m, idx) => {
            const box = document.createElement('div');
            box.style.background = 'rgba(255,255,255,0.05)';
            box.style.padding = '10px';
            box.style.borderRadius = '8px';
            box.style.textAlign = 'center';
            box.style.border = '1px solid rgba(255,255,255,0.1)';

            const netColor = m.net >= 0 ? '#00d26a' : '#f94144';
            
            box.innerHTML = `
                <div style="font-weight:bold; margin-bottom:5px; color:#aaa">${months[idx]}</div>
                <div style="font-size:0.8em; color:#00d26a">+${m.inc.toFixed(0)}</div>
                <div style="font-size:0.8em; color:#f94144">-${m.exp.toFixed(0)}</div>
                <div style="font-weight:bold; color:${netColor}; margin-top:5px; border-top:1px solid rgba(255,255,255,0.1); padding-top:2px">
                    ${m.net.toFixed(0)}
                </div>
            `;
            grid.appendChild(box);
        });
    }

    toggleLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }
}