import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Mic, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import { chatService } from '../services/chatbot/ChatService';
import type { ChatMessage } from '../services/chatbot/Provider';

const HISTORY_KEY = 'energyGuardChatHistory';
const MAX_HISTORY = 50;

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]): void {
  try {
    // Keep only the last MAX_HISTORY messages
    const toSave = messages.slice(-MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(toSave));
  } catch {
    // ignore localStorage errors
  }
}

export const Chatbot = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    const saved = loadHistory();
    if (saved.length > 0) {
      setMessages(saved);
    } else {
      // Fresh greeting in current language
      const greeting: ChatMessage = {
        id: 'greeting-1',
        role: 'bot',
        content: t('chatbot.greeting'),
        timestamp: Date.now(),
      };
      setMessages([greeting]);
    }
  }, [t]);

  // Update greeting when language changes (only if there's exactly 1 greeting message)
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'greeting-1') {
        return [{ ...prev[0], content: t('chatbot.greeting') }];
      }
      return prev;
    });
  }, [i18n.language, t]);

  // Persist history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveHistory(messages);
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const msgText = (text ?? input).trim();
    if (!msgText || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msgText,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await chatService.sendMessage(updatedMessages, i18n.language);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: responseText,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'bot',
        content: '⚠️ ' + (i18n.language === 'ta' ? 'பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.'
          : i18n.language === 'te' ? 'లోపం సంభవించింది. దయచేసి మళ్ళీ ప్రయత్నించండి.'
          : i18n.language === 'hi' ? 'एक त्रुटि हुई। कृपया पुनः प्रयास करें।'
          : i18n.language === 'kn' ? 'ದೋಷ ಸಂಭವಿಸಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.'
          : i18n.language === 'ml' ? 'ഒരു പിശക് സംഭവിച്ചു. ദയവായി വീണ്ടും ശ്രമിക്കുക.'
          : 'An error occurred. Please try again.'),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    const greeting: ChatMessage = {
      id: 'greeting-1',
      role: 'bot',
      content: t('chatbot.greeting'),
      timestamp: Date.now(),
    };
    setMessages([greeting]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const suggestions = [
    t('chatbot.suggestion1'),
    t('chatbot.suggestion2'),
    t('chatbot.suggestion3'),
  ];

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            id="chatbot-toggle-btn"
            className="fixed bottom-6 right-6 p-4 bg-brand-primary text-white rounded-full shadow-[0_4px_15px_rgba(249,115,22,0.4)] hover:shadow-[0_4px_25px_rgba(249,115,22,0.6)] hover:scale-110 transition-all z-50 flex items-center justify-center border border-white/50"
          >
            <MessageSquare className="h-6 w-6" />
            {messages.filter(m => m.role === 'bot').length > 1 && (
              <span className="absolute -top-1 -right-1 bg-brand-danger text-white text-[10px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow">
                {Math.min(messages.length, 9)}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[360px] sm:w-[420px] h-[560px] glass-card flex flex-col overflow-hidden z-50 shadow-[0_10px_40px_rgba(249,115,22,0.15)] border border-brand-primary/10"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-primary to-brand-accent p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-sm text-white block">EnergyGuard AI</span>
                  <span className="text-[10px] text-white/70 font-semibold">
                    {isTyping
                      ? (i18n.language === 'ta' ? 'தட்டச்சு செய்கிறது...'
                        : i18n.language === 'te' ? 'టైప్ చేస్తోంది...'
                        : i18n.language === 'hi' ? 'टाइप कर रहा है...'
                        : i18n.language === 'kn' ? 'ಟೈಪ್ ಮಾಡುತ್ತಿದೆ...'
                        : i18n.language === 'ml' ? 'ടൈപ്പ് ചെയ്യുന്നു...'
                        : 'Typing...')
                      : '● Online'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearHistory}
                  className="hover:bg-white/20 p-1.5 rounded-full transition text-white/70 hover:text-white text-[10px] font-bold px-2"
                  title="Clear History"
                >
                  ✕ {i18n.language === 'ta' ? 'அழி' : i18n.language === 'hi' ? 'साफ़' : 'Clear'}
                </button>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition text-white/70 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-brand-bg/30 space-y-4">
              {messages.map(msg => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={cn('flex gap-2 max-w-[88%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}
                >
                  <div className={cn(
                    'flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center border',
                    msg.role === 'user'
                      ? 'bg-brand-accent/20 border-brand-accent/30'
                      : 'bg-white border-brand-primary/20'
                  )}>
                    {msg.role === 'user'
                      ? <User className="h-3.5 w-3.5 text-brand-accent" />
                      : <Bot className="h-3.5 w-3.5 text-brand-primary" />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className={cn(
                      'p-3 rounded-2xl text-sm shadow-sm border leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-brand-primary text-white border-brand-primary/20 rounded-tr-none'
                        : 'bg-white/90 border-brand-primary/10 text-brand-text rounded-tl-none'
                    )}>
                      {msg.content}
                    </div>
                    <div className={cn('flex items-center gap-1 text-[10px] text-brand-text-muted font-medium', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-white border border-brand-primary/20 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-brand-primary" />
                  </div>
                  <div className="p-3 bg-white/90 border border-brand-primary/10 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="h-1.5 w-1.5 bg-brand-primary rounded-full" />
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="h-1.5 w-1.5 bg-brand-primary rounded-full" />
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="h-1.5 w-1.5 bg-brand-primary rounded-full" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            <div className="px-3 pt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide bg-white/60 border-t border-brand-primary/10">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={isTyping}
                  className="whitespace-nowrap text-[11px] px-3 py-1.5 bg-white hover:bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-sm rounded-full transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 bg-white/80 border-t border-brand-primary/10 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={t('chatbot.placeholder')}
                  disabled={isTyping}
                  className="flex-1 bg-white/70 px-4 py-2.5 rounded-full text-sm outline-none border border-brand-primary/10 focus:border-brand-primary/40 transition text-brand-text placeholder:text-brand-text-muted shadow-sm disabled:opacity-50"
                />
                <button
                  className="p-2.5 text-brand-text-muted hover:text-brand-primary transition"
                  title="Voice input (coming soon)"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="p-2.5 bg-brand-primary text-white rounded-full hover:bg-brand-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(249,115,22,0.3)]"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
