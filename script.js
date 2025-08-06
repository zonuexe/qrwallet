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

// 履歴関連の要素
const saveToHistoryBtn = document.getElementById('saveToHistory');
const clearHistoryBtn = document.getElementById('clearHistory');
const shareHistoryBtn = document.getElementById('shareHistory');
const historyList = document.getElementById('historyList');

// カメラ関連の変数
let stream = null;
let scanning = false;
let lastScannedData = '';

// 履歴関連の変数
let qrHistory = [];
let currentQRData = null;

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

    // 履歴に保存可能にする
    currentQRData = data;
    saveToHistoryBtn.disabled = false;

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

    // Canvas要素を作成
    const canvas = document.createElement('canvas');
    qrCode.appendChild(canvas);

    // QRコードを生成
    QRCode.toCanvas(canvas, text, {
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

// 履歴に保存
function saveToHistory() {
    if (!currentQRData) return;

    const historyItem = {
        id: Date.now(),
        data: currentQRData,
        timestamp: new Date().toLocaleString('ja-JP'),
        date: new Date()
    };

    qrHistory.unshift(historyItem);
    updateHistoryDisplay();
    updateURL();

    // 履歴に保存ボタンを無効化
    saveToHistoryBtn.disabled = true;

    console.log('履歴に保存されました:', historyItem);
}

// 履歴をクリア
function clearHistory() {
    if (confirm('履歴をすべて削除しますか？')) {
        qrHistory = [];
        updateHistoryDisplay();
        updateURL();
        console.log('履歴をクリアしました');
    }
}

// 履歴表示を更新
function updateHistoryDisplay() {
    if (qrHistory.length === 0) {
        historyList.innerHTML = '<div class="history-empty">履歴がありません</div>';
        shareHistoryBtn.disabled = true;
        return;
    }

    shareHistoryBtn.disabled = false;
    historyList.innerHTML = qrHistory.map(item => `
        <div class="history-item" data-id="${item.id}">
            <div class="history-item-content">
                <div class="history-item-text">${escapeHtml(item.data)}</div>
                <div class="history-item-timestamp">${item.timestamp}</div>
            </div>
            <div class="history-item-actions">
                <button class="btn-regenerate" onclick="regenerateFromHistory('${item.id}')">再生成</button>
                <button class="btn-copy" onclick="copyHistoryItem('${item.id}')">コピー</button>
                <button class="btn-delete" onclick="deleteHistoryItem('${item.id}')">削除</button>
            </div>
        </div>
    `).join('');
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 履歴から再生成
function regenerateFromHistory(id) {
    const item = qrHistory.find(item => item.id == id);
    if (item) {
        qrInput.value = item.data;
        generateQRCode();
        currentQRData = item.data;
        saveToHistoryBtn.disabled = false;
    }
}

// 履歴アイテムをコピー
async function copyHistoryItem(id) {
    const item = qrHistory.find(item => item.id == id);
    if (item) {
        try {
            await navigator.clipboard.writeText(item.data);
            alert('テキストがクリップボードにコピーされました');
        } catch (error) {
            console.error('コピーに失敗しました:', error);
            alert('コピーに失敗しました');
        }
    }
}

// 履歴アイテムを削除
function deleteHistoryItem(id) {
    qrHistory = qrHistory.filter(item => item.id != id);
    updateHistoryDisplay();
    updateURL();
}

// URLを更新（履歴をXZ圧縮してエンコード）
function updateURL() {
    if (qrHistory.length === 0) {
        // 履歴がない場合はURLパラメータを削除
        const url = new URL(window.location);
        url.searchParams.delete('history');
        window.history.replaceState({}, '', url);
        return;
    }

    try {
        // 履歴データをJSONに変換
        const historyData = qrHistory.map(item => ({
            d: item.data,
            t: item.timestamp
        }));

        const jsonData = JSON.stringify(historyData);

        // Base64エンコード（簡易的な圧縮として）
        const encodedData = btoa(unescape(encodeURIComponent(jsonData)));

        // URLに設定
        const url = new URL(window.location);
        url.searchParams.set('history', encodedData);
        window.history.replaceState({}, '', url);

        console.log('URLを更新しました');
    } catch (error) {
        console.error('URL更新エラー:', error);
    }
}

// URLから履歴を読み込み
function loadHistoryFromURL() {
    const url = new URL(window.location);
    const encodedData = url.searchParams.get('history');

    if (!encodedData) return;

    try {
        // Base64デコード
        const jsonData = decodeURIComponent(escape(atob(encodedData)));
        const historyData = JSON.parse(jsonData);

        // 履歴を復元
        qrHistory = historyData.map(item => ({
            id: Date.now() + Math.random(),
            data: item.d,
            timestamp: item.t,
            date: new Date()
        }));

        updateHistoryDisplay();
        console.log('URLから履歴を読み込みました:', qrHistory.length, '件');
    } catch (error) {
        console.error('履歴読み込みエラー:', error);
    }
}

// イベントリスナーの設定
startCameraBtn.addEventListener('click', startCamera);
stopCameraBtn.addEventListener('click', stopCamera);
generateQRBtn.addEventListener('click', generateQRCode);
downloadQRBtn.addEventListener('click', downloadQRCode);
copyQRBtn.addEventListener('click', copyQRCode);

// 履歴関連のイベントリスナー
saveToHistoryBtn.addEventListener('click', saveToHistory);
clearHistoryBtn.addEventListener('click', clearHistory);
shareHistoryBtn.addEventListener('click', () => {
    // 現在のURLをクリップボードにコピー
    navigator.clipboard.writeText(window.location.href).then(() => {
        alert('URLがクリップボードにコピーされました');
    }).catch(() => {
        alert('URLのコピーに失敗しました');
    });
});

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
    checkQRCodeLibrary();

    // QRコードオプションの設定
    setupQRCodeOptions();

    // URLから履歴を読み込み
    loadHistoryFromURL();
});

// QRCodeライブラリの読み込み確認
function checkQRCodeLibrary() {
    if (typeof QRCode === 'undefined') {
        console.error('QRCodeライブラリが読み込まれていません');
        // 少し待ってから再チェック
        setTimeout(() => {
            if (typeof QRCode === 'undefined') {
                console.error('QRCodeライブラリの読み込みに失敗しました');
                generateQRBtn.disabled = true;
                generateQRBtn.textContent = 'ライブラリ読み込みエラー';
            } else {
                console.log('QRCodeライブラリが正常に読み込まれました');
                generateQRBtn.disabled = false;
                generateQRBtn.textContent = 'QRコード生成';
            }
        }, 1000);
    } else {
        console.log('QRCodeライブラリが正常に読み込まれました');
    }
}

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