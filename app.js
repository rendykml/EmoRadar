// EmoRadar Main App Logic
// Modular: Handles UI, fusion, chart, notifications

// ========== GLOBALS ========== //
let moodTimeline = [];
let moodChart = null;
let audioBlob = null;
let webcamStream = null;

// ========== UI ELEMENTS ========== //
const chatText = document.getElementById('chatText');
const imageUpload = document.getElementById('imageUpload');
const webcamBtn = document.getElementById('webcamBtn');
const webcam = document.getElementById('webcam');
const snapshotCanvas = document.getElementById('snapshotCanvas');
const audioUpload = document.getElementById('audioUpload');
const recordBtn = document.getElementById('recordBtn');
const audioPlayback = document.getElementById('audioPlayback');
const activityLog = document.getElementById('activityLog');
const analyzeBtn = document.getElementById('analyzeBtn');
const predictedEmotion = document.getElementById('predictedEmotion');
const suggestionPopup = document.getElementById('suggestionPopup');
const downloadJson = document.getElementById('downloadJson');
const downloadHtml = document.getElementById('downloadHtml');

// ========== ACTIVITY TRACKING ========== //
let keystrokes = 0;
let lastKeyTime = null;
let clickCount = 0;
let activityData = [];

chatText.addEventListener('keydown', () => {
    keystrokes++;
    lastKeyTime = Date.now();
    logActivity();
});
document.addEventListener('click', (e) => {
    clickCount++;
    logActivity();
});
function logActivity() {
    const now = new Date();
    activityData.push({
        time: now.toISOString(),
        keystrokes,
        clickCount
    });
    activityLog.textContent = `Keystrokes: ${keystrokes}, Clicks: ${clickCount}`;
}

// ========== WEBCAM SNAPSHOT ========== //
webcamBtn.addEventListener('click', async () => {
    if (!webcamStream) {
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
            webcam.srcObject = webcamStream;
            webcam.style.display = 'block';
        } catch (err) {
            alert('Webcam access denied.');
            return;
        }
    }
    setTimeout(() => {
        snapshotCanvas.width = webcam.videoWidth;
        snapshotCanvas.height = webcam.videoHeight;
        snapshotCanvas.getContext('2d').drawImage(webcam, 0, 0);
        webcam.style.display = 'none';
        snapshotCanvas.style.display = 'block';
        // Stop webcam
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }, 1200);
});

// ========== AUDIO RECORDING ========== //
let recorder = null;
let chunks = [];
recordBtn.addEventListener('click', async () => {
    if (!recorder) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recorder = new MediaRecorder(stream);
            chunks = [];
            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                audioBlob = new Blob(chunks, { type: 'audio/webm' });
                audioPlayback.src = URL.createObjectURL(audioBlob);
                audioPlayback.style.display = 'block';
            };
            recorder.start();
            recordBtn.textContent = 'Stop Recording';
        } catch (err) {
            alert('Audio recording denied.');
        }
    } else {
        recorder.stop();
        recorder = null;
        recordBtn.textContent = 'Record Audio';
    }
});

// ========== WINDSURF FUSION LOGIC ========== //
function analyzeTextEmotion(text) {
    // Simple keyword-based sentiment
    const pos = ['senang','baik','bagus','hebat','gembira','positif','happy','love','good','great'];
    const neg = ['sedih','buruk','jelek','marah','negatif','bad','hate','angry','sad'];
    let score = 0;
    pos.forEach(w => { if (text.toLowerCase().includes(w)) score++; });
    neg.forEach(w => { if (text.toLowerCase().includes(w)) score--; });
    if (score > 0) return 'Positive';
    if (score < 0) return 'Negative';
    return 'Neutral';
}
function analyzeImageEmotion(imgFileOrCanvas) {
    // Simulate: random or fixed (for demo)
    const emotions = ['Positive','Negative','Neutral'];
    return emotions[Math.floor(Math.random()*emotions.length)];
}
function analyzeAudioEmotion(audioFileOrBlob) {
    // Simulate: random or fixed (for demo)
    const emotions = ['Positive','Negative','Neutral'];
    return emotions[Math.floor(Math.random()*emotions.length)];
}
function analyzeActivityEmotion(keystrokes, clicks) {
    // Heuristic: high activity = positive, low = negative
    if (keystrokes + clicks > 20) return 'Positive';
    if (keystrokes + clicks < 5) return 'Negative';
    return 'Neutral';
}
function windsurfFusion({text, image, audio, activity}) {
    // Each: { value, weight }
    const weights = {text: 0.4, image: 0.3, audio: 0.2, activity: 0.1};
    const votes = {Positive:0, Negative:0, Neutral:0};
    votes[text] += weights.text;
    votes[image] += weights.image;
    votes[audio] += weights.audio;
    votes[activity] += weights.activity;
    // Find max
    let final = 'Neutral';
    let max = 0;
    for (let k in votes) {
        if (votes[k] > max) {
            max = votes[k];
            final = k;
        }
    }
    return final;
}

