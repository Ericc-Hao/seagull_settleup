/**
 * Metro stub for Node's `ws` package on React Native.
 * Supabase Realtime uses global WebSocket on native; this avoids pulling in Node streams.
 */
const WebSocketImpl = global.WebSocket;

module.exports = WebSocketImpl;
module.exports.default = WebSocketImpl;
module.exports.WebSocket = WebSocketImpl;
