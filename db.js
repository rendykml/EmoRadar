// EmoRadar DB Module: LocalStorage-based (can be extended to IndexedDB)
window.EmoDB = {
    KEY: 'emoRadarRecords',
    saveRecord(record) {
        const records = JSON.parse(localStorage.getItem(this.KEY) || '[]');
        records.push(record);
        localStorage.setItem(this.KEY, JSON.stringify(records));
    },
    async loadAll() {
        return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    },
    getWeeklyRecords() {
        const all = JSON.parse(localStorage.getItem(this.KEY) || '[]');
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return all.filter(r => new Date(r.time) >= weekAgo);
    },
    downloadWeekly(format) {
        const records = this.getWeeklyRecords();
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(records, null, 2)], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'emotional_report.json';
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'html') {
            let html = `<html><head><title>Emotional Report</title></head><body><h2>Weekly Emotional Report</h2><table border="1" cellpadding="6"><tr><th>Time</th><th>Text</th><th>Text Emotion</th><th>Image</th><th>Audio</th><th>Activity</th><th>Final</th></tr>`;
            records.forEach(r => {
                html += `<tr><td>${r.time}</td><td>${r.text}</td><td>${r.textEmotion}</td><td>${r.imageEmotion}</td><td>${r.audioEmotion}</td><td>${r.activityEmotion}</td><td>${r.finalEmotion}</td></tr>`;
            });
            html += '</table></body></html>';
            const blob = new Blob([html], {type:'text/html'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'emotional_report.html';
            a.click();
            URL.revokeObjectURL(url);
        }
    }
};
