import { Block } from "./classes/Block";

const genesisBlock: Block = new Block(
  0,
  "6b88c087247aa2f07ee1c5956b8e1a9f4c7f892a70e324f1bb3d161e05ca107b",
  "",
  Math.floor(Math.random() * 1000),
  "genesis block"
);

let blockchain: Block[] = [genesisBlock];

export const getBlockchain = (): Block[] => blockchain;
export const getLatesBlock = (): Block => blockchain[blockchain.length - 1];
