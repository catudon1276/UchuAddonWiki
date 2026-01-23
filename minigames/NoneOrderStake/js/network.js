/**
 * WebRTC P2P通信モジュール
 * ホスト集中型P2Pアーキテクチャ
 * 
 * ※現在は空実装。オンライン対戦実装時に使用
 */

// ===========================================
// 通信状態
// ===========================================
export const ConnectionState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    HOST: 'host',
    ERROR: 'error'
};

// ===========================================
// メッセージタイプ
// ===========================================
export const MessageType = {
    // ゲーム進行
    GAME_START: 'game_start',
    BET: 'bet',
    CARD_USE: 'card_use',
    DICE_RESULT: 'dice_result',
    MATCH_RESULT: 'match_result',
    GAME_END: 'game_end',
    
    // 同期
    SYNC_STATE: 'sync_state',
    SYNC_REQUEST: 'sync_request',
    
    // 接続管理
    PLAYER_JOIN: 'player_join',
    PLAYER_LEAVE: 'player_leave',
    ROOM_INFO: 'room_info'
};

// ===========================================
// P2P接続クラス（空実装）
// ===========================================
export class P2PConnection {
    constructor() {
        this.state = ConnectionState.DISCONNECTED;
        this.roomId = null;
        this.playerId = null;
        this.isHost = false;
        this.peers = new Map(); // peerId -> RTCPeerConnection
        this.dataChannels = new Map(); // peerId -> RTCDataChannel
        
        // イベントハンドラ
        this.onMessage = null;
        this.onStateChange = null;
        this.onPlayerJoin = null;
        this.onPlayerLeave = null;
        this.onError = null;
    }
    
    /**
     * 部屋を作成（ホストになる）
     * @returns {Promise<string>} Room ID
     */
    async createRoom() {
        console.log('[P2P] createRoom - Not implemented');
        this.isHost = true;
        this.state = ConnectionState.HOST;
        this.roomId = this._generateRoomId();
        return this.roomId;
    }
    
    /**
     * 部屋に参加
     * @param {string} roomId 
     * @returns {Promise<boolean>}
     */
    async joinRoom(roomId) {
        console.log('[P2P] joinRoom - Not implemented:', roomId);
        this.roomId = roomId;
        this.state = ConnectionState.CONNECTED;
        return true;
    }
    
    /**
     * メッセージを送信
     * @param {string} type MessageType
     * @param {object} data 
     * @param {string} targetPeerId 特定の相手に送る場合
     */
    send(type, data, targetPeerId = null) {
        const message = {
            type,
            data,
            senderId: this.playerId,
            timestamp: Date.now()
        };
        
        console.log('[P2P] send - Not implemented:', message);
        
        // 実装時: DataChannelで送信
        // if (targetPeerId) {
        //     this.dataChannels.get(targetPeerId)?.send(JSON.stringify(message));
        // } else {
        //     this.dataChannels.forEach(ch => ch.send(JSON.stringify(message)));
        // }
    }
    
    /**
     * ブロードキャスト（ホストのみ）
     */
    broadcast(type, data) {
        if (!this.isHost) {
            console.warn('[P2P] Only host can broadcast');
            return;
        }
        this.send(type, data);
    }
    
    /**
     * 切断
     */
    disconnect() {
        console.log('[P2P] disconnect');
        this.peers.forEach(pc => pc.close());
        this.dataChannels.forEach(dc => dc.close());
        this.peers.clear();
        this.dataChannels.clear();
        this.state = ConnectionState.DISCONNECTED;
        this.roomId = null;
        this.isHost = false;
    }
    
    /**
     * Room ID生成
     */
    _generateRoomId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }
    
    // ===========================================
    // WebRTC接続処理（実装予定）
    // ===========================================
    
    async _createPeerConnection(peerId) {
        // ICE serverの設定
        const config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };
        
        const pc = new RTCPeerConnection(config);
        
        // ICE候補の処理
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                // シグナリングサーバーに送信（要実装）
            }
        };
        
        // DataChannel
        const dc = pc.createDataChannel('game');
        dc.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.onMessage?.(message);
        };
        
        this.peers.set(peerId, pc);
        this.dataChannels.set(peerId, dc);
        
        return pc;
    }
}

// ===========================================
// シグナリングサーバー接続（空実装）
// ===========================================
export class SignalingClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.socket = null;
        this.onSignal = null;
    }
    
    connect() {
        console.log('[Signaling] connect - Not implemented');
        // WebSocket接続（要実装）
    }
    
    send(data) {
        console.log('[Signaling] send - Not implemented:', data);
    }
    
    disconnect() {
        console.log('[Signaling] disconnect');
        this.socket?.close();
    }
}

// ===========================================
// ファクトリ関数
// ===========================================
export function createP2PConnection() {
    return new P2PConnection();
}

export function createSignalingClient(serverUrl) {
    return new SignalingClient(serverUrl);
}
