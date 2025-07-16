const term = new Terminal();
const socket = io();
term.open(document.getElementById('terminal'));

function connectSSH() {
  const host = document.getElementById('host').value;
  const port = parseInt(document.getElementById('port').value);
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  socket.emit('ssh-connect', { host, port, username, password });
}

socket.on('ssh-data', data => term.write(data));
term.onData(data => socket.emit('ssh-input', data));