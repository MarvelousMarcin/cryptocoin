import express from "express";
import * as bodyParser from "body-parser";
import {
  broadcast,
  connectToPeer,
  getSockets,
  initP2PServer,
  messagesMap,
} from "./p2p";
import { v4 as uuidv4 } from "uuid";
import { addKey, initWallet } from "./wallet";
import { MessageType } from "./classes/Message";
import { Block } from "./classes/Block";
import {
  generateNextBlock,
  generatenextBlockWithTransaction,
  getAccountBalance,
  getBlockchainBinary,
} from "./blockchain";

const httpPort: number = parseInt(process.env.HTTP_PORT) || 3001;
const p2pPort: number = parseInt(process.env.P2P_PORT) || 6001;

const initHttpServer = (httpPort: number) => {
  const app = express();
  app.use(bodyParser.json());

  app.get("/api/peers", (req, res) => {
    res.send(
      getSockets().map(
        (s: any) => s._socket.remoteAddress + ":" + s._socket.remotePort
      )
    );
  });

  app.get("/api/blockchain", (req, res) => {
    res.send(getBlockchainBinary());
  });

  app.post("/api/sendToPeers", (req, res) => {
    const mess = {
      type: MessageType.BLOCKCHAIN,
      id: uuidv4(),
      data: req.body.message,
    };
    messagesMap.set(mess.id, mess.data);
    broadcast(mess);
    res.send();
  });

  app.post("/api/addPeer", (req, res) => {
    connectToPeer(req.body.peer, p2pPort);
    res.send();
  });

  app.post("/api/wallet", (req, res) => {
    res.send(initWallet(req.body.password));
  });

  app.post("/api/wallet/keys", (req, res) => {
    res.send(addKey(req.body.password));
  });

  app.post("/api/mine", (req, res) => {
    console.log(req.body.data);
    const newBlock: Block = generateNextBlock();
    res.send(newBlock);
  });

  app.get("/api/balance", (req, res) => {
    const balance: number = getAccountBalance();
    res.send({ balance: balance });
  });

  app.post("/api/mineTransaction", (req, res) => {
    const address = req.body.address;
    const amount = req.body.amount;
    console.log(address);
    console.log(amount);

    try {
      const resp = generatenextBlockWithTransaction(address, amount);
      res.send(resp);
    } catch (e) {
      console.log(e.message);
      res.status(400).send(e.message);
    }
  });

  app.listen(httpPort, () => {
    return console.log(`Express is listening at http://localhost:${httpPort}`);
  });
};

initHttpServer(httpPort);
initP2PServer(p2pPort);
