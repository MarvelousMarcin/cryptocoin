import { Block } from "./classes/Block";
import { Transaction, UnspentTxOut } from "./classes/Transaction";
import { broadcastLatest, broadCastTransactionPool } from "./p2p";
import { SHA256 } from "crypto-js";
import * as _ from "lodash";
import {
  getCoinbaseTransaction,
  isValidAddress,
  processTransactions,
} from "./transactions";
import {
  createTransaction,
  getBalance,
  getPrivateFromWallet,
  getPublicFromWallet,
} from "./wallet";
import {
  addToTransactionPool,
  getTransactionPool,
  updateTransactionPool,
} from "./transactionPool";
import { Worker } from 'worker_threads';

const hexToBinary = (s: string): string => {
  let ret: string = "";
  const lookupTable = {
    "0": "0000",
    "1": "0001",
    "2": "0010",
    "3": "0011",
    "4": "0100",
    "5": "0101",
    "6": "0110",
    "7": "0111",
    "8": "1000",
    "9": "1001",
    a: "1010",
    b: "1011",
    c: "1100",
    d: "1101",
    e: "1110",
    f: "1111",
  };
  for (let i: number = 0; i < s.length; i = i + 1) {
    if (lookupTable[s[i]]) {
      ret += lookupTable[s[i]];
    } else {
      return null;
    }
  }
  return ret;
};

let worker: Worker | null = null;

