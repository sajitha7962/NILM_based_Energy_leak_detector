export interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  content: string;
  timestamp: number;
}

export interface ChatProvider {
  sendMessage(history: ChatMessage[], language: string): Promise<string>;
}
