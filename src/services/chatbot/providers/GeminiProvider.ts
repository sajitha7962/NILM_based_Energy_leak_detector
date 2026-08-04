import { ChatMessage, ChatProvider } from '../Provider';

export class GeminiProvider implements ChatProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  }

  async sendMessage(history: ChatMessage[], language: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('No Gemini API key provided. Add VITE_GEMINI_API_KEY to your .env file.');
    }

    try {
      // Map history to Gemini's format
      const contents = history.map(msg => ({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // Add a system instruction block to the beginning to enforce language and persona
      const systemInstruction = `You are EnergyGuard AI, a highly intelligent assistant for a household energy monitoring system (1D CNN NILM Pipeline). You must respond strictly in this language code: ${language}. Always keep your responses concise, helpful, and directly related to energy, electricity bills, appliances, or AI detection. Do not use Markdown formatting unless necessary.`;

      contents.unshift({
        role: 'user',
        parts: [{ text: systemInstruction }]
      });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contents
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }
}