export const startMining = (n: number) => {
  if (!worker) {
    worker = new Worker('./dist/blockWorker.js');

    worker.on('message', (result) => {
      console.log('Getting message from worker')
      if (result.success) {
        if (addBlock(result.block)) {
          broadcastLatest();
          return result.block;
        } else {
          return null;
        }
      } else {
        return null;
      }
    });

    worker.on('error', (err) => {
      console.error('Worker error:', err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
    });
  }

  const coinbaseTx: Transaction = getCoinbaseTransaction(
    getPublicFromWallet(),
    getLatestBlock().index + 1
  );
  const blockData: Transaction[] = [coinbaseTx].concat(getTransactionPool());

  const previousBlock: Block = getLatestBlock();
  const difficulty: number = getDifficulty(getBlockchain());
  const nextIndex: number = previousBlock.index + 1;
  const nextTimestamp: number = getCurrentTimestamp();

  worker.postMessage({
    isMining: true,
    blocksToMine: n,
    blockData: {
      index: nextIndex,
      previousHash: previousBlock.hash,
      timestamp: nextTimestamp,
      data: blockData,
      difficulty: difficulty
    }
  });
}

export const stopMining = () => {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

// setInterval(() => {
//   const used = process.memoryUsage();
//   console.log(
//     `Memory Usage: RSS=${(used.rss / 1024 / 1024).toFixed(2)} MB, HeapUsed=${(used.heapUsed / 1024 / 1024).toFixed(2)} MB , HeapTotal=${(used.heapTotal / 1024 / 1024).toFixed(2)} MB , external=${(used.external / 1024 / 1024).toFixed(2)} MB`
//   );
// }, 5000);

export const COINBASE_AMOUNT: number = 50;

const genesisTransaction = {
  txIns: [{ signature: "", txOutId: "", txOutIndex: 0 }],
  txOuts: [
    {
      address:
        "04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534a",
      amount: COINBASE_AMOUNT,
    },
  ],
  id: "e655f6a5f26dc9b4cac6e46f52336428287759cf81ef5ff10854f69d68f43fa3",
};

const genesisBlock: Block = new Block(
  0,
  "91a73664bc84c0baa1fc75ea6e4aa6d1d20c5df664c724e3159aefc2e1186627",
  "",
  1465154705,
  [genesisTransaction],
  0,
  0
);

let blockchain: Block[] = [genesisBlock];
let unspentTxOuts: UnspentTxOut[] = [];

// in seconds
const BLOCK_GENERATION_INTERVAL: number = 10;

// in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;

const getDifficulty = (aBlockchain: Block[]): number => {
  const latestBlock: Block = aBlockchain[blockchain.length - 1];
  if (
    latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
    latestBlock.index !== 0
  ) {
    return getAdjustedDifficulty(latestBlock, aBlockchain);
  } else {
    return latestBlock.difficulty;
  }
};

const getAdjustedDifficulty = (latestBlock: Block, aBlockchain: Block[]) => {
  const prevAdjustmentBlock: Block =
    aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  const timeExpected: number =
    BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
  const timeTaken: number =
    latestBlock.timestamp - prevAdjustmentBlock.timestamp;
  if (timeTaken < timeExpected / 2) {
    return prevAdjustmentBlock.difficulty + 1;
  } else if (timeTaken > timeExpected * 2) {
    return prevAdjustmentBlock.difficulty - 1;
  } else {
    return prevAdjustmentBlock.difficulty;
  }
};

export const getBlockchain = (): Block[] => blockchain;
export const getBlockchainBinary = (): Block[] =>
  blockchain.map((block) => {
    return { ...block, hashBinary: hexToBinary(block.hash) };
  });

export const getLatestBlock = (): Block => blockchain[blockchain.length - 1];

const calculateHash = (
  index: number,
  previousHash: string,
  timestamp: number,
  data: Transaction[],
  difficulty: number,
  nonce: number
): string =>
  SHA256(
    index + previousHash + timestamp + data + difficulty + nonce
  ).toString();

export const isValidBlockStructure = (block: Block): boolean => {
  return (
    typeof block.index === "number" &&
    typeof block.hash === "string" &&
    typeof block.previousHash === "string" &&
    typeof block.timestamp === "number" &&
    typeof block.data === "object"
  );
};

const getAccumulatedDifficulty = (aBlockchain: Block[]): number => {
  return aBlockchain
    .map((block) => block.difficulty)
    .map((difficulty) => Math.pow(2, difficulty))
    .reduce((a, b) => a + b);
};

const isValidTimestamp = (newBlock: Block, previousBlock: Block): boolean => {
  return (
    previousBlock.timestamp - 60 < newBlock.timestamp &&
    newBlock.timestamp - 60 < getCurrentTimestamp()
  );
};

const calculateHashForBlock = (block: Block): string =>
  calculateHash(
    block.index,
    block.previousHash,
    block.timestamp,
    block.data,
    block.difficulty,
    block.nonce
  );

export const isValidNewBlock = (
  newBlock: Block,
  previousBlock: Block
): boolean => {
  if (!isValidBlockStructure(newBlock)) {
    console.log("invalid structure");
    return false;
  }
  if (previousBlock.index + 1 !== newBlock.index) {
    console.log("invalid index");
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    console.log("invalid previous hash");
    return false;
  } else if (!isValidTimestamp(newBlock, previousBlock)) {
    console.log("invalid timestamp");
    return false;
  } else if (!hasValidHash(newBlock)) {
    return false;
  }
  return true;
};

// and txPool should be only updated at the same time
const setUnspentTxOuts = (newUnspentTxOut: UnspentTxOut[]) => {
  console.log("replacing unspentTxouts with: %s", newUnspentTxOut);
  unspentTxOuts = newUnspentTxOut;
};

export const addBlock = (newBlock: Block) => {
  if (isValidNewBlock(newBlock, getLatestBlock())) {
    const retVal: UnspentTxOut[] = processTransactions(
      newBlock.data,
      unspentTxOuts,
      newBlock.index
    );
    if (retVal === null) {
      return false;
    } else {
      blockchain.push(newBlock);
      updateWorkerData();
      setUnspentTxOuts(retVal);
      updateTransactionPool(unspentTxOuts);
      return true;
    }
  }
};

const updateWorkerData = () => {
  if (!worker) {
    return;
  }
  const coinbaseTx: Transaction = getCoinbaseTransaction(
    getPublicFromWallet(),
    getLatestBlock().index + 1
  );
  const blockData: Transaction[] = [coinbaseTx].concat(getTransactionPool());

  const previousBlock: Block = getLatestBlock();
  const difficulty: number = getDifficulty(getBlockchain());
  const nextIndex: number = previousBlock.index + 1;
  const nextTimestamp: number = getCurrentTimestamp();

  worker.postMessage({
    blockData: {
      'index': nextIndex,
      'previousHash': previousBlock.hash,
      'timestamp': nextTimestamp,
      'data': blockData,
      'difficulty': difficulty
    }
  });
}

const getCurrentTimestamp = (): number =>
  Math.round(new Date().getTime() / 1000);

export const generateRawNextBlock = (blockData: Transaction[]) => {
  const previousBlock: Block = getLatestBlock();
  const difficulty: number = getDifficulty(getBlockchain());
  const nextIndex: number = previousBlock.index + 1;
  const nextTimestamp: number = getCurrentTimestamp();
  const newBlock: Block = findBlock(
    nextIndex,
    previousBlock.hash,
    nextTimestamp,
    blockData,
    difficulty
  );
  if (addBlock(newBlock)) {
    broadcastLatest();
    return newBlock;
  } else {
    return null;
  }
};

const getUnspentTxOuts = (): UnspentTxOut[] => _.cloneDeep(unspentTxOuts);

export const sendTransaction = (
  address: string,
  amount: number
): Transaction => {
  const tx: Transaction = createTransaction(
    address,
    amount,
    getPrivateFromWallet(),
    getUnspentTxOuts(),
    getTransactionPool()
  );
  addToTransactionPool(tx, getUnspentTxOuts());
  broadCastTransactionPool();
  return tx;
};

export const generateNextBlock = () => {
  const coinbaseTx: Transaction = getCoinbaseTransaction(
    getPublicFromWallet(),
    getLatestBlock().index + 1
  );
  const blockData: Transaction[] = [coinbaseTx].concat(getTransactionPool());
  return generateRawNextBlock(blockData);
};

export const generatenextBlockWithTransaction = (
  receiverAddress: string,
  amount: number
) => {
  if (!isValidAddress(receiverAddress)) {
    throw Error("invalid address");
  }
  if (typeof amount !== "number") {
    throw Error("invalid amount");
  }
  const coinbaseTx: Transaction = getCoinbaseTransaction(
    getPublicFromWallet(),
    getLatestBlock().index + 1
  );
  const tx: Transaction = createTransaction(
    receiverAddress,
    amount,
    getPrivateFromWallet(),
    getUnspentTxOuts(),
    getTransactionPool()
  );
  const blockData: Transaction[] = [coinbaseTx, tx];
  return generateRawNextBlock(blockData);
};

export const findBlock = (
  index: number,
  previousHash: string,
  timestamp: number,
  data: Transaction[],
  difficulty: number
): Block => {
  let nonce = 0;
  while (true) {
    const hash: string = calculateHash(
      index,
      previousHash,
      timestamp,
      data,
      difficulty,
      nonce
    );
    if (hashMatchesDifficulty(hash, difficulty)) {
      return new Block(
        index,
        hash,
        previousHash,
        timestamp,
        data,
        difficulty,
        nonce
      );
    }
    nonce++;
  }
};

const hasValidHash = (block: Block): boolean => {
  if (!hashMatchesBlockContent(block)) {
    console.log("invalid hash, got:" + block.hash);
    return false;
  }

  if (!hashMatchesDifficulty(block.hash, block.difficulty)) {
    console.log(
      "block difficulty not satisfied. Expected: " +
      block.difficulty +
      "got: " +
      block.hash
    );
  }
  return true;
};

const hashMatchesBlockContent = (block: Block): boolean => {
  const blockHash: string = calculateHashForBlock(block);
  return blockHash === block.hash;
};

const isValidChain = (blockchainToValidate: Block[]): UnspentTxOut[] => {
  console.log("isValidChain:");
  console.log(JSON.stringify(blockchainToValidate));
  const isValidGenesis = (block: Block): boolean => {
    return JSON.stringify(block) === JSON.stringify(genesisBlock);
  };

  if (!isValidGenesis(blockchainToValidate[0])) {
    return null;
  }

  let aUnspentTxOuts: UnspentTxOut[] = [];

  for (let i = 0; i < blockchainToValidate.length; i++) {
    const currentBlock: Block = blockchainToValidate[i];
    if (
      i !== 0 &&
      !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])
    ) {
      return null;
    }

    aUnspentTxOuts = processTransactions(
      currentBlock.data,
      aUnspentTxOuts,
      currentBlock.index
    );
    if (aUnspentTxOuts === null) {
      console.log("invalid transactions in blockchain");
      return null;
    }
  }
  return aUnspentTxOuts;
};

const hashMatchesDifficulty = (hash: string, difficulty: number): boolean => {
  const hashInBinary: string = hexToBinary(hash);
  const requiredPrefix: string = "0".repeat(difficulty);
  return hashInBinary.startsWith(requiredPrefix);
};

export const replaceChain = (newBlocks: Block[]) => {
  const aUnspentTxOuts = isValidChain(newBlocks);
  const validChain: boolean = aUnspentTxOuts !== null;
  if (
    validChain &&
    getAccumulatedDifficulty(newBlocks) >
    getAccumulatedDifficulty(getBlockchain())
  ) {
    console.log(
      "Received blockchain is valid. Replacing current blockchain with received blockchain"
    );
    blockchain = newBlocks;
    setUnspentTxOuts(aUnspentTxOuts);
    updateTransactionPool(unspentTxOuts);
    broadcastLatest();
    updateWorkerData();
  } else {
    console.log("Received blockchain invalid");
  }
};

export const getAccountBalance = (): number => {
  return getBalance(getPublicFromWallet(), unspentTxOuts);
};

export const handleReceivedTransaction = (transaction: Transaction) => {
  addToTransactionPool(transaction, getUnspentTxOuts());
};
