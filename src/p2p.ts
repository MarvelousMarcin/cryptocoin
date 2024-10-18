import { Server, WebSocket } from "ws";

const sockets: WebSocket[] = [];

type Message = {
  type: string;
  data: any;
};

export const initP2PServer = (p2pPort: number) => {
  const server: Server = new WebSocket.Server({ port: p2pPort });
  server.on("connection", (ws: WebSocket) => {
    console.log("Node has joined!!");
    communicationHandler(ws, p2pPort);
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

const communicationHandler = (ws: WebSocket, p2pPort: number) => {
  ws.on("message", (data: string) => {
    const message: Message = JSON.parse(data);
    if (message.type == "REVERSE_CONNECTION") {
      connectToPeer(message.data, p2pPort);
    }
  });
};

const initConnection = (ws: WebSocket) => {
  sockets.push(ws);
};

export const connectToPeer = (newPeer: string, p2pPort: number): void => {
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
    const newReversePeer = {
      type: "REVERSE_CONNECTION",
      data: `ws://localhost:${p2pPort}`,
    };
    ws.send(JSON.stringify(newReversePeer));
  });
  ws.on("error", () => {
    console.log("connection failed");
  });
};

export const broadcast = (message) =>
  sockets.forEach((socket) => sendMessage(socket, message));

const sendMessage = (ws: WebSocket, message) =>
  ws.send(JSON.stringify(message));
