import { existsSync, readFileSync, writeFileSync } from 'fs';
import { ec } from 'elliptic';
import { Wallet } from './classes/Wallet';
import { AES, enc } from 'crypto-js';

const walletLocation = 'wallets/wallet' + process.env.HTTP_PORT + '.enc';
const EC = new ec('secp256k1');

let wallet: Wallet | null = null;

export const getWallet = (): Wallet | null => {
  return wallet;
}

export const getOrCreateWallet = (password: string): Wallet | null => {
  if (existsSync(walletLocation)) {
    wallet = readAndDecryptWalletFile(password)
  }
  else {
    wallet = initWallet();
    writeWalletToFile(password);
  }
  console.log(wallet);
  return wallet;
}

const readAndDecryptWalletFile = (password: string): Wallet | null => {
  try {
    const encrypted = readFileSync(walletLocation, 'utf8');
    const bytes = AES.decrypt(encrypted, password);
    const originalText = bytes.toString(enc.Utf8);
    const wallet: Wallet = JSON.parse(originalText);

    if (wallet.version === 'v1.0') {
      console.log('Wallet decrypted successfully.');
      return wallet;
    }
  } catch (error) {
    console.log('Failed to decrypt wallet. The password is incorrect.');
    console.error(error.message);
    return null;
  }
}

const writeWalletToFile = (password: string) => {
  try {
    const jsonWallet = JSON.stringify(wallet);
    const encrypted = AES.encrypt(jsonWallet, password).toString();
    writeFileSync(walletLocation, encrypted);
    console.log('Wallet encrypted and saved to: ' + walletLocation);
  } catch (error) {
    console.log('Something went wrong during saving wallet.');
    console.error(error.message);
    return null;
  }
}

const initWallet = (): Wallet => {
  const keys = generateKeys();
  const newWallet = new Wallet(keys[0], keys[1]);
  newWallet.version = 'v1.0';
  return newWallet;
};

const generateKeys = (): string[] => {
  const keyPair = EC.genKeyPair();
  return [keyPair.getPrivate('hex'), keyPair.getPublic('hex')];
};