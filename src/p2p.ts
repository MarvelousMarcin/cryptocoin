import { Server, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import { Message, MessageType } from "./classes/Message";
import {
  addBlock,
  getBlockchain,
  getLatestBlock,
  handleReceivedTransaction,
  isValidBlockStructure,
  replaceChain,
} from "./blockchain";
import { Block } from "./classes/Block";
import { getTransactionPool } from "./transactionPool";
import { Transaction } from "./classes/Transaction";
const sockets: WebSocket[] = [];
let serverP2pPort = 0;

export const messagesMap = new Map<string, string>();

export const initP2PServer = (p2pPort: number) => {
  const server: Server = new WebSocket.Server({ port: p2pPort });
  serverP2pPort = p2pPort;
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

const queryTransactionPoolMsg = (): Message => ({
  id: uuidv4(),
  type: MessageType.QUERY_TRANSACTION_POOL,
  data: null,
});

const responseTransactionPoolMsg = (): Message => ({
  id: uuidv4(),
  type: MessageType.RESPONSE_TRANSACTION_POOL,
  data: JSON.stringify(getTransactionPool()),
});

const JSONToObject = <T>(data: string): T => {
  try {
    return JSON.parse(data);
  } catch (e) {
    console.log(e);
    return null;
  }
};

const communicationHandler = (ws: WebSocket) => {
  ws.on("message", (data: string) => {
    const message: Message = JSON.parse(data);
    if (message.type == MessageType.REVERSE_CONNECTION) {
      connectToPeer(message.data, serverP2pPort, true);
    }
    if (message.type == MessageType.LATEST_BLOCK) {
      console.log("Request of latest block");
      sendMessage(ws, responseLatestMsg());
    }
    if (message.type == MessageType.QUERY_CHAIN) {
      //maybe broadcast?
      console.log("Request of blockchain");
      sendMessage(ws, {
        type: MessageType.BLOCKCHAIN,
        data: JSON.stringify(getBlockchain()),
        id: uuidv4(),
      });
    }
    if (message.type == MessageType.RESPONSE_TRANSACTION_POOL) {
      if (!messagesMap.has(message.id)) {
        messagesMap.set(message.id, message.data);
        const receivedTransactions: Transaction[] = JSONToObject<Transaction[]>(
          message.data
        );
        if (receivedTransactions === null) {
          console.log(
            "invalid transaction received: %s",
            JSON.stringify(message.data)
          );
          return;
        }

        receivedTransactions.forEach((transaction: Transaction) => {
          try {
            handleReceivedTransaction(transaction);
            sendMessage(ws, message);
          } catch (e) {
            console.log(e.message);
          }
        });
      }
    }

    if (message.type == MessageType.BLOCKCHAIN) {
      // Check if this node recived message with this id
      // If not set it and resend to other nodes
      if (!messagesMap.has(message.id)) {
        messagesMap.set(message.id, message.data);

        // validate given blockchain
        const receivedBlocks: Block[] = JSONToObject<Block[]>(message.data);
        console.log("Got blockchain with length of : " + receivedBlocks.length);
        console.log(receivedBlocks);

        if (receivedBlocks === null) {
          console.log("invalid blocks received:");
          console.log(message.data);
        } else {
          // Validate recived blocks

          const newBlock = receivedBlocks[receivedBlocks.length - 1];
          if (!isValidBlockStructure(newBlock)) {
            console.log("Incorrect blok structure");
          }

          const ourLatest = getLatestBlock();

          if (ourLatest.index < newBlock.index) {
            if (ourLatest.hash === newBlock.previousHash) {
              console.log("Add block to our chain");
              addBlock(newBlock);
              broadcast(message);
            } else if (receivedBlocks.length == 1) {
              console.log("New peer need to query");
              // Query chain from peer
              sendMessage(ws, {
                type: MessageType.QUERY_CHAIN,
                data: null,
                id: uuidv4(),
              });
            } else {
              console.log("Replace chain");
              replaceChain(receivedBlocks);
            }
          }
        }
      }
    }
  });
};

const initConnection = (ws: WebSocket) => {
  sockets.push(ws);
  communicationHandler(ws);
  closeAndErrorHandler(ws);
  sendMessage(ws, queryLatestBlockMsg());
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
  console.log("Sending message:");
  console.log(message);
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

const queryLatestBlockMsg = (): Message => ({
  type: MessageType.LATEST_BLOCK,
  id: uuidv4(),
  data: null,
});

export const broadCastTransactionPool = () => {
  const msg = responseTransactionPoolMsg();
  messagesMap.set(msg.id, msg.data);

  broadcast(msg);
};
