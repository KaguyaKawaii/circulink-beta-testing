import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import StaffNavigation from "./StaffNavigation";

const socket = io(`${import.meta.env.VITE_API_URL}`);

function StaffMessages({ setView, staff }) {
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

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        // FIXED: Enhanced message matching logic for instant display
        const isRelevantMessage = 
          (msg.sender === selectedUser._id && msg.receiver === staff._id) ||
          (msg.sender === staff._id && msg.receiver === selectedUser._id) ||
          (msg.floor === staff.floor && msg.receiver === selectedUser._id) ||
          (msg.sender === selectedUser._id && msg.floor === staff.floor) ||
          (msg.receiver === staff.floor && msg.sender === selectedUser._id);

        if (isRelevantMessage) {
          setMessages(prev => {
            // Remove any temporary messages with same content
            const filtered = prev.filter(m => 
              !(m.status === "sending" && m.content === msg.content && m.sender === msg.sender)
            );
            
            // Only add if not already present
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
      // FIXED: Clean up all event listeners
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
        floor: staff.floor // Added floor for better socket routing
      };

      setMessages(prev => [...prev, tempMsg]);
      setNewMessage("");

      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/staff-reply`, {
          staffId: staff._id,
          userId: selectedUser._id,
          content: newMessage,
          floor: staff.floor // Ensure floor is sent
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
    return new Date(iso).toLocaleDateString();
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

  return (
    <>
      <StaffNavigation setView={setView} currentView="staffMessages" staff={staff} />
      
      <div className="ml-[250px] w-[calc(100%-250px)] h-screen flex flex-col bg-gray-50">
        {/* HEADER */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-[#CC0000]">Message Center</h1>
          <p className="text-gray-600">Communicate with residents and administration</p>
          
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversations Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-600">Conversations</h2>
                
              </div>
              
              {/* Search Bar */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Tab Buttons */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleTabChange("floor")}
                  className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === "floor" 
                      ? "bg-gradient-to-r from-[#CC0000] to-red-600 text-white shadow transform scale-105" 
                      : "text-gray-600 hover:text-gray-800 hover:bg-white"
                  }`}
                >
                  Floor Users
                </button>
                <button
                  onClick={() => handleTabChange("admin")}
                  className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === "admin" 
                      ? "bg-gradient-to-r from-[#CC0000] to-red-600 text-white shadow transform scale-105" 
                      : "text-gray-600 hover:text-gray-800 hover:bg-white"
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {activeTab === "floor" ? (
                filteredConversations.length === 0 ? (
                  <div className="text-center p-6 text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="font-medium text-sm">No conversations found</p>
                    <p className="text-xs mt-1">{searchTerm ? "Try different search terms" : "Users will appear here"}</p>
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <button
                      key={conv._id}
                      onClick={() => selectUser(conv)}
                      className={`w-full text-left p-3 rounded-lg mb-1 transition-all duration-200 cursor-pointer ${
                        selectedUser?._id === conv._id 
                          ? 'bg-gradient-to-r from-red-50 to-yellow-50 border-2 border-red-200 shadow' 
                          : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {/* Unread badge on LEFT side */}
                          {conv.unreadCount > 0 && (
                            <div className="flex-shrink-0">
                              <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow">
                                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                              </div>
                            </div>
                          )}
                          <div className="w-10 h-10 bg-gradient-to-r from-[#CC0000] to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow flex-shrink-0">
                            {conv.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-800 text-sm truncate">
                                {conv.name}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 truncate mt-1">
                              {conv.latestMessage || "Start a conversation..."}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {conv.latestMessageAt ? formatTime(conv.latestMessageAt) : 'No messages'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )
              ) : (
                <div className="p-3">
                  <div 
                    onClick={() => handleTabChange("admin")}
                    className={`bg-gradient-to-r from-red-50 to-yellow-50 border border-red-200 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                      activeTab === "admin" && !selectedUser ? 'ring-2 ring-red-300 shadow' : 'hover:shadow'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-[#CC0000] to-red-600 rounded-lg flex items-center justify-center text-white mr-2 shadow">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-bold text-red-800 text-sm">Admin Support</span>
                        <p className="text-xs text-red-600">Always available to help</p>
                      </div>
                    </div>
                    <p className="text-xs text-red-700 leading-relaxed">
                      Contact system administrators for technical support, questions, or any assistance you need.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {activeTab === "floor" && selectedUser ? (
              <>
                <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-[#CC0000] to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{selectedUser.name}</h3>
                        
                      </div>
                    </div>
                    {selectedUser.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
                        {selectedUser.unreadCount} unread
                      </span>
                    )}
                  </div>
                </div>
                
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto bg-gradient-to-b from-red-50/30 to-yellow-50/20"
                >
                  <div className="p-4">
                    {loading ? (
                      <div className="flex justify-center items-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#CC0000] border-t-transparent mx-auto mb-3"></div>
                          <p className="text-gray-600 font-medium text-sm">Loading conversation...</p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex justify-center items-center">
                        <div className="text-center text-gray-500">
                          <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <h3 className="text-lg font-semibold mb-1">No messages yet</h3>
                          <p className="text-gray-600 text-sm">Start the conversation with {selectedUser.name}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-full mx-auto space-y-4">
                        {Object.entries(messageGroups).map(([date, dateMessages]) => (
                          <div key={date}>
                            <div className="flex justify-center mb-3">
                              <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                                {date}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {dateMessages.map(msg => (
                                <div key={msg._id} className={`flex ${msg.sender === staff._id ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[75%] rounded-lg p-3 shadow transition-all duration-200 ${
                                    msg.sender === staff._id 
                                      ? 'bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-br-md' 
                                      : 'bg-white border border-gray-200 rounded-bl-md'
                                  }`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-xs font-semibold">
                                        {msg.sender === staff._id ? `${staff.floor} Staff` : `${msg.senderName}`}
                                      </div>
                                      {msg.status === "sending" && (
                                        <div className="text-xs opacity-80 animate-pulse flex items-center">
                                          <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></div>
                                          Sending...
                                        </div>
                                      )}
                                      {msg.status === "failed" && (
                                        <div className="text-xs opacity-80 text-red-200 flex items-center">
                                          Failed
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                                    <div className={`text-xs mt-1 text-right ${
                                      msg.sender === staff._id ? 'text-red-100' : 'text-gray-500'
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

                <div className="bg-white p-4 border-t border-gray-200 shadow-lg">
                  <div className="max-w-full mx-auto">
                    <div className="flex space-x-2">
                      <textarea
                        placeholder={`Send a Message to ${selectedUser.name}...`}
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent text-sm shadow-sm resize-none"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        rows={1}
                        style={{ minHeight: '50px', maxHeight: '120px' }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-lg px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-semibold shadow flex items-center space-x-1 text-sm"
                      >
                        <span>Send</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      Replying as <strong className="text-[#CC0000]">{staff.floor} Staff</strong>
                      
                    </div>
                  </div>
                </div>
              </>
            ) : activeTab === "admin" ? (
              <>
                <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-[#CC0000] to-red-600 rounded-lg flex items-center justify-center text-white text-sm shadow">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">Administration</h3>
                        
                      </div>
                    </div>
                  </div>
                </div>
                
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto bg-gradient-to-b from-red-50/30 to-yellow-50/20"
                >
                  <div className="p-4">
                    {messages.length === 0 ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="text-center text-gray-500">
                          <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <h3 className="text-lg font-semibold mb-1">No messages yet</h3>
                          <p className="text-gray-600 text-sm">Start a conversation with the administration team</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-full mx-auto space-y-4">
                        {Object.entries(messageGroups).map(([date, dateMessages]) => (
                          <div key={date}>
                            <div className="flex justify-center mb-3">
                              <div className="bg-red-200 text-red-600 px-3 py-1 rounded-full text-xs font-medium">
                                {date}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {dateMessages.map(msg => (
                                <div key={msg._id} className={`flex ${msg.sender === staff._id ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[75%] rounded-lg p-3 shadow transition-all duration-200 ${
                                    msg.sender === staff._id 
                                      ? 'bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-br-md' 
                                      : 'bg-white border border-gray-200 rounded-bl-md'
                                  }`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="text-xs font-semibold">
                                        {msg.sender === staff._id ? `${staff.name}` : "Administration"}
                                      </div>
                                      {msg.status === "sending" && (
                                        <div className="text-xs opacity-80 animate-pulse flex items-center">
                                          <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></div>
                                          Sending...
                                        </div>
                                      )}
                                      {msg.status === "failed" && (
                                        <div className="text-xs opacity-80 text-red-200 flex items-center">
                                          Failed
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                                    <div className={`text-xs mt-1 text-right ${
                                      msg.sender === staff._id ? 'text-red-100' : 'text-gray-500'
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

                <div className="bg-white p-4 border-t border-gray-200 shadow-lg">
                  <div className="max-w-full mx-auto">
                    <div className="flex space-x-2">
                      <textarea
                        placeholder="Message Administration... "
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent text-sm shadow-sm resize-none"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        rows={1}
                        style={{ minHeight: '50px', maxHeight: '120px' }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-lg px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 hover:shadow-lg font-semibold shadow flex items-center space-x-1 text-sm"
                      >
                        <span>Send</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      Sending as <strong className="text-[#CC0000]">{staff.name}</strong>
                      <span className="block text-gray-400 mt-1">
                        Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Shift + Enter</kbd> for new line
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-red-50/50 to-yellow-50/50">
                <div className="text-center text-gray-500">
                  <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-xl font-semibold mb-2">Select a Conversation</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Choose a resident from the list to start messaging, or contact administration for support.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default StaffMessages;