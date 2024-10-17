import express from "express";
import * as bodyParser from "body-parser";
import { connectToPeers, getSockets, initP2PServer } from "./p2p";

const httpPort: number = parseInt(process.env.HTTP_PORT) || 3001;
const p2pPort: number = parseInt(process.env.P2P_PORT) || 6001;

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("hey");
});

app.get("/api/peers", (req, res) => {
  res.send(
    getSockets().map(
      (s: any) => s._socket.remoteAddress + ":" + s._socket.remotePort
    )
  );
});

app.post("/api/addPeer", (req, res) => {
  connectToPeers(req.body.peer);
  res.send();
});

app.listen(httpPort, () => {
  return console.log(`Express is listening at http://localhost:${httpPort}`);
});

initP2PServer(p2pPort);
