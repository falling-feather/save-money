export class UI {
    constructor(callbacks) {
        this.cb = callbacks;
        this.currentSelectedDate = null;
        this.currentDayItems = [];
        this.setupListeners();
    }

    setupListeners() {
        // 模态框导航
        document.getElementById('navAdd').onclick = () => this.switchModalView('add');
        document.getElementById('navDetail').onclick = () => this.switchModalView('detail');

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

        // 表单提交
        document.getElementById('recordForm').onsubmit = (e) => {
            e.preventDefault();
            this.cb.onSaveRecord(this.getFormData());
            document.getElementById('addModal').style.display = 'none';
        };

        // 通用按钮
        document.getElementById('btnCancel').onclick = () => document.getElementById('addModal').style.display = 'none';
        document.getElementById('btnAdd').onclick = () => this.openDayModal(new Date(), []);
        
        // 视图切换与导航
        document.getElementById('viewMode').addEventListener('change', (e) => this.cb.onViewModeChange(e.target.value));
        document.getElementById('btnPrev').onclick = () => this.cb.onNavigate(-1);
        document.getElementById('btnNext').onclick = () => this.cb.onNavigate(1);
    }

    // === 打开弹窗 ===
    openDayModal(date, items = []) {
        this.currentSelectedDate = date;
        this.currentDayItems = items;

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        
        document.getElementById('modalDateTitle').innerText = dateStr;
        
        // 重置表单为新增状态
        this.resetForm(dateStr);
        
        // 渲染详情列表
        this.renderDetailList(items);

        // 默认显示记账页
        this.switchModalView('add');
        document.getElementById('addModal').style.display = 'flex';
    }

    switchModalView(view) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.modal-view').forEach(v => v.classList.add('hidden'));

        if (view === 'add') {
            document.getElementById('navAdd').classList.add('active');
            document.getElementById('viewAdd').classList.remove('hidden');
        } else {
            document.getElementById('navDetail').classList.add('active');
            document.getElementById('viewDetail').classList.remove('hidden');
        }
    }

    // === 渲染详情列表 ===
    renderDetailList(items) {
        const listDiv = document.getElementById('detailList');
        listDiv.innerHTML = '';

        if (!items || items.length === 0) {
            listDiv.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.6">当日无记录</div>';
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            const typeClass = item.type === 'income' ? 'inc' : 'exp';
            div.className = `detail-item ${typeClass}`;
            const symbol = item.currency === 'USD' ? '$' : '¥';
            const icon = item.isRecurring ? '<i class="fas fa-redo-alt"></i> ' : '';

            div.innerHTML = `
                <div class="item-info">
                    <div style="font-weight:bold">${icon}${item.note}</div>
                    <div style="font-size:0.9em; opacity:0.8">${symbol}${item.amount}</div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon" id="edit-${item.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon danger" id="del-${item.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            listDiv.appendChild(div);

            // 绑定删除
            div.querySelector(`#del-${item.id}`).onclick = () => {
                if(confirm('确认删除？如果是周期任务将影响所有相关日期。')) {
                    this.cb.onDeleteRecord(item.id, item.isRecurring);
                    document.getElementById('addModal').style.display = 'none';
                }
            };

            // 绑定编辑
            div.querySelector(`#edit-${item.id}`).onclick = () => {
                this.fillFormForEdit(item);
                this.switchModalView('add');
            };
        });
    }

    fillFormForEdit(item) {
        document.getElementById('editId').value = item.id;
        document.getElementById('inType').value = item.type;
        document.getElementById('inAmount').value = item.amount;
        document.getElementById('inCurrency').value = item.currency;
        document.getElementById('inNote').value = item.note;

        const tabMode = item.isRecurring ? 'long' : 'single';
        document.querySelector(`.tab-btn[data-tab="${tabMode}"]`).click();

        if (item.isRecurring) {
            document.getElementById('inStartDate').value = item.start;
            document.getElementById('inEndDate').value = item.end;
            document.getElementById('inCycle').value = item.cycle || 1;
        } else {
            document.getElementById('inDate').value = item.date;
        }
        document.getElementById('btnConfirm').innerText = '修改保存';
    }

    resetForm(dateStr) {
        document.getElementById('recordForm').reset();
        document.getElementById('editId').value = ''; 
        document.getElementById('inDate').value = dateStr;
        document.querySelector('.tab-btn[data-tab="single"]').click();
        document.getElementById('btnConfirm').innerText = '确认记账';
    }

    getFormData() {
        const isLong = document.querySelector('.tab-btn[data-tab="long"]').classList.contains('active');
        const editId = document.getElementById('editId').value;
        return {
            id: editId ? Number(editId) : null,
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

    renderStats(tInc, tExp) {
        document.getElementById('dispTotalInc').innerText = `¥${tInc.toFixed(0)}`;
        document.getElementById('dispTotalExp').innerText = `¥${tExp.toFixed(0)}`;
        const balance = tInc - tExp;
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
            
            const dateNum = document.createElement('div');
            dateNum.style.opacity = '0.5';
            dateNum.style.marginBottom = '5px';
            dateNum.innerText = idx + 1;
            cell.appendChild(dateNum);
            
            // 渲染 Tag (仅展示)
            dayData.items.slice(0, 3).forEach(item => {
                const tag = document.createElement('div');
                const c = item.type === 'income' ? 'inc' : 'exp';
                const l = item.isRecurring ? 'long' : '';
                const s = item.currency === 'USD' ? '$' : '¥';
                tag.className = `tag ${c} ${l}`;
                tag.innerHTML = `${s}${item.amount} ${item.note}`;
                cell.appendChild(tag);
            });
            if(dayData.items.length > 3) {
                const more = document.createElement('div');
                more.className = 'tag';
                more.innerText = '...';
                cell.appendChild(more);
            }

            // 点击格子打开弹窗
            cell.onclick = () => {
                const targetDate = new Date(year, month, idx + 1);
                this.openDayModal(targetDate, dayData.items);
            };

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