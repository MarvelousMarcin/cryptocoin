export class UnspentTxOut {
  public readonly txOutId: string;
  public readonly txOutIndex: number;
  public readonly address: string;
  public readonly amount: number;

  constructor(
    txOutId: string,
    txOutIndex: number,
    address: string,
    amount: number
  ) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.address = address;
    this.amount = amount;
  }
}

export class TxIn {
  public txOutId: string;
  public txOutIndex: number;
  public signature: string;
}

export class TxOut {
  public address: string;
  public amount: number;

  constructor(address: string, amount: number) {
    this.address = address;
    this.amount = amount;
  }
}

export class Transaction {
  public id: string;

  public txIns: TxIn[];
  public txOuts: TxOut[];
}
