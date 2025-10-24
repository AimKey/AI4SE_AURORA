import { config } from "config";
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io : Server;
export function initSocket(server:HTTPServer){
  io = new Server(server, {
  cors: {
    origin: config.clientOrigin,
    methods: ['GET', 'POST'],
  },
});

// Config sự kiện Socket.IO
io.on('connection', (socket) => {
  console.log('⚡ User connected:', socket.id);

  // Join a post room for realtime comment updates
  socket.on('post:join', (data: { postId: string }) => {
    const roomName = `post:${data.postId}`;
    socket.join(roomName);
    console.log(`📍 Socket ${socket.id} joined room: ${roomName}`);
  });

  // Leave a post room
  socket.on('post:leave', (data: { postId: string }) => {
    const roomName = `post:${data.postId}`;
    socket.leave(roomName);
    console.log(`📤 Socket ${socket.id} left room: ${roomName}`);
  });

  // Handle comment creation (this will be emitted from service layer)
  socket.on('comment:create', (data: any) => {
    const roomName = `post:${data.postId}`;
    socket.to(roomName).emit('comment:new', data);
  });

  // Handle reply creation (this will be emitted from service layer)
  socket.on('comment:reply', (data: any) => {
    const roomName = `post:${data.postId}`;
    socket.to(roomName).emit('comment:reply', data);
  });

  socket.on('testSocket', (msg) => {
    console.log('Receive from client:', msg);
    io.emit('testSocket', msg); // broadcast cho tất cả
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});
}
export function getIO():Server{
  if(!io) throw new Error("Socket.io not initialized");
  return io;
}