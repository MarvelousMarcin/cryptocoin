import { Block } from "./Block";

export class Wallet {
  public keys: KeyPair[];
  public publicKey: string;
  public balance: number;
  public blockChains: Block[];
  constructor(keyPair: KeyPair) {
    this.keys = [keyPair];
  }
}

export class KeyPair {
  public privateKey: string;
  public publicKey: string;
  constructor(privateKey: string, publicKey: string) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }
}