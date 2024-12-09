import { existsSync, readFileSync, writeFileSync } from "fs";
import { ec } from "elliptic";
import { KeyPair, Wallet } from "./classes/Wallet";
import { encrypt, decrypt } from "./encryption";
import { Transaction, TxIn, TxOut, UnspentTxOut } from "./classes/Transaction";
import { getPublicKey, getTransactionId, signTxIn } from "./transactions";
import _ from "lodash";

const walletLocation = "wallets/wallet" + process.env.HTTP_PORT + ".enc";
const EC = new ec("secp256k1");

let wallet: Wallet | null = null;

export const getWallet = (): Wallet | null => {
  return wallet;
};

export const getPublicFromWallet = () => {
  return wallet.keys[0].publicKey;
};

export const getPrivateFromWallet = () => {
  return wallet.keys[0].privateKey;
};

export const addKey = (password: string): string => {
  if (!existsSync(walletLocation)) {
    return "Wallet not exist";
  }
  wallet = readAndDecryptWalletFile(password);
  if (!wallet) {
    return "Failed to read wallet";
  }
  wallet.keys.push(createKeyPair());
  writeWalletToFile(password);
  return "Key added successfully";
};

export const initWallet = (password: string): string => {
  if (existsSync(walletLocation)) {
    wallet = readAndDecryptWalletFile(password);
    return wallet ? "Wallet loaded successfully" : "Failed to read wallet";
  }
  wallet = new Wallet(createKeyPair());
  writeWalletToFile(password);
  return "Wallet created successfully";
};

const readAndDecryptWalletFile = (password: string): Wallet | null => {
  try {
    const encrypted = readFileSync(walletLocation);
    const decrypted = decrypt(password, encrypted);
    const wallet: Wallet = JSON.parse(decrypted);
    console.log("Wallet decrypted successfully: ");
    console.log(wallet);
    return wallet;
  } catch (error) {
    console.log("Failed to decrypt wallet, the password is incorrect");
    console.error(error.message);
    return null;
  }
};

const writeWalletToFile = (password: string) => {
  try {
    const jsonWallet = JSON.stringify(wallet);
    const encrypted = encrypt(password, jsonWallet);
    writeFileSync(walletLocation, encrypted);
    console.log("Wallet encrypted and saved to: " + walletLocation);
    console.log(wallet);
  } catch (error) {
    console.log("Something went wrong during saving wallet");
    console.error(error.message);
    return null;
  }
};

const createKeyPair = (): KeyPair => {
  const keyPair = EC.genKeyPair();
  return new KeyPair(keyPair.getPrivate("hex"), keyPair.getPublic("hex"));
};

const createTxOuts = (
  receiverAddress: string,
  myAddress: string,
  amount,
  leftOverAmount: number
) => {
  const txOut1: TxOut = new TxOut(receiverAddress, amount);
  if (leftOverAmount === 0) {
    return [txOut1];
  } else {
    const leftOverTx = new TxOut(myAddress, leftOverAmount);
    return [txOut1, leftOverTx];
  }
};

const findTxOutsForAmount = (
  amount: number,
  myUnspentTxOuts: UnspentTxOut[]
) => {
  let currentAmount = 0;
  const includedUnspentTxOuts = [];
  for (const myUnspentTxOut of myUnspentTxOuts) {
    includedUnspentTxOuts.push(myUnspentTxOut);
    currentAmount = currentAmount + myUnspentTxOut.amount;
    if (currentAmount >= amount) {
      const leftOverAmount = currentAmount - amount;
      return { includedUnspentTxOuts, leftOverAmount };
    }
  }
  throw Error("not enough coins to send transaction");
};

export const createTransaction = (
  receiverAddress: string,
  amount: number,
  privateKey: string,
  unspentTxOuts: UnspentTxOut[],
  txPool: Transaction[]
): Transaction => {
  console.log("txPool: %s", JSON.stringify(txPool));
  const myAddress: string = getPublicKey(privateKey);
  const myUnspentTxOutsA = unspentTxOuts.filter(
    (uTxO: UnspentTxOut) => uTxO.address === myAddress
  );

  const filterTxPoolTxs = (
    unspentTxOuts: UnspentTxOut[],
    transactionPool: Transaction[]
  ): UnspentTxOut[] => {
    const txIns: TxIn[] = _(transactionPool)
      .map((tx: Transaction) => tx.txIns)
      .flatten()
      .value();
    const removable: UnspentTxOut[] = [];
    for (const unspentTxOut of unspentTxOuts) {
      const txIn = _.find(txIns, (aTxIn: TxIn) => {
        return (
          aTxIn.txOutIndex === unspentTxOut.txOutIndex &&
          aTxIn.txOutId === unspentTxOut.txOutId
        );
      });

      if (txIn === undefined) {
      } else {
        removable.push(unspentTxOut);
      }
    }

    return _.without(unspentTxOuts, ...removable);
  };
  const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);

  // filter from unspentOutputs such inputs that are referenced in pool
  const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(
    amount,
    myUnspentTxOuts
  );

  const toUnsignedTxIn = (unspentTxOut: UnspentTxOut) => {
    const txIn: TxIn = new TxIn();
    txIn.txOutId = unspentTxOut.txOutId;
    txIn.txOutIndex = unspentTxOut.txOutIndex;
    return txIn;
  };

  const unsignedTxIns: TxIn[] = includedUnspentTxOuts.map(toUnsignedTxIn);

  const tx: Transaction = new Transaction();
  tx.txIns = unsignedTxIns;
  tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
  tx.id = getTransactionId(tx);

  tx.txIns = tx.txIns.map((txIn: TxIn, index: number) => {
    txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
    return txIn;
  });

  return tx;
};

const findUnspentTxOuts = (
  ownerAddress: string,
  unspentTxOuts: UnspentTxOut[]
) => {
  return _.filter(
    unspentTxOuts,
    (uTxO: UnspentTxOut) => uTxO.address === ownerAddress
  );
};

export const getBalance = (
  address: string,
  unspentTxOuts: UnspentTxOut[]
): number => {
  return _(findUnspentTxOuts(address, unspentTxOuts))
    .map((uTxO: UnspentTxOut) => uTxO.amount)
    .sum();
};
