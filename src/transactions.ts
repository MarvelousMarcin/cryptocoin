import { Transaction, TxIn, TxOut, UnspentTxOut } from "./classes/Transaction";
import { SHA256 } from "crypto-js";
import * as ecdsa from "elliptic";
import { getPublicFromWallet } from "./wallet";

const ec = new ecdsa.ec("secp256k1");
export const processTransactions = (
  aTransactions: Transaction[],
  aUnspentTxOuts: UnspentTxOut[],
  blockIndex: number
) => {
  return updateUnspentTxOuts(aTransactions, aUnspentTxOuts);
};

export const isValidAddress = (address: string): boolean => {
  if (address.length !== 130) {
    console.log("invalid public key length");
    return false;
  } else if (address.match("^[a-fA-F0-9]+$") === null) {
    console.log("public key must contain only hex characters");
    return false;
  } else if (!address.startsWith("04")) {
    console.log("public key must start with 04");
    return false;
  }
  return true;
};

const updateUnspentTxOuts = (
  newTransactions: Transaction[],
  aUnspentTxOuts: UnspentTxOut[]
): UnspentTxOut[] => {
  const newUnspentTxOuts: UnspentTxOut[] = newTransactions
    .map((t) => {
      return t.txOuts.map(
        (txOut, index) =>
          new UnspentTxOut(t.id, index, txOut.address, txOut.amount)
      );
    })
    .reduce((a, b) => a.concat(b), []);

  const consumedTxOuts: UnspentTxOut[] = newTransactions
    .map((t) => t.txIns)
    .reduce((a, b) => a.concat(b), [])
    .map((txIn) => new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, "", 0));

  const resultingUnspentTxOuts = aUnspentTxOuts
    .filter(
      (uTxO) => !findUnspentTxOut(uTxO.txOutId, uTxO.txOutIndex, consumedTxOuts)
    )
    .concat(newUnspentTxOuts);

  return resultingUnspentTxOuts;
};

const findUnspentTxOut = (
  transactionId: string,
  index: number,
  aUnspentTxOuts: UnspentTxOut[]
): UnspentTxOut => {
  const unspend = aUnspentTxOuts.find(
    (uTxO) => uTxO.txOutId === transactionId && uTxO.txOutIndex === index
  );

  aUnspentTxOuts = aUnspentTxOuts.filter(
    (uTxO) => uTxO.txOutId !== transactionId || uTxO.txOutIndex !== index
  );

  return unspend;
};

export const getTransactionId = (transaction: Transaction): string => {
  const txInContent: string = transaction.txIns
    .map((txIn: TxIn) => txIn.txOutId + txIn.txOutIndex)
    .reduce((a, b) => a + b, "");

  const txOutContent: string = transaction.txOuts
    .map((txOut: TxOut) => txOut.address + txOut.amount)
    .reduce((a, b) => a + b, "");

  return SHA256(txInContent + txOutContent).toString();
};

export const getCoinbaseTransaction = (
  address: string,
  blockIndex: number
): Transaction => {
  const t = new Transaction();
  const txIn: TxIn = new TxIn();
  txIn.signature = "";
  txIn.txOutId = "";
  txIn.txOutIndex = blockIndex;

  t.txIns = [txIn];
  t.txOuts = [new TxOut(address, 10)];
  t.id = getTransactionId(t);
  return t;
};

export const signTxIn = (
  transaction: Transaction,
  txInIndex: number,
  privateKey: string,
  aUnspentTxOuts: UnspentTxOut[]
): string => {
  const txIn: TxIn = transaction.txIns[txInIndex];

  const dataToSign = transaction.id;
  const referencedUnspentTxOut: UnspentTxOut = findUnspentTxOut(
    txIn.txOutId,
    txIn.txOutIndex,
    aUnspentTxOuts
  );
  if (referencedUnspentTxOut == null) {
    console.log("could not find referenced txOut");
    throw Error();
  }
  const referencedAddress = referencedUnspentTxOut.address;

  if (getPublicKey(privateKey) !== referencedAddress) {
    console.log(
      "trying to sign an input with private" +
        " key that does not match the address that is referenced in txIn"
    );
    throw Error();
  }
  const key = ec.keyFromPrivate(privateKey, "hex");
  const signature: string = toHexString(key.sign(dataToSign).toDER());

  return signature;
};

const toHexString = (byteArray): string => {
  return Array.from(byteArray, (byte: any) => {
    return ("0" + (byte & 0xff).toString(16)).slice(-2);
  }).join("");
};

export const getPublicKey = (aPrivateKey: string): string => {
  return ec.keyFromPrivate(aPrivateKey, "hex").getPublic("hex");
};
