import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';

interface Message {
  id: string;
  role: 'bot' | 'user';
  content: string;
}

export const Chatbot = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Initial message uses translation key
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Set initial greeting when translation is ready or language changes
    setMessages([
      { id: '1', role: 'bot', content: t('chatbot.greeting', 'Hello! I am EnergyGuard AI. Ask me to explain your energy usage, leaks, or CNN predictions!') }
    ]);
  }, [t, i18n.language]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking and streaming response based on language
    setTimeout(() => {
      let botResponse = t('chatbot.analyzing', "I'm analyzing the 1D CNN pipeline... Currently, the aggregate signal shows normal patterns with no active phantom loads.");
      
      if (userMsg.toLowerCase().includes('leak') || userMsg.toLowerCase().includes('കണ്ണ') || userMsg.toLowerCase().includes('கசிவு')) {
         botResponse = t('chatbot.leakResponse', "If you have a leak, our Isolation Forest algorithm will flag it based on historical divergence.");
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', content: botResponse }]);
      setIsTyping(false);
    }, 1500);
  };

  const suggestions = [
    t('chatbot.suggestion1', "Explain CNN"),
    t('chatbot.suggestion2', "Find Leaks"),
    t('chatbot.suggestion3', "Lower Bill")
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
            className="fixed bottom-6 right-6 p-4 bg-brand-primary text-brand-bg rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:scale-110 transition-all z-50 flex items-center justify-center border border-white/20"
          >
            <MessageSquare className="h-6 w-6" />
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
            className="fixed bottom-24 right-6 w-[350px] sm:w-[400px] h-[500px] glass-card flex flex-col overflow-hidden z-50 shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-brand-primary/30"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-secondary to-[#1e293b]/90 border-b border-brand-primary/20 p-4 flex justify-between items-center text-brand-text">
              <div className="flex items-center gap-2">
                <div className="bg-brand-primary/20 p-1.5 rounded-lg border border-brand-primary/30">
                  <Bot className="h-5 w-5 text-brand-primary" />
                </div>
                <span className="font-bold text-sm bg-gradient-to-r from-brand-text to-brand-text-muted bg-clip-text text-transparent">EnergyGuard AI</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-full transition text-brand-text-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-brand-bg/50 space-y-4">
              {messages.map(msg => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}
                >
                  <div className={cn("flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center border", msg.role === 'user' ? "bg-brand-accent/20 border-brand-accent/30" : "bg-brand-primary/20 border-brand-primary/30")}>
                    {msg.role === 'user' ? <User className="h-4 w-4 text-brand-accent" /> : <Bot className="h-4 w-4 text-brand-primary" />}
                  </div>
                  <div className={cn("p-3 rounded-2xl text-sm shadow-sm border", msg.role === 'user' ? "bg-brand-accent/10 border-brand-accent/20 text-brand-text rounded-tr-none" : "glass border-white/10 text-brand-text rounded-tl-none")}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-brand-primary" />
                  </div>
                  <div className="p-4 glass border-white/10 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="h-1.5 w-1.5 bg-brand-primary rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="h-1.5 w-1.5 bg-brand-primary rounded-full" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="h-1.5 w-1.5 bg-brand-primary rounded-full" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-brand-card/90 border-t border-white/10 backdrop-blur-xl">
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                {suggestions.map(s => (
                  <button key={s} onClick={() => { setInput(s); handleSend(); }} className="whitespace-nowrap text-[11px] px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/30 rounded-full transition font-semibold">
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={t('chatbot.placeholder', 'Ask about your energy...')}
                  className="flex-1 bg-brand-bg/80 px-4 py-2.5 rounded-full text-sm outline-none border border-white/10 focus:border-brand-primary/50 transition text-brand-text placeholder:text-brand-text-muted"
                />
                <button className="p-2.5 text-brand-text-muted hover:text-brand-primary transition">
                  <Mic className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2.5 bg-brand-primary text-brand-bg rounded-full hover:bg-brand-primary/80 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(16,185,129,0.2)]"
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
