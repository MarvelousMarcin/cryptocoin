import { existsSync, readFileSync, writeFileSync } from 'fs';
import { ec } from 'elliptic';
import { KeyPair, Wallet } from './classes/Wallet';
import { encrypt, decrypt } from './encryption';

const walletLocation = 'wallets/wallet' + process.env.HTTP_PORT + '.enc';
const EC = new ec('secp256k1');

let wallet: Wallet | null = null;

export const getWallet = (): Wallet | null => {
  return wallet;
}

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
}

export const initWallet = (password: string): string => {
  if (existsSync(walletLocation)) {
    wallet = readAndDecryptWalletFile(password);
    return wallet ? "Wallet loaded successfully" : "Failed to read wallet"
  }
  wallet = new Wallet(createKeyPair());
  writeWalletToFile(password);
  return "Wallet created successfully";
}

const readAndDecryptWalletFile = (password: string): Wallet | null => {
  try {
    const encrypted = readFileSync(walletLocation);
    const decrypted = decrypt(password, encrypted);
    const wallet: Wallet = JSON.parse(decrypted);
    console.log('Wallet decrypted successfully: ');
    console.log(wallet)
    return wallet;
  } catch (error) {
    console.log('Failed to decrypt wallet, the password is incorrect');
    console.error(error.message);
    return null;
  }
}

const writeWalletToFile = (password: string) => {
  try {
    const jsonWallet = JSON.stringify(wallet);
    const encrypted = encrypt(password, jsonWallet);
    writeFileSync(walletLocation, encrypted);
    console.log('Wallet encrypted and saved to: ' + walletLocation);
    console.log(wallet)
  } catch (error) {
    console.log('Something went wrong during saving wallet');
    console.error(error.message);
    return null;
  }
}

const createKeyPair = (): KeyPair => {
  const keyPair = EC.genKeyPair();
  return new KeyPair(keyPair.getPrivate('hex'), keyPair.getPublic('hex'));
};