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
        // 音声再生エラーは無視
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
            alert('QRコードの生成に失敗しました');
        } else {
            // ボタンを有効化
            downloadQRBtn.disabled = false;
            copyQRBtn.disabled = false;

            // 履歴保存ボタンを有効化
            if (text) {
                currentQRData = text;
                saveToHistoryBtn.disabled = false;
            }

            // 成功メッセージ
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
                alert('クリップボードへのコピーに失敗しました');
            }
        });
    } catch (error) {
        alert('QRコードのコピーに失敗しました');
    }
}

// 履歴に保存
function saveToHistory() {
    if (!currentQRData) return;

    qrHistory.unshift(currentQRData);
    updateHistoryDisplay();
    updateURL();

    // 履歴に保存ボタンを無効化
    saveToHistoryBtn.disabled = true;

    // 圧縮情報を表示
    showCompressionInfo();
}

// 圧縮情報を表示
function showCompressionInfo() {
    const url = new URL(window.location);
    const historyParam = url.search.substring(1); // ?を除いた部分

    if (historyParam) {
        const originalSize = JSON.stringify(qrHistory).length;
        const compressedSize = historyParam.length;
        const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);


    }
}

// 履歴をクリア
function clearHistory() {
    if (confirm('履歴をすべて削除しますか？')) {
        qrHistory = [];
        updateHistoryDisplay();
        updateURL();
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
    historyList.innerHTML = qrHistory.map((item, index) => `
        <div class="history-item" data-index="${index}">
            <div class="history-item-content">
                <div class="history-item-text">${escapeHtml(item)}</div>
            </div>
            <div class="history-item-actions">
                <button class="btn-regenerate" onclick="regenerateFromHistory(${index})">再生成</button>
                <button class="btn-copy" onclick="copyHistoryItem(${index})">コピー</button>
                <button class="btn-delete" onclick="deleteHistoryItem(${index})">削除</button>
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
function regenerateFromHistory(index) {
    if (index >= 0 && index < qrHistory.length) {
        const item = qrHistory[index];
        qrInput.value = item;
        generateQRCode();
        currentQRData = item;
        // 履歴から再生成した場合は、既に履歴に存在するので保存ボタンを無効化
        saveToHistoryBtn.disabled = true;
    }
}

// 履歴アイテムをコピー
async function copyHistoryItem(index) {
    if (index >= 0 && index < qrHistory.length) {
        const item = qrHistory[index];
        try {
            await navigator.clipboard.writeText(item);
            alert('テキストがクリップボードにコピーされました');
        } catch (error) {
            alert('コピーに失敗しました');
        }
    }
}

// 履歴アイテムを削除
function deleteHistoryItem(index) {
    if (index >= 0 && index < qrHistory.length) {
        qrHistory.splice(index, 1);
        updateHistoryDisplay();
        updateURL();
    }
}

// URLを更新（履歴をLZMA圧縮してエンコード）
function updateURL() {
    if (qrHistory.length === 0) {
        const url = new URL(window.location);
        url.search = '';
        window.history.replaceState({}, '', url);
        return;
    }

    const jsonData = JSON.stringify(qrHistory);
    compressWithDeflate(jsonData).then(compressedData => {
        const url = new URL(window.location);
        url.search = '?' + compressedData;
        window.history.replaceState({}, '', url);
    });
}





// URLから履歴を読み込み
function loadHistoryFromURL() {
    const url = new URL(window.location);
    const encodedData = url.search.substring(1);

    if (!encodedData) return;

    decompressWithDeflate(encodedData).then(decompressedData => {
        const historyData = JSON.parse(decompressedData);
        restoreHistory(historyData);
    });
}



// 履歴を復元
function restoreHistory(historyData) {
    qrHistory = historyData;

    updateHistoryDisplay();
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

// テキスト入力時の処理
qrInput.addEventListener('input', () => {
    const text = qrInput.value.trim();
    if (text) {
        currentQRData = text;
        saveToHistoryBtn.disabled = false;
    } else {
        currentQRData = null;
        saveToHistoryBtn.disabled = true;
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

    // 初期状態で履歴保存ボタンを無効化
    saveToHistoryBtn.disabled = true;
});

// QRCodeライブラリの読み込み確認
function checkQRCodeLibrary() {
    if (typeof QRCode === 'undefined') {
        setTimeout(() => {
            if (typeof QRCode === 'undefined') {
                generateQRBtn.disabled = true;
                generateQRBtn.textContent = 'ライブラリ読み込みエラー';
            } else {
                generateQRBtn.disabled = false;
                generateQRBtn.textContent = 'QRコード生成';
            }
        }, 1000);
    }
}

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});



// 高効率URLセーフBase64エンコーディング
// 使用文字: A-Z, a-z, 0-9, -, _, ~, ., :, @, !, $, &, ', (, ), *, +, ,, ;, ?, #, [, ]
// =を除外して68文字（Base64の64文字より4文字多い）
const URL_SAFE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_~.:@!$&\'()*+,;?#[]';

// バイナリデータを高効率URLセーフBase64エンコード
function binaryToUrlSafeBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let result = '';
    let bits = 0;
    let bitCount = 0;

    for (let i = 0; i < bytes.length; i++) {
        bits = (bits << 8) | bytes[i];
        bitCount += 8;

        while (bitCount >= 6) {
            bitCount -= 6;
            const index = (bits >> bitCount) & 0x3F;
            result += URL_SAFE_CHARS[index];
        }
    }

    // 残りのビットを処理
    if (bitCount > 0) {
        bits = bits << (6 - bitCount);
        const index = bits & 0x3F;
        result += URL_SAFE_CHARS[index];
    }

    return result;
}

// URLセーフBase64からバイナリデータに変換
function urlSafeBase64ToBinary(encoded) {
    const bytes = [];
    let bits = 0;
    let bitCount = 0;

    for (let i = 0; i < encoded.length; i++) {
        const char = encoded[i];
        const index = URL_SAFE_CHARS.indexOf(char);
        if (index === -1) continue;

        bits = (bits << 6) | index;
        bitCount += 6;

        while (bitCount >= 8) {
            bitCount -= 8;
            bytes.push((bits >> bitCount) & 0xFF);
        }
    }

    return new Uint8Array(bytes);
}

// テキストエンコーダー/デコーダー
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// 上流ストリームを作成
const createUpstream = (value) => {
    return new ReadableStream({
        start(controller) {
            controller.enqueue(value);
            controller.close();
        },
    });
};

// CompressionStreamで圧縮
async function compressWithDeflate(data) {
    const upstream = createUpstream(textEncoder.encode(data));
    const compression = new CompressionStream('deflate-raw');
    const stream = upstream.pipeThrough(compression);
    const compressed = await new Response(stream).arrayBuffer();

    return binaryToUrlSafeBase64(new Uint8Array(compressed));
}

// CompressionStreamで解凍
async function decompressWithDeflate(encodedData) {
    const compressedData = urlSafeBase64ToBinary(encodedData);
    const upstream = createUpstream(compressedData);
    const decompression = new DecompressionStream('deflate-raw');
    const stream = upstream.pipeThrough(decompression);
    const decompressed = await new Response(stream).arrayBuffer();

    return textDecoder.decode(decompressed);
} 