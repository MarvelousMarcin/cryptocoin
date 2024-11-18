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
}
