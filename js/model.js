import { CONFIG } from './config.js';

export class DataModel {
    constructor() {
        this.data = { transactions: [], recurring: [] };
        this.sha = null; // GitHub 文件版本号
    }

    load(jsonData, sha) {
        this.data = jsonData || { transactions: [], recurring: [] };
        this.sha = sha;
    }

    // 添加记录
    addRecord(record) {
        record.id = Date.now();
        if (record.isRecurring) {
            this.data.recurring.push(record);
        } else {
            this.data.transactions.push(record);
        }
    }

    // 获取指定月份的所有日数据（合并普通收支和长期收支）
    getMonthData(year, month) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthData = new Array(daysInMonth).fill(null).map(() => ({ items: [], net: 0, inc: 0, exp: 0 }));

        // 1. 处理普通交易
        this.data.transactions.forEach(t => {
            const d = new Date(t.date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const dayIdx = d.getDate() - 1;
                this._addToStat(monthData[dayIdx], t);
            }
        });

        // 2. 处理长期分摊
        this.data.recurring.forEach(r => {
            const start = new Date(r.start);
            const end = new Date(r.end);
            
            // 简单的日期遍历
            for (let d = 1; d <= daysInMonth; d++) {
                const current = new Date(year, month, d);
                // 检查日期是否在范围内 (比较时间戳)
                if (current >= start && current <= end) {
                    this._addToStat(monthData[d-1], r, true);
                }
            }
        });

        return monthData;
    }

    // 辅助：计算单条数据对统计的影响
    _addToStat(dayObj, item, isRec = false) {
        const val = item.currency === 'USD' ? item.amount * CONFIG.DEFAULT_RATE : item.amount;
        
        dayObj.items.push({ ...item, isRecurring: isRec }); // 用于展示列表
        
        if (item.type === 'income') {
            dayObj.inc += val;
            dayObj.net += val;
        } else {
            dayObj.exp += val;
            dayObj.net -= val;
        }
    }
}