import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion, AnimatePresence } from 'framer-motion';
import useSound from 'use-sound';
import { Send, Notebook as Robot, Trash2, Plus, Menu, X } from 'lucide-react';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatSession, setChatSession] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  
  const [playMessageSent] = useSound('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
  const [playMessageReceived] = useSound('https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3');

  // Initialize the API only once
  const genAI = useRef(null);
  const model = useRef(null);

  useEffect(() => {
    if (import.meta.env.VITE_GEMINI_API_KEY) {
      genAI.current = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      // Use gemini-1.5-pro or gemini-1.0-pro instead of gemini-pro
      model.current = genAI.current.getGenerativeModel({ model: "gemini-1.5-pro" });
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Load chat history from localStorage
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }
  }, []);

  const startNewChat = async () => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      setError('Please add your Gemini API key to the .env file');
      return;
    }

    try {
      if (!model.current) {
        genAI.current = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
        model.current = genAI.current.getGenerativeModel({ model: "gemini-1.5-pro" });
      }

      const chat = model.current.startChat({
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.9,
          topP: 0.8,
          topK: 40,
        },
      });

      const result = await chat.sendMessage(
        "You are Doraemon, a robotic cat from the future. You should act friendly and occasionally mention your gadgets or your love for dorayaki. Keep responses concise and playful. Respond with: 'Hi! I'm Doraemon!'"
      );
      const initialResponse = await result.response.text();
      
      const newChatId = Date.now().toString();
      const newChat = {
        id: newChatId,
        title: 'New Chat',
        messages: [{ content: initialResponse, sender: 'doraemon' }],
        timestamp: Date.now(),
      };

      setChatHistory(prev => {
        const updated = [newChat, ...prev];
        localStorage.setItem('chatHistory', JSON.stringify(updated));
        return updated;
      });

      setCurrentChatId(newChatId);
      setMessages([{ content: initialResponse, sender: 'doraemon' }]);
      setChatSession(chat);
      playMessageReceived();
    } catch (error) {
      console.error('Error initializing chat:', error);
      setError(`Failed to initialize chat: ${error.message}. Please check your API key and try again.`);
    }
  };

  useEffect(() => {
    if (!currentChatId) {
      startNewChat();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !chatSession || !currentChatId) return;

    setLoading(true);
    const userMessage = input.trim();
    setInput('');
    
    const updatedMessages = [...messages, { content: userMessage, sender: 'user' }];
    setMessages(updatedMessages);
    playMessageSent();

    try {
      setIsTyping(true);
      const result = await chatSession.sendMessage(userMessage);
      const doraemonResponse = await result.response.text();

      setTimeout(() => {
        setIsTyping(false);
        const finalMessages = [...updatedMessages, { content: doraemonResponse, sender: 'doraemon' }];
        setMessages(finalMessages);
        
        // Update chat history
        setChatHistory(prev => {
          const updated = prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: finalMessages, title: userMessage.slice(0, 30) + '...' }
              : chat
          );
          localStorage.setItem('chatHistory', JSON.stringify(updated));
          return updated;
        });
        
        playMessageReceived();
      }, 1000);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { content: "Oops! My gadgets are malfunctioning right now. Let me try to fix them!", sender: 'doraemon' }]);
    }
    setLoading(false);
  };

  const deleteChat = (id) => {
    setChatHistory(prev => {
      const updated = prev.filter(chat => chat.id !== id);
      localStorage.setItem('chatHistory', JSON.stringify(updated));
      return updated;
    });
    if (currentChatId === id) {
      startNewChat();
    }
  };

  const loadChat = (chat) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 bg-white/10 backdrop-blur-lg p-4 transition-transform duration-200 ease-in-out z-30`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Chat History</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-white hover:text-blue-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={startNewChat}
          className="w-full flex items-center gap-2 bg-blue-600 text-white p-2 rounded-lg mb-4 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
        <div className="space-y-2">
          {chatHistory.map(chat => (
            <div
              key={chat.id}
              className={`p-2 rounded-lg cursor-pointer flex justify-between items-center ${
                currentChatId === chat.id ? 'bg-blue-600' : 'bg-white/5 hover:bg-white/10'
              } transition-colors`}
              onClick={() => loadChat(chat)}
            >
              <span className="text-white truncate flex-1">{chat.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="text-white/60 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-0'} transition-all duration-200 flex flex-col`}>
        <div className="app-container relative overflow-hidden flex-1 m-4">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-lg rounded-lg z-0" />
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="chat-header flex items-center gap-2 mb-6">
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
              <img 
                src="https://images.unsplash.com/photo-1624213111452-35e8d3d5cc18?w=128&h=128&fit=crop" 
                alt="Doraemon"
                className="w-12 h-12 rounded-full border-2 border-white"
              />
              <h1 className="text-2xl font-bold text-white">Chat with Doraemon</h1>
            </div>

            {error && (
              <div className="bg-red-500/20 text-white p-4 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="messages bg-white/5 rounded-lg p-4 mb-4 flex-1 overflow-auto">
              <AnimatePresence>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`message ${msg.sender}`}
                  >
                    <div className="message-content flex items-center gap-2">
                      {msg.sender === 'doraemon' && (
                        <Robot className="w-5 h-5 text-blue-500" />
                      )}
                      <span>{msg.content}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="typing-indicator"
                >
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="form-container mt-auto">
              <div className="input-group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={loading || !!error}
                  className="text-white placeholder-white/60"
                />
                <button 
                  type="submit" 
                  disabled={loading || !!error}
                  className="flex items-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;