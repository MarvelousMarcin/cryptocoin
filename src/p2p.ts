import { Server, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import { Message, MessageType } from "./classes/Message";
import { getLatestBlock } from "./blockchain";
const sockets: WebSocket[] = [];

export const messagesMap = new Map<string, string>();

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
    if (message.type == MessageType.REVERSE_CONNECTION) {
      connectToPeer(message.data, p2pPort, true);
    }
    if (message.type == MessageType.BLOCKCHAIN) {
      // Check if this node recived message with this id
      // If not set it and resend to other nodes
      if (!messagesMap.has(message.id)) {
        messagesMap.set(message.id, message.data);
        broadcast(message);
        console.log(`GOT MESSAGE (${p2pPort})-->${JSON.stringify(message)})`);
      }
    }
  });
};

const initConnection = (ws: WebSocket) => {
  sockets.push(ws);
};

export const connectToPeer = (
  newPeer: string,
  p2pPort: number,
  oneSide: boolean = false
): void => {
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
    if (!oneSide) {
      const newReversePeer = {
        id: uuidv4(),
        type: MessageType.REVERSE_CONNECTION,
        data: `ws://localhost:${p2pPort}`,
      };
      ws.send(JSON.stringify(newReversePeer));
    }
  });
  ws.on("error", () => {
    console.log("connection failed");
  });
};

export const broadcast = (message: Message) =>
  sockets.forEach((socket) => sendMessage(socket, message));

const sendMessage = (ws: WebSocket, message: Message) => {
  ws.send(JSON.stringify(message));
};

export const broadcastLatest = (): void => {
  broadcast(responseLatestMsg());
};

const responseLatestMsg = (): Message => ({
  type: MessageType.BLOCKCHAIN,
  id: uuidv4(),
  data: JSON.stringify([getLatestBlock()]),
});
