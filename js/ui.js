export class UI {
    constructor(callbacks) {
        this.cb = callbacks;
        this.setupListeners();
    }

    setupListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const isLong = e.target.dataset.tab === 'long';
                document.getElementById('groupSingle').classList.toggle('hidden', isLong);
                document.getElementById('groupLong').classList.toggle('hidden', !isLong);
            });
        });

        document.getElementById('btnAdd').onclick = () => {
            this.openAddModal(new Date());
        };
        document.getElementById('btnCancel').onclick = () => document.getElementById('addModal').style.display = 'none';
        
        document.getElementById('recordForm').onsubmit = (e) => {
            e.preventDefault();
            this.cb.onAddRecord(this.getFormData());
            document.getElementById('addModal').style.display = 'none';
            document.getElementById('recordForm').reset();
        };

        document.getElementById('viewMode').addEventListener('change', (e) => this.cb.onViewModeChange(e.target.value));
        document.getElementById('btnPrev').onclick = () => this.cb.onNavigate(-1);
        document.getElementById('btnNext').onclick = () => this.cb.onNavigate(1);
    }

    openAddModal(date) {
        document.getElementById('addModal').style.display = 'flex';
        // 格式化日期为 YYYY-MM-DD 填入表单
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        document.getElementById('inDate').value = `${y}-${m}-${d}`;
    }

    getFormData() {
        const isLong = document.querySelector('.tab-btn[data-tab="long"]').classList.contains('active');
        return {
            type: document.getElementById('inType').value,
            amount: parseFloat(document.getElementById('inAmount').value),
            currency: document.getElementById('inCurrency').value,
            note: document.getElementById('inNote').value,
            isRecurring: isLong,
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
        document.getElementById('dispAvg').innerText = '统计中...'; 
    }

    renderMonthGrid(year, month, dataArr) {
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        grid.className = 'calendar-grid'; 
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(7, 1fr)';

        ['日','一','二','三','四','五','六'].forEach(d => {
            grid.innerHTML += `<div style="text-align:center;color:#666;font-size:0.8em;padding-bottom:5px;">${d}</div>`;
        });

        const firstDay = new Date(year, month, 1).getDay();
        for(let i=0; i<firstDay; i++) grid.appendChild(document.createElement('div'));

        dataArr.forEach((dayData, idx) => {
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            
            // 1. 顶部日期数字 (点击这里 -> 添加)
            const dateNum = document.createElement('div');
            dateNum.style.opacity = '0.5';
            dateNum.style.marginBottom = '5px';
            dateNum.innerText = idx + 1;
            // 点击整个格子默认是添加，但在 tag 上阻止冒泡
            cell.onclick = () => this.openAddModal(new Date(year, month, idx + 1));
            cell.appendChild(dateNum);
            
            // 2. 渲染条目 (点击条目 -> 删除)
            dayData.items.slice(0, 3).forEach(item => {
                const tag = document.createElement('div');
                const c = item.type === 'income' ? 'inc' : 'exp';
                const l = item.isRecurring ? 'long' : '';
                const s = item.currency === 'USD' ? '$' : '¥';
                const icon = item.isRecurring ? '<i class="fas fa-redo-alt"></i> ' : '';
                
                tag.className = `tag ${c} ${l}`;
                tag.innerHTML = `${icon}${s}${item.amount} ${item.note}`;
                
                // === 关键修改：点击标签触发删除 ===
                tag.onclick = (e) => {
                    e.stopPropagation(); // 阻止触发 cell.onclick (防止打开添加窗口)
                    
                    let confirmText = `确认删除这条记录吗？\n${item.note} : ${item.amount}`;
                    if(item.isRecurring) confirmText += `\n⚠️ 注意：这是一个周期性任务，删除将移除该任务的所有未来生成！`;
                    
                    if(confirm(confirmText)) {
                        this.cb.onDeleteRecord(item.id, item.isRecurring);
                    }
                };
                
                cell.appendChild(tag);
            });

            if(dayData.items.length > 3) {
                const more = document.createElement('div');
                more.className = 'tag';
                more.innerText = '...';
                cell.appendChild(more);
            }

            grid.appendChild(cell);
        });
    }

    renderYearGrid(yearData) {
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
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
                <div style="font-weight:bold; color:${netColor}; margin-top:5px; border-top:1px solid rgba(255,255,255,0.1); padding-top:2px">${m.net.toFixed(0)}</div>
            `;
            grid.appendChild(box);
        });
    }

    toggleLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }
}