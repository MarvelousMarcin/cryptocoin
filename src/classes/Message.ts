export type Message = {
  type: MessageType;
  data: any;
  id: string;
};

export enum MessageType {
  REVERSE_CONNECTION,
  BLOCKCHAIN,
}
