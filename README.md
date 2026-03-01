<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:6C63FF,100:9B5DE5&height=200&section=header&text=AI%20Student%20Focus%20Monitor&fontSize=35&fontColor=ffffff&animation=fadeIn" />
</p>

<p align="center">
  <b>🧠 Real-Time Attention Detection • 🔒 Privacy First • ⚡ Browser-Based AI</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI-TensorFlow.js-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white"/>
  <img src="https://img.shields.io/badge/Model-BlazeFace-6A1B9A?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Frontend-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
  <img src="https://img.shields.io/badge/Privacy-100%25%20Client%20Side-00C853?style=for-the-badge"/>
</p>

---

# 🧠 AI Student Focus Monitor

> ⚡ “Focus is a superpower. Let’s measure it.”

AI Student Focus Monitor is a real-time browser-based behavioral AI system that estimates attention levels using facial detection and movement analysis — fully client-side.

No backend.  
No data storage.  
No tracking.  

Everything runs inside your browser.

---

## 🚀 Features

### 👁 Real-Time Face Detection
- Webcam-based detection  
- Facial landmark tracking  
- Live bounding box overlay  

### 🧭 Head Pose Estimation
- Eye-distance ratio logic  
- Orientation classification:
  - Forward  
  - Slightly Turned  
  - Turned Away  

### 📊 Smart Attention Scoring
Weighted behavioral model:

- Face Confidence → 40%  
- Head Orientation → 30%  
- Stability → 20%  
- Time Penalty → 10%  

Smoothed using moving average for stable results.

---

## 📈 Live Attention Graph
- 60-second rolling visualization  
- Real-time updates  
- Dynamic scoring feedback  

---

## ⚠ Smart Alerts
- Triggered when attention stays below threshold  
- Sustained detection (3 seconds logic)  
- Adjustable sensitivity levels  

---

## 🏗 System Architecture

Webcam Stream
↓
Face Detection
↓
Head Pose Analysis
↓
Movement Stability
↓
Attention Scoring Engine
↓
Smoothing Layer
↓
Live Graph + Alerts


---

## 🛠 Tech Stack

- TensorFlow.js  
- BlazeFace  
- Chart.js  
- HTML5 Canvas  
- Vanilla JavaScript  

---

## 🔐 Privacy First

✔ 100% Client-Side Processing  
✔ No video stored  
✔ No server communication  
✔ No user tracking  

---

## 🎯 Use Cases

- Classroom engagement monitoring  
- Self-study productivity tracking  
- Online assessment supervision (prototype)  
- Behavioral AI experimentation  
- EdTech innovation  

---

## 🧪 Future Upgrades

- Eye gaze tracking  
- Advanced face mesh integration  
- Phone detection via object detection  
- Personalized baseline calibration  
- Focus heatmaps  

---

## 📦 Installation

```bash
git clone https://github.com/your-username/ai-student-focus-monitor.git
```