// ========== ANALYZE BUTTON ========== //
analyzeBtn.addEventListener('click', () => {
    // 1. Gather all inputs
    const text = chatText.value;
    let imageEmotion = 'Neutral';
    if (imageUpload.files[0]) {
        imageEmotion = analyzeImageEmotion(imageUpload.files[0]);
    } else if (snapshotCanvas.style.display === 'block') {
        imageEmotion = analyzeImageEmotion(snapshotCanvas);
    }
    let audioEmotion = 'Neutral';
    if (audioUpload.files[0]) {
        audioEmotion = analyzeAudioEmotion(audioUpload.files[0]);
    } else if (audioBlob) {
        audioEmotion = analyzeAudioEmotion(audioBlob);
    }
    const activityEmotion = analyzeActivityEmotion(keystrokes, clickCount);
    const textEmotion = analyzeTextEmotion(text);
    // 2. Fusion
    const finalEmotion = windsurfFusion({
        text: textEmotion,
        image: imageEmotion,
        audio: audioEmotion,
        activity: activityEmotion
    });
    predictedEmotion.textContent = finalEmotion;
    // 3. Add to mood timeline & DB
    const now = new Date();
    const record = {
        time: now.toISOString(),
        text, textEmotion,
        imageEmotion, audioEmotion, activityEmotion,
        finalEmotion
    };
    moodTimeline.push({x: now, y: finalEmotion});
    if (window.EmoDB) window.EmoDB.saveRecord(record);
    updateMoodChart();
    checkSuggestionPopup();
});

// ========== MOOD CHART ========== //
function updateMoodChart() {
    if (!moodChart) {
        const ctx = document.getElementById('moodChart').getContext('2d');
        moodChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Group Mood',
                    data: [],
                    borderColor: '#2d8cf0',
                    backgroundColor: 'rgba(45,140,240,0.07)',
                    tension: 0.22,
                    pointRadius: 4
                }]
            },
            options: {
                scales: {
                    y: {
                        type: 'category',
                        labels: ['Negative','Neutral','Positive']
                    }
                }
            }
        });
    }
    // Update chart data
    const labels = moodTimeline.map(r => new Date(r.x).toLocaleTimeString());
    const data = moodTimeline.map(r => r.y);
    moodChart.data.labels = labels;
    moodChart.data.datasets[0].data = data;
    moodChart.update();
}

// ========== SUGGESTION POPUP ========== //
function checkSuggestionPopup() {
    // If last 3 moods are negative, show suggestion
    if (moodTimeline.length < 3) return;
    const last3 = moodTimeline.slice(-3).map(r => r.y);
    const negCount = last3.filter(e => e === 'Negative').length;
    if (negCount >= 2) {
        showSuggestion(['Ambil napas dalam','Lakukan istirahat singkat','Coba tersenyum :)'][Math.floor(Math.random()*3)]);
    }
}
function showSuggestion(msg) {
    suggestionPopup.textContent = msg;
    suggestionPopup.style.display = 'block';
    setTimeout(() => {
        suggestionPopup.style.display = 'none';
    }, 7000);
}

// ========== DOWNLOAD REPORT ========== //
downloadJson.addEventListener('click', () => {
    if (window.EmoDB) {
        window.EmoDB.downloadWeekly('json');
    }
});
downloadHtml.addEventListener('click', () => {
    if (window.EmoDB) {
        window.EmoDB.downloadWeekly('html');
    }
});

// ========== INIT ========== //
window.addEventListener('DOMContentLoaded', () => {
    // Load previous records
    if (window.EmoDB) {
        window.EmoDB.loadAll().then(records => {
            records.forEach(r => {
                moodTimeline.push({x: r.time, y: r.finalEmotion});
            });
            updateMoodChart();
        });
    }
});

// ========== CHART.JS CDN LOADER ========== //
(function loadChartJs() {
    if (!window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => { if (moodTimeline.length) updateMoodChart(); };
        document.head.appendChild(script);
    }
})();
