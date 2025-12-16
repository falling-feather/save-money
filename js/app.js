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
        
        // 初始化 UI 并传入回调
        this.ui = new UI({
            onAddRecord: (record) => this.handleAddRecord(record)
        });

        this.init();
    }

    init() {
        // 绑定顶部按钮
        document.getElementById('ghToken').value = this.api.token;
        document.getElementById('ghRepo').value = this.api.repo;
        
        document.getElementById('btnLoad').onclick = () => this.loadCloudData();
        document.getElementById('btnSave').onclick = () => this.saveCloudData();
        
        document.getElementById('btnPrevMonth').onclick = () => this.changeMonth(-1);
        document.getElementById('btnNextMonth').onclick = () => this.changeMonth(1);

        // 初始渲染
        this.refreshView();
    }

    async loadCloudData() {
        this.ui.toggleLoading(true);
        try {
            this.api.setCredentials(
                document.getElementById('ghToken').value,
                document.getElementById('ghRepo').value
            );
            const fileData = await this.api.fetchFile(CONFIG.FILE_NAME);
            if(fileData) {
                this.model.load(fileData.content, fileData.sha);
                alert('同步成功');
            } else {
                alert('未找到数据，已初始化新账本');
            }
            this.refreshView();
        } catch(e) {
            alert('同步失败: ' + e.message);
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

    changeMonth(offset) {
        this.currentDate.setMonth(this.currentDate.getMonth() + offset);
        this.refreshView();
    }

    refreshView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 1. 获取整理好的当月数据
        const monthData = this.model.getMonthData(year, month);
        
        // 2. 更新 Header
        this.ui.renderHeader(this.currentDate);
        
        // 3. 更新统计面板
        const stats = this.ui.renderStats(monthData);
        
        // 4. 更新图表
        this.charts.render(
            stats.tInc, 
            stats.tExp, 
            stats.dailyNets, 
            monthData.length
        );

        // 5. 更新日历
        this.ui.renderCalendar(year, month, monthData);
    }
}

// 启动应用
const app = new App();