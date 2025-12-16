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
        record.id = Date.now();
        if (record.isRecurring) {
            // 确保保存周期 (默认1即每天)
            record.cycle = parseInt(record.cycle) || 1; 
            this.data.recurring.push(record);
        } else {
            this.data.transactions.push(record);
        }
    }

    // === 通用：计算某一天是否命中周期 ===
    _isRecurringHit(r, targetDate) {
        const start = new Date(r.start);
        const end = new Date(r.end);
        
        // 1. 必须在时间范围内 (忽略时分秒)
        // 转为时间戳比较更安全，并处理时区偏差
        const tTime = targetDate.setHours(0,0,0,0);
        const sTime = start.setHours(0,0,0,0);
        const eTime = end.setHours(0,0,0,0);

        if (tTime < sTime || tTime > eTime) return false;

        // 2. 计算间隔
        const oneDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.round((tTime - sTime) / oneDay);
        
        // 3. 判断余数
        // 比如 cycle=7 (每周)，第0天(开始那天), 第7天, 第14天... 返回 true
        const cycle = r.cycle || 1; 
        return diffDays % cycle === 0;
    }

    // === 获取单月数据 (详细到每一天) ===
    getMonthData(year, month) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // 初始化当月每一天的空数据
        const monthData = new Array(daysInMonth).fill(null).map(() => ({ items: [], net: 0, inc: 0, exp: 0 }));

        // 1. 普通交易
        this.data.transactions.forEach(t => {
            const d = new Date(t.date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                this._addToStat(monthData[d.getDate() - 1], t);
            }
        });

        // 2. 周期交易 (升级版算法)
        this.data.recurring.forEach(r => {
            // 遍历当月每一天，检查是否命中周期
            for (let day = 1; day <= daysInMonth; day++) {
                const currentDayObj = new Date(year, month, day);
                if (this._isRecurringHit(r, currentDayObj)) {
                    this._addToStat(monthData[day - 1], r, true);
                }
            }
        });

        return monthData;
    }

    // === 获取全年数据 (聚合为12个月) ===
    getYearData(year) {
        const yearStats = new Array(12).fill(null).map(() => ({ inc: 0, exp: 0, net: 0 }));

        // 1. 普通交易
        this.data.transactions.forEach(t => {
            const d = new Date(t.date);
            if (d.getFullYear() === year) {
                this._addToMonthStat(yearStats[d.getMonth()], t);
            }
        });

        // 2. 周期交易 (需要按天遍历全年，计算量稍大但最准确)
        this.data.recurring.forEach(r => {
            const start = new Date(r.start);
            const end = new Date(r.end);
            
            // 优化：只遍历该任务涉及的年份
            // 如果任务只在今年，就只遍历今年；如果跨年，截取今年的部分
            const loopStart = start.getFullYear() < year ? new Date(year, 0, 1) : start;
            const loopEnd = end.getFullYear() > year ? new Date(year, 11, 31) : end;

            if (loopStart > loopEnd) return; // 没交集

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