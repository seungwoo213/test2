// 진동 감지 및 데시벨 측정을 위한 변수들
const vibrationCanvas = document.getElementById('vibrationCanvas');
const vibrationCtx = vibrationCanvas.getContext('2d');
const dbCanvas = document.getElementById('dbCanvas');
const dbCtx = dbCanvas.getContext('2d');
const vibrationValueElem = document.getElementById('vibrationValue');
const dbValueElem = document.getElementById('dbValue');
const statusElem = document.getElementById('status');

let vibrationData = [];
let dbData = [];
let maxDataPoints = 100; // 그래프에 표시할 최대 데이터 포인트 수
let vibrationThreshold = 15;  // 진동 감지 임계값 (진동이 이 값 이상일 때 감지)

// 진동 감지 관련 변수들
let accelerationX = 0, accelerationY = 0, accelerationZ = 0;
let audioContext, analyser, microphone, bufferLength, dataArray;

// 진동 감지 시작
function startVibrationDetection() {
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleDeviceMotion, false);
        statusElem.textContent = "상태: 진동 감지 중...";
    } else {
        statusElem.textContent = "이 브라우저는 DeviceMotionEvent를 지원하지 않습니다.";
    }
}

// DeviceMotionEvent 핸들러
function handleDeviceMotion(event) {
    // 가속도 센서에서 데이터를 가져옴
    accelerationX = event.acceleration.x;
    accelerationY = event.acceleration.y;
    accelerationZ = event.acceleration.z;

    // 진동을 감지하려면 가속도의 크기를 계산
    let accelerationMagnitude = Math.sqrt(accelerationX * accelerationX + accelerationY * accelerationY + accelerationZ * accelerationZ);

    // 진동 감지
    if (accelerationMagnitude > vibrationThreshold) {
        vibrationData.push(accelerationMagnitude);
    }

    // 데이터 포인트가 너무 많으면 초기화
    if (vibrationData.length > maxDataPoints) {
        vibrationData.shift();
    }

    // 진동 그래프 그리기
    drawVibrationGraph();

    // 진동 세기 표시
    vibrationValueElem.textContent = `진동 세기: ${accelerationMagnitude.toFixed(2)}`;
}

// 진동 그래프 그리기
function drawVibrationGraph() {
    vibrationCtx.clearRect(0, 0, vibrationCanvas.width, vibrationCanvas.height);
    const width = vibrationCanvas.width;
    const height = vibrationCanvas.height;
    const barWidth = width / vibrationData.length;
    const maxVibration = Math.max(...vibrationData);

    vibrationCtx.strokeStyle = 'rgb(50, 150, 255)';
    vibrationCtx.lineWidth = 2;
    vibrationCtx.beginPath();
    let x = 0;
    for (let i = 0; i < vibrationData.length; i++) {
        const barHeight = (vibrationData[i] / maxVibration) * height;
        const y = height - barHeight;
        if (i === 0) {
            vibrationCtx.moveTo(x, y);
        } else {
            vibrationCtx.lineTo(x, y);
        }
        x += barWidth;
    }
    vibrationCtx.stroke();
}

// 데시벨 측정 시작
function startDBMeasurement() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // 오디오 컨텍스트 생성
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();

                // 마이크로부터 입력을 받아 오디오 소스를 연결
                microphone = audioContext.createMediaStreamSource(stream);
                microphone.connect(analyser);

                // AnalyserNode 설정
                analyser.fftSize = 256;
                bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);

                // 데시벨 측정 시작
                drawDBGraph();
                statusElem.textContent = "상태: 데시벨 측정 중...";
            })
            .catch(err => {
                statusElem.textContent = "마이크 권한을 허용하지 않았습니다.";
                console.error("Error accessing microphone: ", err);
            });
    } else {
        statusElem.textContent = "이 브라우저는 getUserMedia를 지원하지 않습니다.";
    }
}

// 주파수 데이터 분석 후 그래프 그리기
function drawDBGraph() {
    analyser.getByteFrequencyData(dataArray);

    dbCtx.clearRect(0, 0, dbCanvas.width, dbCanvas.height);

    const barWidth = dbCanvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        let barHeight = dataArray[i];

        dbCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
        dbCtx.fillRect(x, dbCanvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }

    // 데시벨 계산 및 표시
    const dB = calculateDecibels(dataArray);
    dbValueElem.textContent = `데시벨: ${dB.toFixed(2)} dB`;

    requestAnimationFrame(drawDBGraph);
}

// 데시벨 계산 함수
function calculateDecibels(dataArray) {
    let sum = 0;
    let rms = 0;

    // 제곱합 계산
    for (let i = 0; i < dataArray.length; i++) {
        sum += Math.pow(dataArray[i] - 128, 2);  // 중앙값 128로 설정
    }

    // RMS (Root Mean Square) 계산
    rms = Math.sqrt(sum / dataArray.length);

    // rms 값이 너무 작거나 0일 경우 기본값 0으로 처리
    if (rms === 0) {
        return 0; // rms가 0일 경우, 데시벨 0으로 처리
    }

    // rms가 128보다 작으면, 128에 대한 비율을 계산하여 양의 값으로 출력
    let dB = 10 *20 * Math.log10(rms / 128);

    // dB 값이 NaN일 경우 0으로 설정
    if (isNaN(dB)) {
        dB = 0;
    }

    // dB 값이 음수로 나올 수 있기 때문에, 0보다 작은 값은 0으로 처리
    // 이 부분을 양수로 바꾸는 방법은 absolute값을 취하는 것입니다.
    return Math.abs(dB); // 양수로 반환
}

// 페이지 로드 후 진동 감지 및 데시벨 측정 시작
startVibrationDetection();
startDBMeasurement();
