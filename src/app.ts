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
import { getOrCreateWallet } from "./wallet";

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

  app.post("/api/sendToPeers", (req, res) => {
    const mess = { type: "BLOCKCHAIN", id: uuidv4(), data: req.body.message };
    messagesMap.set(mess.id, mess.data);
    broadcast(mess);
    res.send();
  });

  app.post("/api/addPeer", (req, res) => {
    connectToPeer(req.body.peer, p2pPort);
    res.send();
  });

  app.post("/api/wallet",(req, res) => {
    res.send(getOrCreateWallet(req.body.password));
  });

  app.listen(httpPort, () => {
    return console.log(`Express is listening at http://localhost:${httpPort}`);
  });
};

initHttpServer(httpPort);
initP2PServer(p2pPort);
