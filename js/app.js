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
        this.viewMode = 'month'; // 'month' or 'year'
        
        this.ui = new UI({
            onAddRecord: (r) => this.handleAddRecord(r),
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
        
        // 尝试自动读取
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
            alert('读取失败，请检查Token');
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
            // === 月视图模式 ===
            const monthData = this.model.getMonthData(year, month);
            
            // 统计
            let tInc = 0, tExp = 0;
            monthData.forEach(d => { tInc += d.inc; tExp += d.exp; });
            this.ui.renderStats(tInc, tExp);
            
            // 图表
            const dailyNets = monthData.map(d => d.net);
            this.charts.render(tInc, tExp, dailyNets, monthData.length);
            
            // 网格
            this.ui.renderMonthGrid(year, month, monthData);

        } else {
            // === 年视图模式 ===
            const yearData = this.model.getYearData(year); // 12个月的数据
            
            // 统计全年
            let yInc = 0, yExp = 0;
            yearData.forEach(m => { yInc += m.inc; yExp += m.exp; });
            this.ui.renderStats(yInc, yExp);

            // 图表 (这里复用 barChart 显示每月净值)
            const monthlyNets = yearData.map(m => m.net);
            this.charts.render(yInc, yExp, monthlyNets, 12);

            // 网格
            this.ui.renderYearGrid(yearData);
        }
    }
}

new App();