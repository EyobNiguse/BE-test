import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:5000', {
    withCredentials: true, // Send cookies (authToken)
    transports: ['websocket'], // optional: force WebSocket
});

export default socket;
