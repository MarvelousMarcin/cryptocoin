import * as _ from "lodash";
import { Transaction, TxIn, UnspentTxOut } from "./classes/Transaction";

let transactionPool: Transaction[] = [];

export const getTransactionPool = () => {
  return _.cloneDeep(transactionPool);
};

export const addToTransactionPool = (
  tx: Transaction,
  unspentTxOuts: UnspentTxOut[]
) => {
  console.log("adding to txPool: %s", JSON.stringify(tx));
  transactionPool.push(tx);
};

const hasTxIn = (txIn: TxIn, unspentTxOuts: UnspentTxOut[]): boolean => {
  const foundTxIn = unspentTxOuts.find((uTxO: UnspentTxOut) => {
    return uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex;
  });
  return foundTxIn !== undefined;
};

export const updateTransactionPool = (unspentTxOuts: UnspentTxOut[]) => {
  const invalidTxs = [];
  for (const tx of transactionPool) {
    for (const txIn of tx.txIns) {
      if (!hasTxIn(txIn, unspentTxOuts)) {
        invalidTxs.push(tx);
        break;
      }
    }
  }
  if (invalidTxs.length > 0) {
    console.log(
      "removing the following transactions from txPool: %s",
      JSON.stringify(invalidTxs)
    );
    transactionPool = _.without(transactionPool, ...invalidTxs);
  }
};
