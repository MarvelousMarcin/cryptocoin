import { Server, WebSocket } from "ws";

const sockets: WebSocket[] = [];

export const initP2PServer = (p2pPort: number) => {
  const server: Server = new WebSocket.Server({ port: p2pPort });
  server.on("connection", (ws: WebSocket) => {
    console.log("Node has joined!!");
    communicationHandler(ws);
    closeAndErrorHandler(ws);
  });
  console.log("listening websocket on port: " + p2pPort);
};

export const getSockets = () => sockets;

const closeAndErrorHandler = (ws: WebSocket) => {
  ws.on("close", () => {
    sockets.splice(sockets.indexOf(ws), 1);
  });
  ws.on("error", () => {
    sockets.splice(sockets.indexOf(ws), 1);
  });
};

const communicationHandler = (ws: WebSocket) => {
  ws.on("message", (data: string) => {
    console.log("Received message" + JSON.stringify(JSON.parse(data)));
  });
};

const initConnection = (ws: WebSocket) => {
  sockets.push(ws);
};

export const connectToPeer = (newPeer: string): void => {
  // Check if peer is not already connected
  if (
    sockets.find((socket) => newPeer.indexOf(socket._socket.remotePort) !== -1)
  ) {
    console.log("Already connected with this peer");
    return;
  }
  const ws: WebSocket = new WebSocket(newPeer);
  ws.on("open", () => {
    initConnection(ws);
  });
  ws.on("error", () => {
    console.log("connection failed");
  });
};

export const broadcast = (message) =>
  sockets.forEach((socket) => sendMessage(socket, message));

const sendMessage = (ws: WebSocket, message) =>
  ws.send(JSON.stringify(message));
