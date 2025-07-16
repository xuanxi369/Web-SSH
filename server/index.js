const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

io.on('connection', (socket) => {
  const conn = new Client();

  socket.on('ssh-connect', ({ host, port, username, password }) => {
    conn.on('ready', () => {
      socket.emit('ssh-data', '\r\n✅ SSH连接成功\r\n');
      conn.shell((err, stream) => {
        if (err) return socket.emit('ssh-data', '❌ 启动Shell失败：' + err.message);
        stream.on('data', data => socket.emit('ssh-data', data.toString()));
        socket.on('ssh-input', data => stream.write(data));
        stream.on('close', () => conn.end());
      });
    });

    conn.on('error', (err) => {
      socket.emit('ssh-data', '❌ SSH连接错误：' + err.message + '\r\n');
    });

    conn.connect({ host, port, username, password });
  });

  socket.on('disconnect', () => conn.end());
});

server.listen(3000, () => {
  console.log('✅ Web SSH 服务已启动：http://localhost:3000');
});
