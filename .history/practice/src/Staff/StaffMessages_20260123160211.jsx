import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import StaffNavigation from "./StaffNavigation";

const socket = io(`${import.meta.env.VITE_API_URL}`);

function StaffMessages({ setView, staff, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("floor");
  const [searchTerm, setSearchTerm] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  // Fetch total unread count for staff
  const fetchTotalUnreadCount = async () => {
    if (!staff?._id) return;
    
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/staff-total-unread/${staff._id}`
      );
      setTotalUnread(data.count || 0);
    } catch (err) {
      console.error("Failed to fetch total unread count:", err);
      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/messages/unread-count/${staff._id}`
        );
        setTotalUnread(data.count || 0);
      } catch (fallbackErr) {
        console.error("Failed to fetch fallback unread count:", fallbackErr);
        setTotalUnread(0);
      }
    }
  };

  // Fetch conversations with proper unread counts
  const fetchConversations = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/floor-users/${staff.floor}`
      );
      
      const conversationsWithUnread = await Promise.all(
        data.map(async (conv) => {
          try {
            const { data: unreadData } = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/messages/unread-count-by-user/${staff._id}/${conv._id}`
            );
            return { ...conv, unreadCount: unreadData.count || 0 };
          } catch (err) {
            console.error(`Failed to fetch unread count for ${conv._id}:`, err);
            return { ...conv, unreadCount: 0 };
          }
        })
      );
      
      setConversations(conversationsWithUnread);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  };

  // Mark messages as read for a specific user
  const markMessagesAsRead = async (userId) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/messages/mark-read`, {
        staffId: staff._id,
        userId: userId
      });
      
      fetchTotalUnreadCount();
      fetchConversations();
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  };

  // Mark admin messages as read
  const markAdminMessagesAsRead = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/messages/mark-read`, {
        userId: staff._id,
        conversationId: "admin"
      });
      
      fetchTotalUnreadCount();
    } catch (err) {
      console.error("Failed to mark admin messages as read:", err);
    }
  };

  // Update unread counts locally when staff sends a message
  const updateUnreadCountsAfterSend = () => {
    fetchTotalUnreadCount();
    
    if (activeTab === "floor") {
      fetchConversations();
      
      if (selectedUser) {
        setConversations(prev => 
          prev.map(conv => 
            conv._id === selectedUser._id 
              ? { ...conv, unreadCount: 0 } 
              : conv
          )
        );
        
        setSelectedUser(prev => prev ? { ...prev, unreadCount: 0 } : null);
      }
    }
  };

  // FIXED: Improved Socket event handling for instant message updates
  useEffect(() => {
    if (!staff?._id) return;

    // Join staff's personal room and floor room
    socket.emit("join", { userId: staff._id });
    socket.emit("join", { userId: staff.floor });

    // Fetch initial data
    fetchTotalUnreadCount();
    if (activeTab === "floor") {
      fetchConversations();
    } else {
      fetchAdminConversation();
    }

    const handleNewMessage = (msg) => {
      console.log("📨 New message received in StaffMessages:", msg);
      
      // Update total unread count
      fetchTotalUnreadCount();
      
      // Update conversations list for floor tab
      if (activeTab === "floor") {
        fetchConversations();
      }
      
      // Update admin conversation if relevant
      if (activeTab === "admin") {
        fetchAdminConversation();
      }
      
      // Add message to current chat if it belongs to the active conversation
      if (activeTab === "floor" && selectedUser) {
        const isRelevantMessage = 
          (msg.sender === selectedUser._id && msg.receiver === staff._id) ||
          (msg.sender === staff._id && msg.receiver === selectedUser._id) ||
          (msg.floor === staff.floor && msg.receiver === selectedUser._id) ||
          (msg.sender === selectedUser._id && msg.floor === staff.floor) ||
          (msg.receiver === staff.floor && msg.sender === selectedUser._id);

        if (isRelevantMessage) {
          setMessages(prev => {
            const filtered = prev.filter(m => 
              !(m.status === "sending" && m.content === msg.content && m.sender === msg.sender)
            );
            
            const exists = filtered.some(m => m._id === msg._id);
            if (!exists) {
              console.log("✅ Adding new message to current conversation:", msg);
              return [...filtered, msg];
            }
            return filtered;
          });
          
          // Mark as read if staff is viewing the conversation
          if (msg.sender !== staff._id) {
            markMessagesAsRead(selectedUser._id);
          }
        }
      }
      
      if (activeTab === "admin") {
        const isRelevantAdminMessage = 
          (msg.sender === "admin" && msg.receiver === staff._id) ||
          (msg.sender === staff._id && msg.receiver === "admin");

        if (isRelevantAdminMessage) {
          setMessages(prev => {
            const messageExists = prev.some(m => m._id === msg._id);
            if (!messageExists) {
              console.log("✅ Adding new admin message:", msg);
              return [...prev, msg];
            }
            return prev;
          });
          
          // Mark as read if staff is viewing admin conversation
          if (msg.sender === "admin") {
            markAdminMessagesAsRead();
          }
        }
      }
    };

    const handleUnreadCountUpdate = (data) => {
      if (data.userId === staff._id) {
        setTotalUnread(data.count);
        if (activeTab === "floor") {
          fetchConversations();
        }
      }
    };

    const handleConversationUnreadUpdate = (data) => {
      if (data.staffId === staff._id) {
        setConversations(prev => 
          prev.map(conv => 
            conv._id === data.userId 
              ? { ...conv, unreadCount: data.count || 0 } 
              : conv
          )
        );
        
        if (selectedUser && selectedUser._id === data.userId) {
          setSelectedUser(prev => prev ? { ...prev, unreadCount: data.count || 0 } : null);
        }
        
        fetchTotalUnreadCount();
      }
    };

    // FIXED: Enhanced socket event listeners with error handling
    socket.on("newMessage", handleNewMessage);
    socket.on("unreadCountUpdate", handleUnreadCountUpdate);
    socket.on("conversationUnreadUpdate", handleConversationUnreadUpdate);
    
    // NEW: Handle message sent confirmation
    socket.on("messageSent", (msg) => {
      console.log("✅ Message sent confirmation:", msg);
      setMessages(prev => prev.map(m => 
        m.status === "sending" && m.content === msg.content 
          ? { ...msg, status: "sent" }
          : m
      ));
    });
    
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("unreadCountUpdate", handleUnreadCountUpdate);
      socket.off("conversationUnreadUpdate", handleConversationUnreadUpdate);
      socket.off("messageSent");
    };
  }, [staff, selectedUser, activeTab]);

  const fetchAdminConversation = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/staff-admin-conversation/${staff._id}`
      );
      setMessages(data);
      
      await markAdminMessagesAsRead();
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (err) {
      console.error("Failed to fetch admin conversation:", err);
    }
  };

  const fetchUserConversation = async (user) => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/staff-user-conversation/${staff._id}/${user._id}`
      );
      setMessages(data);
      
      await markMessagesAsRead(user._id);
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (err) {
      console.error("Failed to fetch user conversation:", err);
    }
  };

  const selectUser = async (user) => {
    setSelectedUser(user);
    setLoading(true);
    
    try {
      await fetchUserConversation(user);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedUser(null);
    setMessages([]);
    setNewMessage("");
    
    if (tab === "admin") {
      fetchAdminConversation();
    } else {
      fetchConversations();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // FIXED: Improved sendMessage function
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    let tempMsg;
    
    if (activeTab === "floor" && selectedUser) {
      tempMsg = {
        _id: "temp-" + Date.now(),
        sender: staff._id,
        receiver: selectedUser._id,
        content: newMessage,
        createdAt: new Date().toISOString(),
        status: "sending",
        senderName: `${staff.floor} Staff`,
        displayName: `${staff.floor} Staff`,
        floor: staff.floor
      };

      setMessages(prev => [...prev, tempMsg]);
      setNewMessage("");

      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/staff-reply`, {
          staffId: staff._id,
          userId: selectedUser._id,
          content: newMessage,
          floor: staff.floor
        });
        
        updateUnreadCountsAfterSend();
        
      } catch (err) {
        console.error("Failed to send message:", err);
        setMessages(prev => prev.map(msg => 
          msg._id === tempMsg._id ? { ...msg, status: "failed" } : msg
        ));
      }
    } else if (activeTab === "admin") {
      tempMsg = {
        _id: "temp-" + Date.now(),
        sender: staff._id,
        receiver: "admin",
        content: newMessage,
        createdAt: new Date().toISOString(),
        status: "sending",
        senderName: staff.name,
        displayName: staff.name
      };

      setMessages(prev => [...prev, tempMsg]);
      setNewMessage("");

      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/staff-to-admin`, {
          staffId: staff._id,
          content: newMessage
        });
        
        fetchTotalUnreadCount();
        
      } catch (err) {
        console.error("Failed to send message to admin:", err);
        setMessages(prev => prev.map(msg => 
          msg._id === tempMsg._id ? { ...msg, status: "failed" } : msg
        ));
      }
    }
  };

  const formatTime = (iso) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso) => {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(msg => {
      const date = formatDate(msg.createdAt);
      if (!groups[date]) groups[date] = [];
      
      const messageExists = groups[date].some(m => m._id === msg._id);
      if (!messageExists) {
        groups[date].push(msg);
      }
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  // Enhanced Loading States
  const ConversationSkeleton = () => (
    <div className="w-full p-3 rounded-xl mb-2 bg-gradient-to-r from-gray-50 to-gray-100 animate-pulse border border-gray-200">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-300 rounded w-32"></div>
          <div className="h-3 bg-gray-300 rounded w-48"></div>
        </div>
        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );

  return (
    <>
      <StaffNavigation setView={setView} currentView="staffMessages" staff={staff} onLogout={onLogout} />
      
      <div className="ml-[250px] w-[calc(100%-250px)] h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        {/* ENHANCED HEADER */}
        <header className="bg-white px-8 py-5 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-2xl">
                  <svg className="w-6 h-6 text-[#CC0000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Message Center</h1>
                  <p className="text-gray-600 text-sm mt-1">Communicate with residents and administration</p>
                </div>
              </div>
            </div>
            
            {/* Unread notifications */}
            <div className="flex items-center space-x-4">
              {totalUnread > 0 && (
                <div className="relative">
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#CC0000] to-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-bounce">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                </div>
              )}
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">Floor {staff.floor}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden p-4 space-x-4">
          {/* Enhanced Conversations Sidebar */}
          <div className="w-96 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Conversations</h2>
                <span className="bg-gradient-to-r from-red-50 to-red-100 text-red-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {filteredConversations.length} contacts
                </span>
              </div>
              
              {/* Enhanced Search Bar */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-3 focus:ring-red-500/20 focus:border-red-400 transition-all duration-200 text-sm shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Enhanced Tab Buttons */}
              <div className="flex bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1 border border-gray-200">
                <button
                  onClick={() => handleTabChange("floor")}
                  className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer flex items-center justify-center space-x-2 ${
                    activeTab === "floor" 
                      ? "bg-gradient-to-r from-[#CC0000] to-red-600 text-white shadow-lg transform scale-[1.02] shadow-red-200" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 2.5l2.5 2.5" />
                  </svg>
                  <span>Residents</span>
                </button>
                <button
                  onClick={() => handleTabChange("admin")}
                  className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer flex items-center justify-center space-x-2 ${
                    activeTab === "admin" 
                      ? "bg-gradient-to-r from-[#CC0000] to-red-600 text-white shadow-lg transform scale-[1.02] shadow-red-200" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Admin</span>
                </button>
              </div>
            </div>
            
            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-3">
              {activeTab === "floor" ? (
                loading ? (
                  <>
                    <ConversationSkeleton />
                    <ConversationSkeleton />
                    <ConversationSkeleton />
                  </>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center p-8">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No conversations found</h3>
                    <p className="text-gray-500 text-sm">
                      {searchTerm ? "Try different search terms" : "Residents will appear here"}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <button
                      key={conv._id}
                      onClick={() => selectUser(conv)}
                      className={`w-full text-left p-4 rounded-2xl mb-2 transition-all duration-300 cursor-pointer group transform hover:scale-[1.02] ${
                        selectedUser?._id === conv._id 
                          ? 'bg-gradient-to-r from-red-50 to-yellow-50 border-2 border-red-200 shadow-xl ring-2 ring-red-100' 
                          : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          {/* Avatar with status indicator */}
                          <div className="relative">
                            <div className="w-14 h-14 bg-gradient-to-r from-[#CC0000] to-red-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                              {conv.name.charAt(0).toUpperCase()}
                            </div>
                            {conv.unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#CC0000] to-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-gray-900 text-sm truncate">
                                {conv.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {conv.latestMessageAt ? formatTime(conv.latestMessageAt) : ''}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 truncate mb-1">
                              {conv.latestMessage || "Start a conversation..."}
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${conv.unreadCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
                              <span className="text-xs text-gray-500">
                                {conv.unreadCount > 0 ? `${conv.unreadCount} unread` : 'All read'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )
              ) : (
                <div className="p-4">
                  <div 
                    onClick={() => handleTabChange("admin")}
                    className={`bg-gradient-to-r from-red-50 to-yellow-50 border-2 border-red-200 rounded-2xl p-5 cursor-pointer transition-all duration-300 group hover:shadow-xl ${
                      activeTab === "admin" && !selectedUser ? 'ring-2 ring-red-300 shadow-lg' : 'hover:scale-[1.02]'
                    }`}
                  >
                    <div className="flex items-center mb-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-[#CC0000] to-red-600 rounded-2xl flex items-center justify-center text-white mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-bold text-red-900 text-lg">Admin Support</span>
                        <p className="text-sm text-red-700">Always available to help</p>
                      </div>
                    </div>
                    <div className="bg-white/50 rounded-xl p-3">
                      <p className="text-sm text-red-800 leading-relaxed">
                        Contact system administrators for technical support, questions, or any assistance you need.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Chat Area */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {activeTab === "floor" && selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-gray-50 to-white p-5 border-b border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-r from-[#CC0000] to-red-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-gray-900">{selectedUser.name}</h3>
                        <p className="text-gray-600 text-sm">Resident • Floor {staff.floor}</p>
                      </div>
                    </div>
                    {selectedUser.unreadCount > 0 && (
                      <div className="bg-gradient-to-r from-[#CC0000] to-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg animate-pulse">
                        {selectedUser.unreadCount} unread message{selectedUser.unreadCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Messages Area */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white"
                >
                  <div className="p-6">
                    {loading ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#CC0000] border-t-transparent mx-auto mb-4"></div>
                          <p className="text-gray-600 font-medium text-sm">Loading conversation...</p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="text-center text-gray-500 max-w-md">
                          <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-r from-red-50 to-yellow-50 rounded-3xl flex items-center justify-center">
                            <svg className="w-16 h-16 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-700 mb-3">Start a conversation</h3>
                          <p className="text-gray-600 mb-6">Introduce yourself and let {selectedUser.name} know you're here to help.</p>
                          <button 
                            onClick={() => textareaRef.current?.focus()}
                            className="bg-gradient-to-r from-[#CC0000] to-red-600 text-white px-8 py-3.5 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
                          >
                            Send your first message
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-4xl mx-auto space-y-8">
                        {Object.entries(messageGroups).map(([date, dateMessages]) => (
                          <div key={date}>
                            <div className="flex justify-center mb-6">
                              <div className={`px-4 py-2 rounded-full text-xs font-semibold shadow-sm ${
                                date === "Today" 
                                  ? "bg-gradient-to-r from-red-100 to-red-50 text-red-800" 
                                  : "bg-gray-100 text-gray-700"
                              }`}>
                                {date}
                              </div>
                            </div>
                            <div className="space-y-3">
                              {dateMessages.map(msg => (
                                <div key={msg._id} className={`flex ${msg.sender === staff._id ? 'justify-end' : 'justify-start'} animate-slideIn`}>
                                  <div className={`max-w-[70%] rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md ${
                                    msg.sender === staff._id 
                                      ? 'bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-br-none ml-4' 
                                      : 'bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-bl-none mr-4'
                                  }`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="text-xs font-semibold opacity-90">
                                        {msg.sender === staff._id ? `You • Floor ${staff.floor} Staff` : `${msg.senderName}`}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {msg.status === "sending" && (
                                          <div className="text-xs opacity-90 animate-pulse flex items-center">
                                            <svg className="w-3 h-3 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m8-10h-4M6 12H2m15.364-7.364l-2.828 2.828M7.464 17.536l-2.828 2.828m12.728 0l-2.828-2.828M7.464 6.464L4.636 3.636" />
                                            </svg>
                                            Sending...
                                          </div>
                                        )}
                                        {msg.status === "sent" && (
                                          <div className="text-xs opacity-90 flex items-center">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Sent
                                          </div>
                                        )}
                                        {msg.status === "failed" && (
                                          <div className="text-xs opacity-90 flex items-center">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Failed
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-2">{msg.content}</div>
                                    <div className={`text-xs text-right ${
                                      msg.sender === staff._id ? 'text-red-100/90' : 'text-gray-500'
                                    }`}>
                                      {formatTime(msg.createdAt)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Input */}
                <div className="bg-gradient-to-r from-white to-gray-50 p-5 border-t border-gray-200 shadow-lg">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-end space-x-3">
                      <div className="flex-1 relative">
                        <textarea
                          ref={textareaRef}
                          placeholder={`Send a message to ${selectedUser.name}...`}
                          className="w-full bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-red-400 focus:ring-3 focus:ring-red-100 text-sm shadow-sm resize-none transition-all duration-200"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyPress}
                          rows={1}
                          style={{ minHeight: '56px' }}
                        />
                        <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                          <button className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1.5">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-2xl px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl font-semibold shadow-lg flex items-center space-x-2 text-sm"
                      >
                        <span>Send</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : activeTab === "admin" ? (
              <>
                {/* Admin Chat Header */}
                <div className="bg-gradient-to-r from-red-50 to-white p-5 border-b border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-r from-[#CC0000] to-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-red-900">Administration Team</h3>
                        <p className="text-red-700 text-sm">24/7 Support • Priority Assistance</p>
                      </div>
                    </div>
                    <div className="bg-red-100 text-red-800 text-sm font-semibold px-4 py-2.5 rounded-full">
                      Fast Response
                    </div>
                  </div>
                </div>
                
                {/* Admin Messages Area */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto bg-gradient-to-b from-red-50/30 to-white"
                >
                  <div className="p-6">
                    {messages.length === 0 ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="text-center text-gray-500 max-w-md">
                          <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-r from-red-50 to-red-100 rounded-3xl flex items-center justify-center">
                            <svg className="w-16 h-16 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-700 mb-3">Contact Administration</h3>
                          <p className="text-gray-600 mb-6">Get technical support, report issues, or request assistance from the admin team.</p>
                          <button 
                            onClick={() => textareaRef.current?.focus()}
                            className="bg-gradient-to-r from-[#CC0000] to-red-600 text-white px-8 py-3.5 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
                          >
                            Message Admin Team
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-4xl mx-auto space-y-8">
                        {Object.entries(messageGroups).map(([date, dateMessages]) => (
                          <div key={date}>
                            <div className="flex justify-center mb-6">
                              <div className="bg-gradient-to-r from-red-100 to-red-50 text-red-800 px-4 py-2 rounded-full text-xs font-semibold shadow-sm">
                                {date}
                              </div>
                            </div>
                            <div className="space-y-3">
                              {dateMessages.map(msg => (
                                <div key={msg._id} className={`flex ${msg.sender === staff._id ? 'justify-end' : 'justify-start'} animate-slideIn`}>
                                  <div className={`max-w-[70%] rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md ${
                                    msg.sender === staff._id 
                                      ? 'bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-br-none ml-4' 
                                      : 'bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-bl-none mr-4'
                                  }`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="text-xs font-semibold opacity-90">
                                        {msg.sender === staff._id ? `You • ${staff.name}` : "Administration"}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {msg.status === "sending" && (
                                          <div className="text-xs opacity-90 animate-pulse flex items-center">
                                            <svg className="w-3 h-3 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m8-10h-4M6 12H2m15.364-7.364l-2.828 2.828M7.464 17.536l-2.828 2.828m12.728 0l-2.828-2.828M7.464 6.464L4.636 3.636" />
                                            </svg>
                                            Sending...
                                          </div>
                                        )}
                                        {msg.status === "sent" && (
                                          <div className="text-xs opacity-90 flex items-center">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Sent
                                          </div>
                                        )}
                                        {msg.status === "failed" && (
                                          <div className="text-xs opacity-90 flex items-center">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Failed
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-2">{msg.content}</div>
                                    <div className={`text-xs text-right ${
                                      msg.sender === staff._id ? 'text-red-100/90' : 'text-gray-500'
                                    }`}>
                                      {formatTime(msg.createdAt)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Message Input */}
                <div className="bg-gradient-to-r from-white to-red-50 p-5 border-t border-gray-200 shadow-lg">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-end space-x-3">
                      <div className="flex-1 relative">
                        <textarea
                          ref={textareaRef}
                          placeholder="Message the administration team..."
                          className="w-full bg-white border-2 border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-red-400 focus:ring-3 focus:ring-red-100 text-sm shadow-sm resize-none transition-all duration-200"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyPress}
                          rows={1}
                          style={{ minHeight: '56px' }}
                        />
                        <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                          <button className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1.5">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-2xl px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-xl font-semibold shadow-lg flex items-center space-x-2 text-sm"
                      >
                        <span>Send</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50/50">
                <div className="text-center max-w-md">
                  <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-r from-red-100 to-yellow-100 rounded-3xl flex items-center justify-center shadow-lg">
                    <svg className="w-20 h-20 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Messages</h3>
                  <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                    Select a resident from the list to start a conversation, or contact administration for support and assistance.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-3 text-gray-500">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Real-time messaging with residents</span>
                    </div>
                    <div className="flex items-center justify-center space-x-3 text-gray-500">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Direct admin support</span>
                    </div>
                    <div className="flex items-center justify-center space-x-3 text-gray-500">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Instant notifications</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

export default StaffMessages;