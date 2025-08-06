// DOM要素の取得
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startCameraBtn = document.getElementById('startCamera');
const stopCameraBtn = document.getElementById('stopCamera');
const scanStatus = document.getElementById('scanStatus');
const scannedData = document.getElementById('scannedData');
const dataText = document.getElementById('dataText');
const qrInput = document.getElementById('qrInput');
const generateQRBtn = document.getElementById('generateQR');
const qrCode = document.getElementById('qrCode');
const downloadQRBtn = document.getElementById('downloadQR');
const copyQRBtn = document.getElementById('copyQR');

// QRコード生成オプションの要素
const qrSize = document.getElementById('qrSize');
const qrMargin = document.getElementById('qrMargin');
const qrErrorLevel = document.getElementById('qrErrorLevel');
const qrDarkColor = document.getElementById('qrDarkColor');
const qrLightColor = document.getElementById('qrLightColor');

// カメラ関連の変数
let stream = null;
let scanning = false;
let lastScannedData = '';

// カメラ開始
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // 背面カメラを優先
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        video.srcObject = stream;
        startCameraBtn.disabled = true;
        stopCameraBtn.disabled = false;
        scanStatus.textContent = 'カメラが開始されました。QRコードを読み取ってください';
        scanStatus.className = 'success';

        // ビデオが読み込まれたらスキャンを開始
        video.addEventListener('loadedmetadata', () => {
            startScanning();
        });

    } catch (error) {
        console.error('カメラの開始に失敗しました:', error);
        scanStatus.textContent = 'カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。';
        scanStatus.className = 'error';
    }
}

// カメラ停止
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    scanning = false;
    startCameraBtn.disabled = false;
    stopCameraBtn.disabled = true;
    scanStatus.textContent = 'カメラを開始してQRコードを読み取ってください';
    scanStatus.className = '';
    scannedData.style.display = 'none';
}

// QRコードスキャン開始
function startScanning() {
    if (!stream) return;

    scanning = true;
    scanFrame();
}

// QRコードスキャン処理
function scanFrame() {
    if (!scanning) return;

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // ビデオフレームをキャンバスに描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // キャンバスから画像データを取得
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // jsQRでQRコードを検出
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
    });

    if (code) {
        // QRコードが検出された場合
        if (code.data !== lastScannedData) {
            lastScannedData = code.data;
            handleQRCodeDetected(code.data);
        }
    } else {
        scanStatus.textContent = 'QRコードを検出中...';
        scanStatus.className = '';
    }

    // 次のフレームをスキャン
    requestAnimationFrame(scanFrame);
}

// QRコード検出時の処理
function handleQRCodeDetected(data) {
    scanStatus.textContent = 'QRコードを検出しました！';
    scanStatus.className = 'success';

    // 読み取り結果を表示
    dataText.textContent = data;
    scannedData.style.display = 'block';

    // 自動的にQRコード生成セクションに入力
    qrInput.value = data;

    // 自動的にQRコードを生成
    generateQRCode();

    // 成功音を再生（オプション）
    playSuccessSound();
}

// 成功音を再生
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.log('音声再生に失敗しました:', error);
    }
}

// QRコード生成
function generateQRCode() {
    const text = qrInput.value.trim();
    
    if (!text) {
        alert('テキストを入力してください');
        return;
    }
    
    // QRCodeライブラリの存在確認
    if (typeof QRCode === 'undefined') {
        alert('QRコード生成ライブラリが読み込まれていません。ページを再読み込みしてください。');
        return;
    }
    
    // 既存のQRコードをクリア
    qrCode.innerHTML = '';
    
    // オプション値を取得
    const size = parseInt(qrSize.value);
    const margin = parseInt(qrMargin.value);
    const errorLevel = qrErrorLevel.value;
    const darkColor = qrDarkColor.value;
    const lightColor = qrLightColor.value;
    
    // QRコードを生成
    QRCode.toCanvas(qrCode, text, {
        width: size,
        height: size,
        margin: margin,
        color: {
            dark: darkColor,
            light: lightColor
        },
        errorCorrectionLevel: errorLevel
    }, function (error) {
        if (error) {
            console.error('QRコード生成エラー:', error);
            alert('QRコードの生成に失敗しました');
        } else {
            // ボタンを有効化
            downloadQRBtn.disabled = false;
            copyQRBtn.disabled = false;
            
            // 成功メッセージ
            console.log('QRコードが生成されました');
        }
    });
}

// QRコードダウンロード
function downloadQRCode() {
    const canvas = qrCode.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'qr-code.png';
    link.href = canvas.toDataURL();
    link.click();
}

// QRコードをクリップボードにコピー
async function copyQRCode() {
    const canvas = qrCode.querySelector('canvas');
    if (!canvas) return;

    try {
        // CanvasをBlobに変換
        canvas.toBlob(async (blob) => {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
                alert('QRコードがクリップボードにコピーされました');
            } catch (error) {
                console.error('クリップボードへのコピーに失敗しました:', error);
                alert('クリップボードへのコピーに失敗しました');
            }
        });
    } catch (error) {
        console.error('QRコードのコピーに失敗しました:', error);
        alert('QRコードのコピーに失敗しました');
    }
}

// イベントリスナーの設定
startCameraBtn.addEventListener('click', startCamera);
stopCameraBtn.addEventListener('click', stopCamera);
generateQRBtn.addEventListener('click', generateQRCode);
downloadQRBtn.addEventListener('click', downloadQRCode);
copyQRBtn.addEventListener('click', copyQRCode);

// EnterキーでQRコード生成
qrInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateQRCode();
    }
});

// QRコードオプション変更時の自動再生成
function setupQRCodeOptions() {
    const options = [qrSize, qrMargin, qrErrorLevel, qrDarkColor, qrLightColor];

    options.forEach(option => {
        option.addEventListener('change', () => {
            // QRコードが既に生成されている場合のみ再生成
            if (qrCode.querySelector('canvas')) {
                generateQRCode();
            }
        });
    });
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    // カメラの利用可能性をチェック
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        scanStatus.textContent = 'お使いのブラウザはカメラ機能をサポートしていません';
        scanStatus.className = 'error';
        startCameraBtn.disabled = true;
    }

    // QRコード生成ライブラリの読み込み確認
    if (typeof QRCode === 'undefined') {
        console.error('QRCodeライブラリが読み込まれていません');
        // ライブラリが読み込まれていない場合でもボタンは有効のままにする
        // 実際の生成時にエラーハンドリングを行う
    }

    // QRコードオプションの設定
    setupQRCodeOptions();
});

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// エラーハンドリング
window.addEventListener('error', (e) => {
    console.error('アプリケーションエラー:', e.error);
});

// 未処理のPromise拒否をキャッチ
window.addEventListener('unhandledrejection', (e) => {
    console.error('未処理のPromise拒否:', e.reason);
}); 