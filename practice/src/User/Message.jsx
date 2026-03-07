// Message.jsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import PropTypes from 'prop-types';

// Constants
const MESSAGE_TYPES = {
  FLOOR: "floor",
  ADMIN: "admin"
};

const FLOORS = [
  "Ground Floor",
  "Second Floor",
  "Fourth Floor",
  "Fifth Floor"
];

const SOCKET_EVENTS = {
  NEW_MESSAGE: "newMessage",
  UNREAD_UPDATE: "unreadCountUpdate",
  REFRESH_UNREAD: "refresh-unread-counts",
  MESSAGE_SENT: "messageSent"
};

const socket = io(`${import.meta.env.VITE_API_URL}`);

// Utility Functions
const formatTime = (iso) => {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (iso) => {
  const date = new Date(iso);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const isToday = (iso) => {
  const date = new Date(iso);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const isYesterday = (iso) => {
  const date = new Date(iso);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

// Message Bubble Component
const MessageBubble = ({ message, isOwn, isUnread, activeTab, user, formatTime }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 animate-in slide-in-from-bottom-2 duration-300`}>
      <div className={`max-w-[85%] lg:max-w-[65%] rounded-2xl p-3 shadow-sm relative ${
        isOwn 
          ? activeTab === MESSAGE_TYPES.FLOOR 
            ? 'bg-[#0084ff] text-white rounded-br-none' 
            : 'bg-[#0084ff] text-white rounded-br-none'
          : 'bg-[#f0f2f5] text-gray-800 rounded-bl-none'
      }`}>
        {/* Sender Name for group messages */}
        {!isOwn && message.senderName !== 'Admin' && (
          <div className="text-xs font-semibold text-[#65676b] mb-1">
            {message.senderName}
          </div>
        )}
        
        {/* Message Content */}
        <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
          {message.content}
        </div>
        
        {/* Message Footer */}
        <div className={`flex items-center justify-end gap-1 mt-1 text-[11px] ${
          isOwn ? 'text-[#e6f2ff]' : 'text-[#65676b]'
        }`}>
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* Unread Indicator */}
        {isUnread && !isOwn && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#31a24c] rounded-full border-2 border-white"></div>
        )}
      </div>
    </div>
  );
};

// Date Separator Component
const DateSeparator = ({ date }) => {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-[#e4e6eb] text-[#65676b] text-xs px-3 py-1 rounded-full font-medium">
        {isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : formatDate(date)}
      </div>
    </div>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="flex justify-center items-center h-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0084ff] border-t-transparent mx-auto mb-3"></div>
      <p className="text-sm text-[#65676b]">Loading messages...</p>
    </div>
  </div>
);

// Empty State
const EmptyState = () => (
  <div className="flex justify-center items-center h-full">
    <div className="text-center text-[#65676b] max-w-sm px-4">
      <div className="text-5xl mb-3 opacity-40">💬</div>
      <h3 className="text-base font-semibold mb-1 text-[#050505]">No messages yet</h3>
      <p className="text-sm text-[#65676b]">Start a conversation by sending a message below!</p>
    </div>
  </div>
);

// Conversation List Item
const ConversationItem = ({ floor, isSelected, unreadCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 hover:bg-[#f0f2f5] transition-colors duration-200 ${
        isSelected ? 'bg-[#e7f3ff]' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isSelected ? 'bg-[#0084ff] text-white' : 'bg-[#e4e6eb] text-[#050505]'
        }`}>
          <span className="text-lg font-semibold">
            {floor.charAt(0)}
          </span>
        </div>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#ff3b30] text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <div className="ml-3 flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h3 className={`font-semibold text-sm truncate ${
            isSelected ? 'text-[#0084ff]' : 'text-[#050505]'
          }`}>
            {floor} Reception
          </h3>
        </div>
        <p className="text-xs text-[#65676b] truncate mt-0.5">
          {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'No new messages'}
        </p>
      </div>
    </button>
  );
};

// Admin Conversation Item
const AdminConversationItem = ({ isSelected, unreadCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 hover:bg-[#f0f2f5] transition-colors duration-200 ${
        isSelected ? 'bg-[#e7f3ff]' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isSelected ? 'bg-[#0084ff] text-white' : 'bg-[#e4e6eb] text-[#050505]'
        }`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#ff3b30] text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <div className="ml-3 flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h3 className={`font-semibold text-sm truncate ${
            isSelected ? 'text-[#0084ff]' : 'text-[#050505]'
          }`}>
            Administration
          </h3>
        </div>
        <p className="text-xs text-[#65676b] truncate mt-0.5">
          {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Contact admin support'}
        </p>
      </div>
    </button>
  );
};

function Message({ user, setView, currentView }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("Ground Floor");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(MESSAGE_TYPES.FLOOR);
  const [unreadCounts, setUnreadCounts] = useState({
    floor: 0,
    admin: 0
  });
  const [floorUnreadCounts, setFloorUnreadCounts] = useState({});
  const [unreadMessageIds, setUnreadMessageIds] = useState(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileConversations, setShowMobileConversations] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMobileConversations(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [newMessage]);

  // Memoized calculations
  const getCurrentUnreadCount = useCallback(() => {
    if (activeTab === MESSAGE_TYPES.FLOOR) {
      return floorUnreadCounts[selectedFloor] || 0;
    } else {
      return unreadCounts.admin;
    }
  }, [activeTab, selectedFloor, floorUnreadCounts, unreadCounts]);

  const isMessageUnread = useCallback((messageId) => {
    return unreadMessageIds.has(messageId);
  }, [unreadMessageIds]);

  const groupMessagesByDate = useCallback(() => {
    const groups = {};
    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  }, [messages]);

  const messageGroups = useMemo(() => groupMessagesByDate(), [groupMessagesByDate]);

  // API Functions
  const fetchAllUnreadCounts = async () => {
    if (!user?._id) return;

    try {
      const floorCounts = {};
      
      for (const floor of FLOORS) {
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/messages/unread-count/${user._id}/${floor}`
          );
          floorCounts[floor] = response.data.count || 0;
        } catch (err) {
          console.error(`Failed to fetch unread count for ${floor}:`, err);
          floorCounts[floor] = 0;
        }
      }

      setFloorUnreadCounts(floorCounts);

      const totalFloorUnread = Object.values(floorCounts).reduce((sum, count) => sum + count, 0);
      
      const adminResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/unread-count/${user._id}/admin`
      );

      setUnreadCounts({
        floor: totalFloorUnread,
        admin: adminResponse.data.count || 0
      });
    } catch (err) {
      console.error("Failed to fetch unread counts:", err);
      setUnreadCounts({ floor: 0, admin: 0 });
      
      const initialCounts = {};
      FLOORS.forEach(floor => {
        initialCounts[floor] = 0;
      });
      setFloorUnreadCounts(initialCounts);
    }
  };

  const fetchUnreadMessages = async () => {
    if (!user?._id) return;
    
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/unread-messages/${user._id}`
      );
      
      if (response.data.success) {
        const unreadIds = response.data.unreadMessages.map(msg => msg._id);
        setUnreadMessageIds(new Set(unreadIds));
      }
    } catch (error) {
      console.error("Failed to fetch unread messages from cloud:", error);
    }
  };

  const markConversationAsRead = async () => {
    try {
      let receiver = activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : "admin";
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/mark-conversation-read`, {
        userId: user._id,
        receiver: receiver,
        conversationType: activeTab
      });
      
      if (response.data.success) {
        setUnreadMessageIds(new Set());
        await fetchAllUnreadCounts();
        await fetchUnreadMessages();
      }
    } catch (error) {
      console.warn("Failed to mark conversation as read in cloud:", error.message);
    }
  };

  // Socket and Data Fetching
  useEffect(() => {
    if (!user?._id) return;

    let isMounted = true;

    socket.emit("join", { userId: user._id });
    socket.emit("join", { userId: user.floor });
    socket.emit("join", { userId: "admin" });

    const initializeData = async () => {
      if (!isMounted) return;
      
      await fetchAllUnreadCounts();
      await fetchUnreadMessages();
      
      if (activeTab === MESSAGE_TYPES.FLOOR) {
        await fetchMessages();
      } else {
        await fetchAdminMessages();
      }
    };

    initializeData();

    const handleNewMessage = (msg) => {
      if (!isMounted) return;
      
      setMessages(prev => {
        const filtered = prev.filter(m =>
          !(m.status === "sending" &&
            m.content === msg.content &&
            m.sender === msg.sender)
        );
        const exists = filtered.find(m => m._id === msg._id);
        if (exists) return filtered;
        
        if (activeTab === MESSAGE_TYPES.FLOOR) {
          const isRelevant =
            (msg.receiver === user._id && msg.floor === selectedFloor) ||
            (msg.sender === user._id && msg.receiver === selectedFloor) ||
            (msg.floor === selectedFloor && msg.sender !== user._id) ||
            (msg.floor === selectedFloor && msg.receiver === user._id);

          if (isRelevant) {
            if (msg.sender !== user._id) {
              setUnreadMessageIds(prev => {
                const newUnreads = new Set(prev);
                newUnreads.add(msg._id);
                return newUnreads;
              });
              
              if (msg.floor === selectedFloor) {
                setFloorUnreadCounts(prev => ({
                  ...prev,
                  [msg.floor]: (prev[msg.floor] || 0) + 1
                }));
                
                setUnreadCounts(prev => ({
                  ...prev,
                  floor: prev.floor + 1
                }));
              }
            }
            return [...filtered, msg];
          }
        } else if (activeTab === MESSAGE_TYPES.ADMIN) {
          const isRelevant =
            (msg.sender === user._id && msg.receiver === "admin") ||
            (msg.sender === "admin" && msg.receiver === user._id) ||
            (msg.receiver === user._id && msg.sender === "admin");

          if (isRelevant) {
            if (msg.sender !== user._id) {
              setUnreadMessageIds(prev => {
                const newUnreads = new Set(prev);
                newUnreads.add(msg._id);
                return newUnreads;
              });
              
              setUnreadCounts(prev => ({
                ...prev,
                admin: prev.admin + 1
              }));
            }
            return [...filtered, msg];
          }
        }
        return filtered;
      });
    };

    const handleUnreadCountUpdate = (data) => {
      if (isMounted && data.userId === user._id) {
        fetchAllUnreadCounts();
        fetchUnreadMessages();
      }
    };

    const handleMessageSent = (msg) => {
      if (!isMounted) return;
      
      setMessages(prev => prev.map(m => 
        m.status === "sending" && m.content === msg.content 
          ? { ...msg, status: "sent" }
          : m
      ));
    };

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on(SOCKET_EVENTS.UNREAD_UPDATE, handleUnreadCountUpdate);
    socket.on(SOCKET_EVENTS.REFRESH_UNREAD, handleUnreadCountUpdate);
    socket.on(SOCKET_EVENTS.MESSAGE_SENT, handleMessageSent);

    return () => {
      isMounted = false;
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off(SOCKET_EVENTS.UNREAD_UPDATE, handleUnreadCountUpdate);
      socket.off(SOCKET_EVENTS.REFRESH_UNREAD, handleUnreadCountUpdate);
      socket.off(SOCKET_EVENTS.MESSAGE_SENT, handleMessageSent);
    };
  }, [user, selectedFloor, activeTab]);

  useEffect(() => {
    if (user?._id) {
      fetchAllUnreadCounts();
      fetchUnreadMessages();
    }
  }, [activeTab, selectedFloor, user?._id]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/floor-conversation/${user._id}/${selectedFloor}`
      );
      setMessages(data);
      // Mark as read when fetching
      await markConversationAsRead();
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminMessages = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/user-admin-conversation/${user._id}`
      );
      setMessages(data);
      // Mark as read when fetching
      await markConversationAsRead();
    } catch (err) {
      console.error("Failed to fetch admin messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const tempMsg = {
      _id: "temp-" + Date.now(),
      sender: user._id,
      receiver: activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : "admin",
      content: newMessage,
      createdAt: new Date().toISOString(),
      status: "sending",
      senderName: user.name,
      floor: activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : undefined
    };

    setMessages(prev => [...prev, tempMsg]);
    const messageToSend = newMessage;
    setNewMessage("");

    try {
      if (activeTab === MESSAGE_TYPES.FLOOR) {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/send-to-floor`, {
          userId: user._id,
          floor: selectedFloor,
          content: messageToSend
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/send-to-admin`, {
          userId: user._id,
          content: messageToSend
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages(prev => prev.map(msg => 
        msg._id === tempMsg._id ? { ...msg, status: "failed" } : msg
      ));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMessages([]);
    if (tab === MESSAGE_TYPES.FLOOR) {
      fetchMessages();
    } else {
      fetchAdminMessages();
    }
    if (isMobile) {
      setShowMobileConversations(false);
    }
  };

  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setMessages([]);
    fetchMessages();
    if (isMobile) {
      setShowMobileConversations(false);
    }
  };

  return (
    <main className="mr-0 lg:mr-[250px] w-full lg:w-[calc(100%-250px)] h-screen flex flex-col bg-white">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 px-4 h-[60px] flex items-center shadow-sm">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            {isMobile && (
              <button
                onClick={() => setShowMobileConversations(!showMobileConversations)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-semibold text-[#050505]">Messages</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area - Now on the left */}
        <div className="flex-1 flex flex-col bg-[#f0f2f5] relative order-1">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#e4e6eb] flex items-center justify-center">
                {activeTab === MESSAGE_TYPES.FLOOR ? (
                  <span className="text-lg font-semibold text-[#050505]">
                    {selectedFloor.charAt(0)}
                  </span>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="font-semibold text-[#050505]">
                  {activeTab === MESSAGE_TYPES.FLOOR ? `${selectedFloor} Reception` : 'Administration'}
                </h2>
                <p className="text-xs text-[#65676b]">
                  {getCurrentUnreadCount() > 0 ? `${getCurrentUnreadCount()} unread` : 'Active now'}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4"
            style={{ scrollbarWidth: 'thin' }}
          >
            {loading ? (
              <LoadingSkeleton />
            ) : messages.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-2">
                {Object.entries(messageGroups).map(([date, dateMessages]) => (
                  <div key={date}>
                    <DateSeparator date={date} />
                    {dateMessages.map(msg => (
                      <MessageBubble
                        key={msg._id}
                        message={msg}
                        isOwn={msg.sender === user._id}
                        isUnread={isMessageUnread(msg._id)}
                        activeTab={activeTab}
                        user={user}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input - Full width with only send button */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-end space-x-2">
              <div className="flex-1 bg-[#f0f2f5] rounded-2xl px-4 py-2">
                <textarea
                  ref={textareaRef}
                  placeholder={`Message ${activeTab === MESSAGE_TYPES.FLOOR ? selectedFloor : 'Admin'}...`}
                  className="w-full bg-transparent outline-none resize-none text-sm max-h-[100px]"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  rows={1}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className={`p-3 rounded-full transition-colors flex-shrink-0 ${
                  newMessage.trim() 
                    ? 'text-[#0084ff] hover:bg-[#e7f3ff]' 
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Conversations Sidebar - Now on the right */}
        <div className={`
          ${isMobile 
            ? showMobileConversations 
              ? 'fixed inset-0 z-50 bg-white' 
              : 'hidden'
            : 'w-[360px] border-l border-gray-200 bg-white'
          } flex flex-col h-full order-2`}
        >
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange(MESSAGE_TYPES.FLOOR)}
              className={`flex-1 py-4 text-sm font-medium relative ${
                activeTab === MESSAGE_TYPES.FLOOR
                  ? 'text-[#0084ff]'
                  : 'text-gray-600'
              }`}
            >
              Floors
              {activeTab === MESSAGE_TYPES.FLOOR && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0084ff]"></div>
              )}
            </button>
            <button
              onClick={() => handleTabChange(MESSAGE_TYPES.ADMIN)}
              className={`flex-1 py-4 text-sm font-medium relative ${
                activeTab === MESSAGE_TYPES.ADMIN
                  ? 'text-[#0084ff]'
                  : 'text-gray-600'
              }`}
            >
              Admin
              {activeTab === MESSAGE_TYPES.ADMIN && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0084ff]"></div>
              )}
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === MESSAGE_TYPES.FLOOR ? (
              // Floor Conversations
              FLOORS.map(floor => (
                <ConversationItem
                  key={floor}
                  floor={floor}
                  isSelected={selectedFloor === floor}
                  unreadCount={floorUnreadCounts[floor] || 0}
                  onClick={() => handleFloorSelect(floor)}
                />
              ))
            ) : (
              // Admin Conversation
              <AdminConversationItem
                isSelected={true}
                unreadCount={unreadCounts.admin}
                onClick={() => handleTabChange(MESSAGE_TYPES.ADMIN)}
              />
            )}
          </div>

          {/* Mobile Close Button */}
          {isMobile && showMobileConversations && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => setShowMobileConversations(false)}
                className="w-full py-2 bg-[#0084ff] text-white rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

Message.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    floor: PropTypes.string.isRequired
  }).isRequired,
  setView: PropTypes.func.isRequired,
  currentView: PropTypes.string.isRequired
};

export default Message;