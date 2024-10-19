import { Block } from "./Block";

export class Wallet {
  public version: string;
  public privateKey: string;
  public publicKey: string;
  public balance: number;
  public blockChains: Block[];
  constructor(privateKey: string,publicKey: string) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }
}