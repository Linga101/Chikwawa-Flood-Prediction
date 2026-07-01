// Central API configuration.
// Reads NEXT_PUBLIC_API_URL from the environment — set to http://localhost:8000
// locally and to the live Railway backend URL in production.
// WS_URL converts http→ws and https→wss automatically for WebSocket connections.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const WS_URL = API_URL.replace(/^http/, 'ws');
