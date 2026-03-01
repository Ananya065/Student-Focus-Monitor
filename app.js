class FocusDetectionSystem {
    constructor() {
        this.model = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.isCalibrating = false;
        this.demoMode = false;
        
        // Attention tracking
        this.attentionScore = 0;
        this.attentionHistory = [];
        this.lastDetection = null;
        this.previousFace = null;
        
        // Settings
        this.settings = {
            sensitivity: 'medium',
            alertThreshold: 40,
            smoothing: 5
        };
        
        // Chart
        this.chart = null;
        
        // Demo data
        this.demoScenarios = {
            focused: { baseScore: 90, variance: 5, movement: 'stable' },
            distracted: { baseScore: 40, variance: 15, movement: 'erratic' },
            phone: { baseScore: 20, variance: 8, movement: 'downward' }
        };
        
        this.currentDemoScenario = null;
        this.demoInterval = null;
        
        this.init();
    }
    
    async init() {
        this.setupDOM();
        this.updateSettingsUI();
        this.setupChart();
        this.setupEventListeners();
    }
    
    setupDOM() {
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('overlay');
        this.ctx = this.canvas.getContext('2d');
        
        // Update canvas size when video loads
        this.video.addEventListener('loadedmetadata', () => {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
        });
    }
    
    async loadModel() {
        try {
            this.updateLoadingProgress(20, 'Loading TensorFlow.js...');
            await tf.ready();
            
            this.updateLoadingProgress(60, 'Loading BlazeFace model...');
            this.model = await blazeface.load();
            
            this.updateLoadingProgress(100, 'Model loaded successfully!');
            setTimeout(() => {
                this.hideModal('loadingModal');
            }, 1000);
            return true;
        } catch (error) {
            this.updateLoadingProgress(0, 'Failed to load AI models. Please refresh the page.');
            return false;
        }
    }
    
    updateLoadingProgress(percent, text) {
        document.getElementById('loadingProgress').style.width = `${percent}%`;
        document.getElementById('loadingText').textContent = text;
    }
    
    updateSettingsUI() {
        document.getElementById('sensitivity').value = this.settings.sensitivity;
        document.getElementById('alertThreshold').value = this.settings.alertThreshold;
        document.getElementById('smoothing').value = this.settings.smoothing;
        document.getElementById('thresholdValue').textContent = `${this.settings.alertThreshold}%`;
        document.getElementById('smoothingValue').textContent = this.settings.smoothing;
    }
    
    setupChart() {
        const ctx = document.getElementById('attentionChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(60).fill('').map((_, i) => i - 59),
                datasets: [{
                    label: 'Attention Score',
                    data: Array(60).fill(0),
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { beginAtZero: true, max: 100, ticks: { stepSize: 25 } }
                },
                elements: { point: { radius: 0 } }
            }
        });
    }
    
    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startDetection());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopDetection());
        document.getElementById('calibrateBtn').addEventListener('click', () => this.showCalibration());
        document.getElementById('demoBtn').addEventListener('click', () => this.toggleDemo());
    
        document.getElementById('sensitivity').addEventListener('change', (e) => {
            this.settings.sensitivity = e.target.value;
            this.updateSettingsUI();
        });
        document.getElementById('alertThreshold').addEventListener('input', (e) => {
            this.settings.alertThreshold = parseInt(e.target.value);
            document.getElementById('thresholdValue').textContent = `${this.settings.alertThreshold}%`;
        });
        document.getElementById('smoothing').addEventListener('input', (e) => {
            this.settings.smoothing = parseInt(e.target.value);
            document.getElementById('smoothingValue').textContent = this.settings.smoothing;
        });

        document.querySelectorAll('.demo-scenario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scenario = e.currentTarget.dataset.scenario;
                this.runDemoScenario(scenario);
            });
        });

        const dismissAlert = document.getElementById('dismissAlert');
        if (dismissAlert) {
            dismissAlert.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('alertModal');
            });
        }
        const startCalibration = document.getElementById('startCalibration');
        if (startCalibration) {
            startCalibration.addEventListener('click', (e) => {
                e.preventDefault();
                this.startCalibration();
            });
        }
        const skipCalibration = document.getElementById('skipCalibration');
        if (skipCalibration) {
            skipCalibration.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('calibrationModal');
            });
        }
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                const modal = e.target.parentElement;
                if (modal && modal.classList.contains('modal')) {
                    this.hideModal(modal.id);
                }
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.modal:not(.hidden)');
                openModals.forEach(modal => {
                    this.hideModal(modal.id);
                });
            }
        });
    }

    async startDetection() {
        this.showModal('loadingModal');
        if (!this.model) {
            const loaded = await this.loadModel();
            if (!loaded) {
                this.hideModal('loadingModal');
                alert('Failed to load AI models. Please refresh the page and try again.');
                return;
            }
        } else {
            this.hideModal('loadingModal');
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } });
            this.video.srcObject = stream;
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    resolve();
                };
            });
            this.isRunning = true;
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            this.updateDetectionStatus('Camera Active - Face Detection Running', 'success');
            this.detectionLoop();
        } catch (error) {
            this.hideModal('loadingModal');
            alert('Camera access is required for face detection. Please allow camera permissions and try again.');
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
        }
    }

    stopDetection() {
        this.isRunning = false;
        this.demoMode = false;
        if (this.demoInterval) {
            clearInterval(this.demoInterval);
            this.demoInterval = null;
        }
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        this.updateDetectionStatus('Camera Stopped', 'warning');
        this.updateFaceStatus('No Face', 'error');
        this.updatePoseStatus('Unknown', 'info');
        this.updateAttentionStatus('Inactive', 'warning');
        this.updateAttentionScore(0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        document.getElementById('demoBtn').textContent = 'Demo Mode';
        document.getElementById('demoBtn').classList.remove('btn--primary');
        document.getElementById('demoBtn').classList.add('btn--outline');
        document.querySelectorAll('.demo-scenario-btn').forEach(btn => {
            btn.style.background = '';
            btn.style.color = '';
        });
    }

    async detectionLoop() {
        if (!this.isRunning) return;
        if (this.demoMode) { this.processDemoMode(); }
        else { await this.processRealDetection(); }
        this.updateChart();
        setTimeout(() => this.detectionLoop(), 500);
    }

    async processRealDetection() {
        if (this.video.readyState < 2) return;
        try {
            const predictions = await this.model.estimateFaces(this.video, false);
            if (predictions.length > 0) {
                const face = predictions[0];
                this.lastDetection = Date.now();
                const score = this.calculateAttentionScore(face);
                this.updateAttentionScore(score);
                this.drawFaceDetection(face, score);
                this.updateFaceStatus('Face Detected', 'success');
                this.updatePoseStatus(this.getHeadPose(face), 'success');
                this.updateAttentionStatusByScore(score);
                this.handleAlerts(score);
            } else {
                this.updateAttentionScore(0);
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.updateFaceStatus('No Face', 'error');
                this.updatePoseStatus('Unknown', 'info');
                this.updateAttentionStatus('Not Detected', 'error');
            }
        } catch (error) {
            // Detection error
        }
    }

    processDemoMode() {
        if (!this.currentDemoScenario) return;
        const scenario = this.demoScenarios[this.currentDemoScenario];
        const variance = (Math.random() - 0.5) * scenario.variance;
        const score = Math.max(0, Math.min(100, scenario.baseScore + variance));
        this.updateAttentionScore(score);
        this.updateFaceStatus('Demo Face', 'info');
        this.updatePoseStatus(this.getDemoPose(scenario.movement), 'info');
        this.updateAttentionStatusByScore(score);
        this.drawDemoVisualization(scenario);
        this.handleAlerts(score);
    }

    calculateAttentionScore(face) {
        let score = 0;
        // Face detection confidence (40%)
        const confidence = face.probability ? face.probability[0] : 0.8;
        score += confidence * 40;
        // Head orientation (30%)
        const poseInfo = this.analyzeHeadPose(face);
        score += poseInfo.attentionBonus;
        // Movement stability (20%)
        const stability = this.calculateStability(face);
        score += stability * 20;
        // Time factors (10%)
        score -= this.calculateTimePenalty();
        // Sensitivity
        score = this.applySensitivityAdjustment(score);
        return Math.max(0, Math.min(100, score));
    }

    analyzeHeadPose(face) {
        const landmarks = face.landmarks;
        if (!landmarks || landmarks.length < 6) { return { attentionBonus: 15, pose: 'Forward' }; }
        const leftEye = landmarks[0];
        const rightEye = landmarks[1];
        const eyeDistance = Math.abs(leftEye[0] - rightEye[0]);
        const expectedDistance = 60; // Baseline for frontal
        const distanceRatio = eyeDistance / expectedDistance;
        let attentionBonus = 0;
        let pose = 'Forward';
        if (distanceRatio > 0.8) { attentionBonus = 30; pose = 'Forward'; }
        else if (distanceRatio > 0.5) { attentionBonus = 20; pose = 'Slightly Turned'; }
        else { attentionBonus = 5; pose = 'Turned Away'; }
        return { attentionBonus, pose };
    }
    
    calculateStability(face) {
        if (!this.previousFace) {
            this.previousFace = face;
            return 0.5;
        }
        const c = face.topLeft;
        const p = this.previousFace.topLeft;
        const movement = Math.sqrt(Math.pow(c[0]-p[0],2) + Math.pow(c[1]-p[1],2));
        this.previousFace = face;
        return Math.max(0, 1 - (movement/50));
    }
    
    calculateTimePenalty() {
        const now = Date.now();
        if (!this.lastDetection) return 0;
        const timeSince = now - this.lastDetection;
        return timeSince > 5000 ? 10 : 0;
    }
    
    applySensitivityAdjustment(score) {
        switch(this.settings.sensitivity) {
            case 'low': return score * 1.2;
            case 'high': return score * 0.8;
            default: return score;
        }
    }
    
    updateAttentionScore(newScore) {
        const smoothed = this.smoothScore(newScore);
        const oldScore = this.attentionScore;
        this.attentionScore = Math.round(smoothed);
        const scoreElement = document.getElementById('attentionScore');
        scoreElement.textContent = this.attentionScore;
        if (this.attentionScore > oldScore) {
            scoreElement.classList.add('score-increase');
        } else if (this.attentionScore < oldScore) {
            scoreElement.classList.add('score-decrease');
        }
        setTimeout(() => {
            scoreElement.classList.remove('score-increase','score-decrease');
        }, 500);
        this.attentionHistory.push({ timestamp: Date.now(), score: this.attentionScore });
        // keep last 60s
        const cutoff = Date.now() - 60000;
        this.attentionHistory = this.attentionHistory.filter(h => h.timestamp > cutoff);
    }
    
    smoothScore(newScore) {
        if (this.attentionHistory.length === 0) return newScore;
        const smoothingFactor = this.settings.smoothing / 10;
        const lastScore = this.attentionScore;
        return lastScore * (1 - smoothingFactor) + newScore * smoothingFactor;
    }
    
    drawFaceDetection(face, score) {
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        const [x, y] = face.topLeft;
        const [x2, y2] = face.bottomRight;
        const width = x2 - x;
        const height = y2 - y;
        let color = '#1FB8CD';
        if (score < 30) color = '#FF5459';
        else if (score < 60) color = '#FFC185';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.fillStyle = color;
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`${Math.round(score)}%`, x, y - 10);
        if (face.landmarks) {
            this.ctx.fillStyle = color;
            face.landmarks.forEach(pt => {
                this.ctx.beginPath();
                this.ctx.arc(pt[0],pt[1],3,0,2*Math.PI);
                this.ctx.fill();
            });
        }
    }

    drawDemoVisualization(scenario) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const faceSize = 100;
        let color = '#1FB8CD';
        if (scenario.baseScore < 30) color = '#FF5459';
        else if (scenario.baseScore < 60) color = '#FFC185';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(centerX-faceSize/2, centerY-faceSize/2, faceSize, faceSize);
        this.ctx.fillStyle = color;
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DEMO MODE', centerX, centerY-faceSize/2-20);
        this.ctx.fillText(`${Math.round(this.attentionScore)}%`, centerX, centerY+faceSize/2+20);
    }
    
    getHeadPose(face) {
        const pose = this.analyzeHeadPose(face);
        return pose.pose;
    }
    
    getDemoPose(movement) {
        switch(movement) {
            case 'stable': return 'Forward';
            case 'erratic': return 'Looking Around';
            case 'downward': return 'Looking Down';
            default: return 'Unknown';
        }
    }
    
    updateChart() {
        if (!this.chart) return;
        const data = Array(60).fill(0);
        const now = Date.now();
        this.attentionHistory.forEach(entry => {
            const secondsAgo = Math.floor((now-entry.timestamp)/1000);
            if (secondsAgo < 60) {
                data[59-secondsAgo]=entry.score;
            }
        });
        this.chart.data.datasets[0].data = data;
        this.chart.update('none');
    }

    handleAlerts(score) {
        if (score < this.settings.alertThreshold) {
            if (!this.alertTimeout) {
                this.alertTimeout = setTimeout(() => {
                    this.showAlert('Low Attention Detected', 'Student attention has been below threshold for an extended period.');
                    this.alertTimeout = null;
                }, 3000); // Show alert if sustained below threshold
            }
        } else {
            if (this.alertTimeout) {
                clearTimeout(this.alertTimeout);
                this.alertTimeout = null;
            }
        }
    }
    showAlert(title, message) {
        document.getElementById('alertTitle').textContent = title;
        document.getElementById('alertMessage').textContent = message;
        this.showModal('alertModal');
    }
    updateDetectionStatus(text, type) {
        const element = document.getElementById('detectionStatus');
        element.innerHTML = `<span class="status status--${type}">${text}</span>`;
    }
    updateFaceStatus(text, type) {
        const el = document.getElementById('faceStatus');
        el.className = `status status--${type}`;
        el.textContent = text;
    }
    updatePoseStatus(text, type) {
        const el = document.getElementById('poseStatus');
        el.className = `status status--${type}`;
        el.textContent = text;
    }
    updateAttentionStatus(text, type) {
        const el = document.getElementById('attentionStatus');
        el.className = `status status--${type}`;
        el.textContent = text;
    }
    updateAttentionStatusByScore(score) {
        if (score >= 70) {
            this.updateAttentionStatus('Focused', 'focused');
        } else if (score >= 40) {
            this.updateAttentionStatus('Moderate', 'warning');
        } else {
            this.updateAttentionStatus('Distracted', 'distracted');
        }
        const scoreStatus = document.getElementById('scoreStatus');
        if (score >= 70) {
            scoreStatus.innerHTML = '<span class="status status--focused">Excellent Focus</span>';
        } else if (score >= 40) {
            scoreStatus.innerHTML = '<span class="status status--warning">Moderate Focus</span>';
        } else {
            scoreStatus.innerHTML = '<span class="status status--distracted">Low Focus</span>';
        }
    }
    showCalibration() { this.showModal('calibrationModal'); }
    async startCalibration() {
        this.isCalibrating = true;
        let progress = 0;
        const progressBar = document.getElementById('calibrationProgress');
        const progressText = document.getElementById('calibrationText');
        const calibrationSteps = [
            'Look directly at the camera...',
            'Keep your head still...',
            'Calibrating head pose detection...',
            'Optimizing attention algorithms...',
            'Calibration complete!'
        ];
        for (let i = 0; i < calibrationSteps.length; i++) {
            progressText.textContent = calibrationSteps[i];
            progress = ((i+1) / calibrationSteps.length) * 100;
            progressBar.style.width = `${progress}%`;
            await new Promise(res=>setTimeout(res,1000));
        }
        this.isCalibrating = false;
        this.hideModal('calibrationModal');
    }
    toggleDemo() {
        this.demoMode = !this.demoMode;
        const btn = document.getElementById('demoBtn');
        if (this.demoMode) {
            btn.textContent='Exit Demo';
            btn.classList.add('btn--primary');
            btn.classList.remove('btn--outline');
            if (!this.isRunning) {
                this.isRunning=true;
                document.getElementById('startBtn').disabled=true;
                document.getElementById('stopBtn').disabled=false;
                this.updateDetectionStatus('Demo Mode Active','info');
                this.detectionLoop();
            }
        } else {
            btn.textContent='Demo Mode';
            btn.classList.remove('btn--primary');
            btn.classList.add('btn--outline');
            this.currentDemoScenario=null;
            document.querySelectorAll('.demo-scenario-btn').forEach(btn => {
                btn.style.background = '';
                btn.style.color = '';
            });
        }
    }
    runDemoScenario(scenario) {
        this.currentDemoScenario = scenario;
        if (!this.demoMode) { this.toggleDemo(); }
        document.querySelectorAll('.demo-scenario-btn').forEach(btn => {
            btn.style.background = '';
            btn.style.color = '';
        });
        const selectedBtn = document.querySelector(`[data-scenario="${scenario}"]`);
        if (selectedBtn) {
            selectedBtn.style.background = 'var(--color-primary)';
            selectedBtn.style.color = 'var(--color-btn-primary-text)';
        }
    }
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) { modal.classList.remove('hidden'); }
    }
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) { modal.classList.add('hidden'); }
    }
}

document.addEventListener('DOMContentLoaded',()=>{
    new FocusDetectionSystem();
});
