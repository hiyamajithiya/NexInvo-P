import { useEffect, useRef, useCallback, useState } from 'react';

const WS_BASE = (process.env.REACT_APP_WS_URL || 'ws://localhost:8000') + '/ws/notifications/';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECTS = 5;
const PING_INTERVAL = 30000;

/**
 * React hook for real-time WebSocket notifications.
 *
 * Usage:
 *   const { connected, lastMessage } = useWebSocket({
 *     onNotification: (data) => { ... },
 *     onSyncStatus: (data) => { ... },
 *     onInvoiceUpdate: (data) => { ... },
 *   });
 */
export default function useWebSocket({ onNotification, onSyncStatus, onInvoiceUpdate } = {}) {
  const wsRef = useRef(null);
  const reconnectCount = useRef(0);
  const pingTimer = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  const connect = useCallback(() => {
    const token = sessionStorage.getItem('access_token');
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectCount.current = 0;
      // Start ping keepalive
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setLastMessage(msg);

        switch (msg.type) {
          case 'notification':
            onNotification?.(msg.data);
            break;
          case 'sync_status':
            onSyncStatus?.(msg.data);
            break;
          case 'invoice_update':
            onInvoiceUpdate?.(msg.data);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      clearInterval(pingTimer.current);
      // Reconnect with backoff
      if (reconnectCount.current < MAX_RECONNECTS) {
        reconnectCount.current += 1;
        setTimeout(connect, RECONNECT_DELAY * reconnectCount.current);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }, [onNotification, onSyncStatus, onInvoiceUpdate]);

  useEffect(() => {
    connect();
    return () => {
      clearInterval(pingTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    clearInterval(pingTimer.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  return { connected, lastMessage, disconnect };
}
