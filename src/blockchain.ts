import { Block } from "./classes/Block";
import { broadcastLatest } from "./p2p";
import { SHA256 } from "crypto-js";

const genesisBlock: Block = new Block(
  0,
  "6b88c087247aa2f07ee1c5956b8e1a9f4c7f892a70e324f1bb3d161e05ca107b",
  "",
  Math.floor(Math.random() * 1000),
  "genesis block"
);

let blockchain: Block[] = [genesisBlock];

export const getBlockchain = (): Block[] => blockchain;
export const getLatestBlock = (): Block => blockchain[blockchain.length - 1];

const calculateHash = (
  index: number,
  previousHash: string,
  timestamp: number,
  data: string
): string => SHA256(index + previousHash + timestamp + data).toString();

const isValidBlockStructure = (block: Block): boolean => {
  return (
    typeof block.index === "number" &&
    typeof block.hash === "string" &&
    typeof block.previousHash === "string" &&
    typeof block.timestamp === "number" &&
    typeof block.data === "string"
  );
};

const calculateHashForBlock = (block: Block): string =>
  calculateHash(block.index, block.previousHash, block.timestamp, block.data);

const isValidNewBlock = (newBlock: Block, previousBlock: Block): boolean => {
  if (!isValidBlockStructure(newBlock)) {
    console.log("invalid structure");
    return false;
  }
  if (previousBlock.index + 1 !== newBlock.index) {
    console.log("invalid index");
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    console.log("invalid previoushash");
    return false;
  } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
    console.log(
      typeof newBlock.hash + " " + typeof calculateHashForBlock(newBlock)
    );
    console.log(
      "invalid hash: " + calculateHashForBlock(newBlock) + " " + newBlock.hash
    );
    return false;
  }
  return true;
};

const addBlock = (newBlock: Block) => {
  if (isValidNewBlock(newBlock, getLatestBlock())) {
    blockchain.push(newBlock);
  }
};

export const generateNextBlock = (blockData: string) => {
  const previousBlock: Block = getLatestBlock();
  const nextIndex: number = previousBlock.index + 1;
  const nextTimestamp: number = new Date().getTime() / 1000;
  const nextHash: string = calculateHash(
    nextIndex,
    previousBlock.hash,
    nextTimestamp,
    blockData
  );
  const newBlock: Block = new Block(
    nextIndex,
    nextHash,
    previousBlock.hash,
    nextTimestamp,
    blockData
  );
  addBlock(newBlock);
  broadcastLatest();
  return newBlock;
};
