const { createApp } = Vue;

createApp({
    data() {
        return {
            // 画面管理
            currentView: 'main', // 'main' or 'add'
            showQRDetail: false,
            selectedQRIndex: -1,

            // カメラ関連
            isCameraActive: false,
            scanStatus: 'カメラを開始してQRコードを読み取ってください',
            scannedData: '',
            stream: null,
            scanInterval: null,

            // QRコード生成関連
            qrInputText: '',
            hasGeneratedQR: false,
            qrOptions: {
                size: 200,
                margin: 2,
                errorLevel: 'M',
                darkColor: '#000000',
                lightColor: '#FFFFFF'
            },

            // 詳細画面用のQRオプション
            detailQROptions: {
                size: 200,
                margin: 2,
                errorLevel: 'M',
                darkColor: '#000000',
                lightColor: '#FFFFFF'
            },

            // 履歴関連
            qrHistory: [],
            currentQRData: '',

            // エンコーディング関連
            textEncoder: new TextEncoder(),
            textDecoder: new TextDecoder(),
            URL_SAFE_CHARS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_~'
        };
    },

    computed: {
        canSaveToHistory() {
            return this.currentQRData && this.currentQRData.trim() !== '';
        },
        selectedQRData() {
            return this.selectedQRIndex >= 0 ? this.qrHistory[this.selectedQRIndex] : '';
        }
    },

    mounted() {
        this.loadHistoryFromURL();
        this.checkQRCodeLibrary();
        this.generateAllQRCodes();
    },

    methods: {
        // 画面切り替え
        switchToMainView() {
            this.currentView = 'main';
            this.stopCamera();
            this.generateAllQRCodes();
        },

        switchToAddView() {
            this.currentView = 'add';
        },

        // QRコード一覧表示
        generateAllQRCodes() {
            this.$nextTick(() => {
                this.qrHistory.forEach((item, index) => {
                    this.generateQRPreview(item, index);
                });
            });
        },

        generateQRPreview(data, index) {
            if (typeof QRCode === 'undefined') return;

            const previewContainer = this.$refs.qrPreview;
            if (!previewContainer || !previewContainer[index]) return;

            const canvas = document.createElement('canvas');
            previewContainer[index].innerHTML = '';
            previewContainer[index].appendChild(canvas);

            QRCode.toCanvas(canvas, data, {
                width: 80,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'M'
            });
        },

        truncateText(text, maxLength) {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },

        // QR詳細画面
        openQRDetail(index) {
            this.selectedQRIndex = index;
            this.selectedQRData = this.qrHistory[index];
            this.detailQROptions = { ...this.qrOptions };
            this.showQRDetail = true;
            this.$nextTick(() => {
                this.generateDetailQR();
            });
        },

        closeQRDetail() {
            this.showQRDetail = false;
            this.selectedQRIndex = -1;
        },

        generateDetailQR() {
            if (!this.selectedQRData || typeof QRCode === 'undefined') return;

            const canvas = document.createElement('canvas');
            this.$refs.qrDetailCode.innerHTML = '';
            this.$refs.qrDetailCode.appendChild(canvas);

            QRCode.toCanvas(canvas, this.selectedQRData, {
                width: parseInt(this.detailQROptions.size),
                margin: parseInt(this.detailQROptions.margin),
                color: {
                    dark: this.detailQROptions.darkColor,
                    light: this.detailQROptions.lightColor
                },
                errorCorrectionLevel: this.detailQROptions.errorLevel
            });
        },

        regenerateDetailQR() {
            this.generateDetailQR();
        },

        downloadDetailQR() {
            const canvas = this.$refs.qrDetailCode.querySelector('canvas');
            if (!canvas) return;

            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL();
            link.click();
        },

        async copyDetailQR() {
            const canvas = this.$refs.qrDetailCode.querySelector('canvas');
            if (!canvas) return;

            try {
                canvas.toBlob(async (blob) => {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    alert('QRコードがクリップボードにコピーされました');
                });
            } catch (error) {
                alert('クリップボードへのコピーに失敗しました');
            }
        },

        deleteQR() {
            if (this.selectedQRIndex >= 0) {
                this.qrHistory.splice(this.selectedQRIndex, 1);
                this.updateURL();
                this.closeQRDetail();
                this.generateAllQRCodes();
            }
        },

        // カメラ制御
        async startCamera() {
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                this.$refs.video.srcObject = this.stream;
                this.isCameraActive = true;
                this.scanStatus = 'カメラが開始されました。QRコードを読み取ってください';
                this.scanInterval = setInterval(this.scanFrame, 100);
            } catch (error) {
                this.scanStatus = 'カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。';
            }
        },

        stopCamera() {
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            if (this.scanInterval) {
                clearInterval(this.scanInterval);
                this.scanInterval = null;
            }
            this.isCameraActive = false;
            this.scanStatus = 'カメラを開始してQRコードを読み取ってください';
        },

        scanFrame() {
            if (!this.isCameraActive || !this.$refs.video.videoWidth) return;

            const canvas = this.$refs.canvas;
            const context = canvas.getContext('2d');
            canvas.width = this.$refs.video.videoWidth;
            canvas.height = this.$refs.video.videoHeight;
            context.drawImage(this.$refs.video, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                this.handleQRCodeDetected(code.data);
            }
        },

        handleQRCodeDetected(data) {
            this.scannedData = data;
            this.currentQRData = data;
            this.scanStatus = 'QRコードを検出しました！';
            this.playSuccessSound();
        },

        playSuccessSound() {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
            } catch (error) {
                // 音声再生エラーは無視
            }
        },

        // QRコード生成
        generateQRCode() {
            if (!this.qrInputText.trim()) {
                alert('テキストを入力してください');
                return;
            }

            if (typeof QRCode === 'undefined') {
                alert('QRCodeライブラリが読み込まれていません');
                return;
            }

            this.currentQRData = this.qrInputText;
            this.createQRCode();
        },

        createQRCode() {
            const canvas = document.createElement('canvas');
            this.$refs.qrCode.innerHTML = '';
            this.$refs.qrCode.appendChild(canvas);

            QRCode.toCanvas(canvas, this.currentQRData, {
                width: parseInt(this.qrOptions.size),
                margin: parseInt(this.qrOptions.margin),
                color: {
                    dark: this.qrOptions.darkColor,
                    light: this.qrOptions.lightColor
                },
                errorCorrectionLevel: this.qrOptions.errorLevel
            }, (error) => {
                if (error) {
                    alert('QRコードの生成に失敗しました');
                } else {
                    this.hasGeneratedQR = true;
                }
            });
        },

        regenerateQR() {
            if (this.currentQRData) {
                this.createQRCode();
            }
        },

        // ダウンロードとコピー
        downloadQR() {
            const canvas = this.$refs.qrCode.querySelector('canvas');
            if (!canvas) return;

            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL();
            link.click();
        },

        async copyQR() {
            const canvas = this.$refs.qrCode.querySelector('canvas');
            if (!canvas) return;

            try {
                canvas.toBlob(async (blob) => {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    alert('QRコードがクリップボードにコピーされました');
                });
            } catch (error) {
                alert('クリップボードへのコピーに失敗しました');
            }
        },

        // 履歴管理
        saveToHistory() {
            if (!this.currentQRData || this.qrHistory.includes(this.currentQRData)) {
                return;
            }
            this.qrHistory.push(this.currentQRData);
            this.updateURL();
            this.switchToMainView();
        },

        clearHistory() {
            this.qrHistory = [];
            this.updateURL();
        },

        regenerateFromHistory(data) {
            this.currentQRData = data;
            this.qrInputText = data;
            this.createQRCode();
        },

        async copyHistoryItem(text) {
            try {
                await navigator.clipboard.writeText(text);
                alert('テキストがクリップボードにコピーされました');
            } catch (error) {
                alert('コピーに失敗しました');
            }
        },

        deleteHistoryItem(index) {
            this.qrHistory.splice(index, 1);
            this.updateURL();
        },

        shareHistory() {
            if (this.qrHistory.length === 0) return;
            this.updateURL();
            alert('URLが更新されました。このURLを共有してください。');
        },

        // URL圧縮・エンコーディング
        async updateURL() {
            if (this.qrHistory.length === 0) {
                history.replaceState(null, '', window.location.pathname);
                return;
            }

            const jsonData = JSON.stringify(this.qrHistory);
            const compressedData = await this.compressWithDeflate(jsonData);
            const encodedData = this.binaryToUrlSafe(compressedData);
            
            const url = new URL(window.location);
            url.search = '?' + encodedData;
            history.replaceState(null, '', url);
        },

        async loadHistoryFromURL() {
            const url = new URL(window.location);
            const encodedData = url.search.substring(1);
            
            if (!encodedData) return;

            try {
                const compressedData = this.urlSafeToBinary(encodedData);
                const jsonData = await this.decompressWithDeflate(compressedData);
                this.qrHistory = JSON.parse(jsonData);
            } catch (error) {
                // URLの読み込みに失敗した場合は無視
            }
        },

        async compressWithDeflate(data) {
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode(data));
                    controller.close();
                }
            });

            const compressedStream = stream.pipeThrough(new CompressionStream('deflate-raw'));
            const response = new Response(compressedStream);
            return await response.arrayBuffer();
        },

        async decompressWithDeflate(compressedData) {
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array(compressedData));
                    controller.close();
                }
            });

            const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate-raw'));
            const response = new Response(decompressedStream);
            const arrayBuffer = await response.arrayBuffer();
            return new TextDecoder().decode(arrayBuffer);
        },

        binaryToUrlSafe(arrayBuffer) {
            const bytes = new Uint8Array(arrayBuffer);
            let result = '';
            let bits = 0;
            let value = 0;

            for (let i = 0; i < bytes.length; i++) {
                value = (value << 8) | bytes[i];
                bits += 8;

                while (bits >= 6) {
                    bits -= 6;
                    result += this.URL_SAFE_CHARS[(value >>> bits) & 0x3F];
                }
            }

            if (bits > 0) {
                result += this.URL_SAFE_CHARS[(value << (6 - bits)) & 0x3F];
            }

            return result;
        },

        urlSafeToBinary(str) {
            let value = 0;
            let bits = 0;
            const bytes = [];

            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                const index = this.URL_SAFE_CHARS.indexOf(char);
                if (index === -1) continue;

                value = (value << 6) | index;
                bits += 6;

                while (bits >= 8) {
                    bits -= 8;
                    bytes.push((value >>> bits) & 0xFF);
                }
            }

            return new Uint8Array(bytes).buffer;
        },

        checkQRCodeLibrary() {
            if (typeof QRCode === 'undefined') {
                setTimeout(() => {
                    if (typeof QRCode === 'undefined') {
                        // QRCodeライブラリが読み込まれていない場合の処理
                    }
                }, 1000);
            }
        }
    }
}).mount('#app'); 