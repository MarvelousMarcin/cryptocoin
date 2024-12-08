export class Block {
  constructor(
    public index: number,
    public hash: string,
    public previousHash: string,
    public timestamp: number,
    public data: string,
    public difficulty: number,
    public nonce: number,
    public hashBinary?: string
  ) {}
}
