import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User, Shield } from 'lucide-react';
import { apiRequest } from '../../lib/api/client';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8788";
// Using the known admin ID for admin@test.com as the default support destination
const SUPPORT_ID = "0f1bfe50-06d2-458d-bd54-ac4d47fa9e5e";

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Load user info and history on mount
  useEffect(() => {
    const token = localStorage.getItem("mpp_token");
    if (!token) return;

    // Decode token simple way
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.user_id);
      
      // Load history
      fetchHistory(payload.user_id);
    } catch (e) {
      console.error("Failed to decode token", e);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Connect to SSE when open
  useEffect(() => {
    let es = null;
    
    const initSSE = async () => {
      if (isOpen && !eventSourceRef.current) {
        try {
          // 1. Get short-lived ticket
          const res = await apiRequest('/api/v1/support/authorize', { 
            method: 'POST',
            body: JSON.stringify({ other_id: SUPPORT_ID })
          });
          if (!res.success) throw new Error("Ticket acquisition failed");

          // 2. Connect with ticket
          es = new EventSource(`${API_BASE}/api/v1/support/stream?ticket=${res.ticket}`);
          
          es.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'message') {
                setMessages(prev => {
                  if (prev.some(m => m.id === data.id)) return prev;
                  return [...prev, data];
                });
                if (!isOpen) {
                  setUnreadCount(prev => prev + 1);
                }
              }
            } catch { /* ignore pings */ }
          };

          es.onerror = () => {
            console.error("SSE connection error. Reconnecting...");
            es.close();
            eventSourceRef.current = null;
          };

          eventSourceRef.current = es;
        } catch (e) {
          console.error("Failed to establish SSE:", e);
        }
      }
    };

    initSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isOpen]);

  const fetchHistory = async () => {
    try {
      const res = await apiRequest(`/api/v1/support/history/${SUPPORT_ID}`);
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Optimistic update
    const tempMsg = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      receiver_id: SUPPORT_ID,
      message: messageText,
      created_at: new Date().toISOString(),
      isTemp: true
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await apiRequest('/api/v1/support/message', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: SUPPORT_ID, message: messageText })
      });
    } catch (e) {
      console.error("Send failed", e);
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  return (
    <div className={`floating-chat-container ${isOpen ? 'active' : ''}`}>
      {/* Trigger Button */}
      {!isOpen && (
        <button
          className="chat-trigger-btn d-flex align-items-center gap-2 px-3"
          onClick={() => setIsOpen(true)}
          title="myPilotPost Support"
        >
          <MessageSquare size={18} />
          <span className="fw-bold" style={{ fontSize: '0.75rem' }}>Support</span>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="d-flex align-items-center gap-2">
              <div className="chat-avatar">
                <Shield size={16} />
              </div>
              <div>
                <div className="chat-name">myPilotPost Support</div>
                <div className="chat-status">
                  <span className="status-dot"></span> Online
                </div>
              </div>
            </div>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <MessageSquare size={32} className="mb-2 opacity-25" />
                <p className="small text-muted mb-0">Send a message to get support</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-row ${msg.sender_id === userId ? 'outgoing' : 'incoming'}`}
              >
                {msg.sender_id !== userId && (
                  <div className="bubble-avatar">
                    <Shield size={12} />
                  </div>
                )}
                <div className={`chat-bubble ${msg.sender_id === userId ? 'bubble-out' : 'bubble-in'} ${msg.isTemp ? 'opacity-75' : ''}`}>
                  <div className="bubble-text">{msg.message}</div>
                  <div className="bubble-time">{formatTime(msg.created_at)}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="chat-input-area" onSubmit={handleSend}>
            <input
              type="text"
              className="chat-input"
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={isLoading || !inputValue.trim()}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default FloatingChat;
