import { CONFIG } from './config.js';
import { GithubAPI } from './api.js';
import { DataModel } from './model.js';
import { ChartManager } from './charts.js';
import { UI } from './ui.js';

class App {
    constructor() {
        this.api = new GithubAPI();
        this.model = new DataModel();
        this.charts = new ChartManager();
        this.currentDate = new Date();
        this.viewMode = 'month';
        
        this.ui = new UI({
            onAddRecord: (r) => this.handleAddRecord(r),
            // === 绑定删除事件 ===
            onDeleteRecord: (id, isRec) => this.handleDeleteRecord(id, isRec),
            
            onViewModeChange: (mode) => {
                this.viewMode = mode;
                this.refreshView();
            },
            onNavigate: (dir) => this.handleNavigate(dir)
        });

        this.init();
    }

    init() {
        document.getElementById('ghToken').value = this.api.token;
        document.getElementById('ghRepo').value = this.api.repo;
        document.getElementById('btnLoad').onclick = () => this.loadCloudData();
        document.getElementById('btnSave').onclick = () => this.saveCloudData();
        if(this.api.token && this.api.repo) this.loadCloudData();
        else this.refreshView();
    }

    async loadCloudData() {
        this.ui.toggleLoading(true);
        try {
            this.api.setCredentials(
                document.getElementById('ghToken').value,
                document.getElementById('ghRepo').value
            );
            const res = await this.api.fetchFile(CONFIG.FILE_NAME);
            if(res) {
                this.model.load(res.content, res.sha);
            }
            this.refreshView();
        } catch(e) {
            console.error(e);
            alert('读取失败或Token错误');
        } finally {
            this.ui.toggleLoading(false);
        }
    }

    async saveCloudData() {
        this.ui.toggleLoading(true);
        try {
            const res = await this.api.saveFile(CONFIG.FILE_NAME, this.model.data, this.model.sha);
            this.model.sha = res.content.sha;
            alert('保存成功');
        } catch(e) {
            alert('保存失败: ' + e.message);
        } finally {
            this.ui.toggleLoading(false);
        }
    }

    handleAddRecord(record) {
        this.model.addRecord(record);
        this.refreshView();
    }

    // === 新增：处理删除逻辑 ===
    handleDeleteRecord(id, isRecurring) {
        this.model.deleteRecord(id, isRecurring);
        this.refreshView(); // 刷新界面
        // 建议删除后提醒用户保存
        // alert('记录已删除，记得点击右上角的“保存”按钮同步到云端哦！');
    }

    handleNavigate(dir) {
        if (this.viewMode === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + dir);
        } else {
            this.currentDate.setFullYear(this.currentDate.getFullYear() + dir);
        }
        this.refreshView();
    }

    refreshView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        this.ui.renderHeader(this.currentDate, this.viewMode);

        if (this.viewMode === 'month') {
            const monthData = this.model.getMonthData(year, month);
            let tInc = 0, tExp = 0;
            monthData.forEach(d => { tInc += d.inc; tExp += d.exp; });
            this.ui.renderStats(tInc, tExp);
            this.charts.render(tInc, tExp, monthData.map(d => d.net), monthData.length);
            this.ui.renderMonthGrid(year, month, monthData);
        } else {
            const yearData = this.model.getYearData(year);
            let yInc = 0, yExp = 0;
            yearData.forEach(m => { yInc += m.inc; yExp += m.exp; });
            this.ui.renderStats(yInc, yExp);
            this.charts.render(yInc, yExp, yearData.map(m => m.net), 12);
            this.ui.renderYearGrid(yearData);
        }
    }
}

new App();