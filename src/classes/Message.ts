export type Message = {
  type: MessageType;
  data: any;
  id: string;
  senderPort?: string;
};

export enum MessageType {
  REVERSE_CONNECTION,
  BLOCKCHAIN,
  QUERY_CHAIN,
  LATEST_BLOCK,
  QUERY_TRANSACTION_POOL,
  RESPONSE_TRANSACTION_POOL,
}
