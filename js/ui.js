export class UI {
    constructor(callbacks) {
        this.cb = callbacks;
        this.currentSelectedDate = null;
        this.currentDayItems = [];
        this.setupListeners();
    }

    setupListeners() {
        // 1. 模态框一级导航 (记账 vs 详情)
        document.getElementById('navAdd').onclick = () => this.switchModalView('add');
        document.getElementById('navDetail').onclick = () => this.switchModalView('detail');

        // 2. 记账 Tab (单次 vs 周期)
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const isLong = e.target.dataset.tab === 'long';
                document.getElementById('groupSingle').classList.toggle('hidden', isLong);
                document.getElementById('groupLong').classList.toggle('hidden', !isLong);
            });
        });

        // 3. 提交表单
        document.getElementById('recordForm').onsubmit = (e) => {
            e.preventDefault();
            this.cb.onSaveRecord(this.getFormData()); // 注意这里改为 onSaveRecord
            document.getElementById('addModal').style.display = 'none';
        };

        // 4. 其他按钮
        document.getElementById('btnCancel').onclick = () => document.getElementById('addModal').style.display = 'none';
        document.getElementById('btnAdd').onclick = () => this.openDayModal(new Date(), []); // 顶部大按钮
        document.getElementById('viewMode').addEventListener('change', (e) => this.cb.onViewModeChange(e.target.value));
        document.getElementById('btnPrev').onclick = () => this.cb.onNavigate(-1);
        document.getElementById('btnNext').onclick = () => this.cb.onNavigate(1);
    }

    // === 打开每日模态框 ===
    openDayModal(date, items = []) {
        this.currentSelectedDate = date;
        this.currentDayItems = items;

        // 1. 设置标题
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        document.getElementById('modalDateTitle').innerText = dateStr;

        // 2. 重置表单 (默认新增状态)
        this.resetForm(dateStr);

        // 3. 渲染详情列表
        this.renderDetailList(items);

        // 4. 默认显示“记账”视图
        this.switchModalView('add');
        document.getElementById('addModal').style.display = 'flex';
    }

    // === 切换模态框视图 ===
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

    // === 渲染详情列表 (支持编辑/删除) ===
    renderDetailList(items) {
        const listDiv = document.getElementById('detailList');
        listDiv.innerHTML = '';

        if (!items || items.length === 0) {
            listDiv.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.6">暂无记录</div>';
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            const typeClass = item.type === 'income' ? 'inc' : 'exp';
            div.className = `detail-item ${typeClass}`;

            const symbol = item.currency === 'USD' ? '$' : '¥';
            const recurringIcon = item.isRecurring ? '<i class="fas fa-redo-alt" title="周期任务"></i> ' : '';

            div.innerHTML = `
                <div class="item-info">
                    <div style="font-weight:bold">${recurringIcon}${item.note}</div>
                    <div style="font-size:0.9em; opacity:0.8">${symbol}${item.amount}</div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon" title="编辑" id="edit-${item.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon danger" title="删除" id="del-${item.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            listDiv.appendChild(div);

            // 绑定事件
            div.querySelector(`#del-${item.id}`).onclick = () => {
                if(confirm('确认删除吗？如果是周期任务将影响所有相关日期。')) {
                    this.cb.onDeleteRecord(item.id, item.isRecurring);
                    document.getElementById('addModal').style.display = 'none';
                }
            };

            div.querySelector(`#edit-${item.id}`).onclick = () => {
                this.fillFormForEdit(item);
                this.switchModalView('add'); // 自动跳回编辑页
            };
        });
    }

    // === 填写表单 (编辑模式) ===
    fillFormForEdit(item) {
        // 1. 填入基础信息
        document.getElementById('editId').value = item.id; // 写入ID
        document.getElementById('inType').value = item.type;
        document.getElementById('inAmount').value = item.amount;
        document.getElementById('inCurrency').value = item.currency;
        document.getElementById('inNote').value = item.note;

        // 2. 切换 Tab
        const tabMode = item.isRecurring ? 'long' : 'single';
        document.querySelector(`.tab-btn[data-tab="${tabMode}"]`).click();

        // 3. 填入日期信息
        if (item.isRecurring) {
            document.getElementById('inStartDate').value = item.start;
            document.getElementById('inEndDate').value = item.end;
            document.getElementById('inCycle').value = item.cycle || 1;
        } else {
            document.getElementById('inDate').value = item.date;
        }

        // 4. 更改按钮文字
        document.getElementById('btnConfirm').innerText = '修改保存';
    }

    resetForm(dateStr) {
        document.getElementById('recordForm').reset();
        document.getElementById('editId').value = ''; // 清空ID
        document.getElementById('inDate').value = dateStr;
        document.querySelector('.tab-btn[data-tab="single"]').click();
        document.getElementById('btnConfirm').innerText = '确认记账';
    }

    getFormData() {
        const isLong = document.querySelector('.tab-btn[data-tab="long"]').classList.contains('active');
        const editId = document.getElementById('editId').value;
        
        return {
            id: editId ? Number(editId) : null, // 关键：如果有ID说明是修改
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

    // ... (Stats 和 YearGrid 代码保持不变) ...

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
            
            // 日期数字
            const dateNum = document.createElement('div');
            dateNum.style.opacity = '0.5';
            dateNum.style.marginBottom = '5px';
            dateNum.innerText = idx + 1;
            cell.appendChild(dateNum);
            
            // 简略条目 (仅展示，不绑定点击事件，点击整体触发)
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

            // === 核心修改：点击整个格子打开弹窗 ===
            cell.onclick = () => {
                const targetDate = new Date(year, month, idx + 1);
                // 传入当日数据，用于渲染“详情”列表
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