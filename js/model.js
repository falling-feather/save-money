import { CONFIG } from './config.js';

export class DataModel {
    constructor() {
        this.data = { transactions: [], recurring: [] };
        this.sha = null;
    }

    load(jsonData, sha) {
        this.data = jsonData || { transactions: [], recurring: [] };
        this.sha = sha;
    }

    addRecord(record) {
        // 如果没有ID则生成，有ID（修改模式）则沿用
        if (!record.id) record.id = Date.now();
        
        if (record.isRecurring) {
            record.cycle = parseInt(record.cycle) || 1; 
            this.data.recurring.push(record);
        } else {
            this.data.transactions.push(record);
        }
    }

    deleteRecord(id, isRecurring) {
        const targetId = Number(id); 
        if (isRecurring) {
            this.data.recurring = this.data.recurring.filter(item => item.id !== targetId);
        } else {
            this.data.transactions = this.data.transactions.filter(item => item.id !== targetId);
        }
    }

    // === 新增：更新记录 ===
    updateRecord(record) {
        // 1. 先删除旧的 (根据ID)
        this.deleteRecord(record.id, record.isRecurring);
        // 2. 再添加新的
        this.addRecord(record);
    }

    // === 辅助：通过ID获取记录 ===
    getRecordById(id) {
        id = Number(id);
        let found = this.data.transactions.find(t => t.id === id);
        if (found) return { ...found, isRecurring: false };
        
        found = this.data.recurring.find(r => r.id === id);
        if (found) return { ...found, isRecurring: true };
        
        return null;
    }

    // ... (以下代码保持不变：getMonthData, getYearData, _isRecurringHit 等) ...
    // ... 请务必保留原来的查询逻辑 ...
    
    _isRecurringHit(r, targetDate) {
        const start = new Date(r.start);
        const end = new Date(r.end);
        const tTime = targetDate.setHours(0,0,0,0);
        const sTime = start.setHours(0,0,0,0);
        const eTime = end.setHours(0,0,0,0);
        if (tTime < sTime || tTime > eTime) return false;
        const oneDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.round((tTime - sTime) / oneDay);
        const cycle = r.cycle || 1; 
        return diffDays % cycle === 0;
    }

    getMonthData(year, month) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthData = new Array(daysInMonth).fill(null).map(() => ({ items: [], net: 0, inc: 0, exp: 0 }));

        this.data.transactions.forEach(t => {
            const d = new Date(t.date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                this._addToStat(monthData[d.getDate() - 1], t);
            }
        });

        this.data.recurring.forEach(r => {
            for (let day = 1; day <= daysInMonth; day++) {
                const currentDayObj = new Date(year, month, day);
                if (this._isRecurringHit(r, currentDayObj)) {
                    this._addToStat(monthData[day - 1], r, true);
                }
            }
        });
        return monthData;
    }

    getYearData(year) {
        const yearStats = new Array(12).fill(null).map(() => ({ inc: 0, exp: 0, net: 0 }));
        this.data.transactions.forEach(t => {
            const d = new Date(t.date);
            if (d.getFullYear() === year) {
                this._addToMonthStat(yearStats[d.getMonth()], t);
            }
        });
        this.data.recurring.forEach(r => {
            const start = new Date(r.start);
            const end = new Date(r.end);
            const loopStart = start.getFullYear() < year ? new Date(year, 0, 1) : start;
            const loopEnd = end.getFullYear() > year ? new Date(year, 11, 31) : end;
            if (loopStart > loopEnd) return; 
            for (let d = new Date(loopStart); d <= loopEnd; d.setDate(d.getDate() + 1)) {
                if (d.getFullYear() !== year) continue; 
                if (this._isRecurringHit(r, new Date(d))) {
                    this._addToMonthStat(yearStats[d.getMonth()], r);
                }
            }
        });
        return yearStats;
    }

    _addToStat(dayObj, item, isRec = false) {
        const val = item.currency === 'USD' ? item.amount * CONFIG.DEFAULT_RATE : item.amount;
        dayObj.items.push({ ...item, isRecurring: isRec }); 
        if (item.type === 'income') { dayObj.inc += val; dayObj.net += val; }
        else { dayObj.exp += val; dayObj.net -= val; }
    }

    _addToMonthStat(monthObj, item) {
        const val = item.currency === 'USD' ? item.amount * CONFIG.DEFAULT_RATE : item.amount;
        if (item.type === 'income') { monthObj.inc += val; monthObj.net += val; }
        else { monthObj.exp += val; monthObj.net -= val; }
    }
}