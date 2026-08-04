import { ChatMessage, ChatProvider } from './Provider';
import { MockProvider } from './providers/MockProvider';
import { GeminiProvider } from './providers/GeminiProvider';

type ProviderType = 'mock' | 'gemini';

class ChatService {
  private provider: ChatProvider;

  constructor(providerType: ProviderType = 'mock') {
    this.provider = this.createProvider(providerType);
  }

  private createProvider(type: ProviderType): ChatProvider {
    switch (type) {
      case 'gemini':
        return new GeminiProvider();
      case 'mock':
      default:
        return new MockProvider();
    }
  }

  switchProvider(type: ProviderType): void {
    this.provider = this.createProvider(type);
  }

  async sendMessage(history: ChatMessage[], language: string): Promise<string> {
    return this.provider.sendMessage(history, language);
  }
}

// Export a singleton; switch to 'gemini' when API key is added
export const chatService = new ChatService('mock');
