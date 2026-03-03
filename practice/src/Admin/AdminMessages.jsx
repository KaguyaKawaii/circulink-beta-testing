import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import AdminNavigation from "./AdminNavigation";

const socket = io(import.meta.env.VITE_API_URL);

function AdminMessages({ setView, onLogout, refreshUnreadCounts }) {
  const [messages, setMessages] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedName, setSelectedName] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [error, setError] = useState(null);
  const [userNames, setUserNames] = useState({});

  const listRef = useRef(null);
  const messagesEndRef = useRef(null);
  const searchRef = useRef(null);
  const chatContainerRef = useRef(null);
  const messageInputRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const refreshDashboardUnreadCounts = async () => {
    try {
      if (typeof refreshUnreadCounts === 'function') {
        await refreshUnreadCounts();
      } else {
        const adminRecipients = await axios.get(`${import.meta.env.VITE_API_URL}/api/messages/recipients/admin`);
        socket.emit('adminUnreadUpdate', { recipients: adminRecipients.data });
      }
    } catch (error) {
      console.error('Failed to refresh unread counts:', error);
    }
  };

  const moveConversationToTop = (conversationId) => {
    setRecipients(prevRecipients => {
      const conversationToMove = prevRecipients.find(r => r && r._id === conversationId);
      if (!conversationToMove) return prevRecipients;

      const filteredRecipients = prevRecipients.filter(r => r && r._id !== conversationId);
      
      const updatedConversation = {
        ...conversationToMove,
        timestamp: new Date().toISOString()
      };

      return [updatedConversation, ...filteredRecipients];
    });
  };

  useEffect(() => {
    fetchRecipients();
    fetchAllUsers();
    socket.emit("join", { userId: "admin" });

    const savedRecipient = localStorage.getItem("adminSelectedRecipient");
    if (savedRecipient) {
      try {
        const parsed = JSON.parse(savedRecipient);
        setSelectedId(parsed._id);
        setSelectedName(parsed.name);
        setSelectedType(parsed.type || "user");
      } catch (error) {
        console.error("Error parsing saved recipient:", error);
        localStorage.removeItem("adminSelectedRecipient");
      }
    }

    const handleNewMessage = (msg) => {
      const involvesAdmin = msg.sender === "admin" || msg.receiver === "admin";
      if (!involvesAdmin) return;

      const isCurrentConversation = msg.sender === selectedId || msg.receiver === selectedId;

      if (isCurrentConversation) {
        setMessages((prev) => {
          const existing = prev.find(m => m._id === msg._id);
          if (existing) return prev;
          
          const idx = prev.findIndex((m) => m.localId && m.content === msg.content);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = msg;
            return copy;
          }
          return [...prev, msg];
        });
        
        markAsRead(selectedId);
      }

      const otherPartyId = msg.sender === "admin" ? msg.receiver : msg.sender;
      moveConversationToTop(otherPartyId);
      fetchRecipients();
      refreshDashboardUnreadCounts();
    };

    const handleMessageSent = (msg) => {
      setMessages(prev => prev.map(m => 
        m.localId && m.status === "sending" && m.content === msg.content 
          ? { ...msg, status: "sent" }
          : m
      ));
      
      if (selectedId) {
        moveConversationToTop(selectedId);
      }
      
      refreshDashboardUnreadCounts();
    };

    const handleAdminUnreadUpdate = () => {
      fetchRecipients();
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageSent", handleMessageSent);
    socket.on("adminUnreadUpdate", handleAdminUnreadUpdate);
    
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageSent", handleMessageSent);
      socket.off("adminUnreadUpdate", handleAdminUnreadUpdate);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedId]);

  useEffect(() => {
    if (selectedId) {
      socket.emit("join", { userId: selectedId });
      fetchMessagesWithoutLoading();
      markAsRead(selectedId);
      moveConversationToTop(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedId && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [selectedId]);

  const markAsRead = async (userId) => {
    if (!userId) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/mark-read`, {
        userId: "admin",
        otherUserId: userId
      });
      setRecipients(prev => prev.map(r => 
        r._id === userId ? { ...r, unreadCount: 0 } : r
      ));
      refreshDashboardUnreadCounts();
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const isAdminConversation = (recipient) => {
    if (!recipient || !recipient._id) return false;
    
    const floorIds = [
      "Ground Floor",
      "Second Floor",
      "Third Floor",
      "Fourth Floor",
      "Fifth Floor",
    ];
    
    if (floorIds.includes(recipient._id)) {
      return false;
    }

    return true;
  };

  const fetchUserName = async (userId) => {
    if (!userId || userId === "admin") return "Administration";
    
    if (userNames[userId]) {
      return userNames[userId];
    }

    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/${userId}`);
      if (res.data && res.data.user) {
        const userName = res.data.user.name || "Unknown User";
        setUserNames(prev => ({ ...prev, [userId]: userName }));
        return userName;
      }
    } catch (err) {
      console.error("Failed to fetch user name:", err);
    }

    const user = allUsers.find(u => u._id === userId);
    if (user && user.name) {
      const userName = user.name;
      setUserNames(prev => ({ ...prev, [userId]: userName }));
      return userName;
    }

    return "Unknown User";
  };

  const fetchMessagesWithNames = async (messagesArray) => {
    const messagesWithNames = await Promise.all(
      messagesArray.map(async (msg) => {
        if (msg.senderName) return msg;
        if (msg.sender === "admin") return { ...msg, senderName: "Administration" };
        
        const senderName = await fetchUserName(msg.sender);
        return { ...msg, senderName };
      })
    );
    
    return messagesWithNames;
  };

  const fetchRecipients = async () => {
    try {
      setError(null);
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/recipients/admin`
      );

      const backendRecipients = res.data.filter(recipient => 
        recipient && recipient._id && recipient.name && isAdminConversation(recipient)
      );

      const mergedRecipients = [...backendRecipients];
      
      recipients.forEach(recipient => {
        if (recipient && recipient._id && isAdminConversation(recipient)) {
          const existsInBackend = backendRecipients.find(r => r._id === recipient._id);
          const existsInMerged = mergedRecipients.find(r => r._id === recipient._id);
          if (!existsInBackend && !existsInMerged) {
            mergedRecipients.push(recipient);
          }
        }
      });

      const sortedRecipients = mergedRecipients.sort((a, b) => {
        if (!a || !b) return 0;
        
        if (a._id === selectedId) return -1;
        if (b._id === selectedId) return 1;
        
        const timeA = new Date(a.timestamp || a.latestMessageTimestamp || a.createdAt || 0);
        const timeB = new Date(b.timestamp || b.latestMessageTimestamp || b.createdAt || 0);
        return timeB - timeA;
      });

      setRecipients(sortedRecipients);
    } catch (err) {
      console.error("Failed to fetch recipients:", err);
      setError("Failed to load conversations. Please try again.");
      setRecipients([]);
    }
  };

  const fetchMessagesWithoutLoading = async () => {
    if (!selectedId) return;
    
    try {
      setError(null);
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/admin-conversation/${selectedId}`
      );
      
      const filteredMessages = (res.data || []).filter(msg => 
        msg && (msg.sender === "admin" || msg.receiver === "admin")
      );

      const messagesWithNames = await fetchMessagesWithNames(filteredMessages);
      
      setMessages(messagesWithNames);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setError("Failed to load messages. Please try again.");
      setMessages([]);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setError(null);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/all/users`);

      let usersAndStaff = [];
      
      if (res.data && res.data.success) {
        usersAndStaff = res.data.users.filter(user => 
          user && !user.archived && user.role !== "admin"
        );
      } else {
        usersAndStaff = res.data.filter(user => 
          user && !user.archived && user.role !== "admin"
        );
      }

      setAllUsers(usersAndStaff);
    } catch (err) {
      console.error("Failed to fetch all users:", err);
      setError("Failed to load users. Please try again.");
      setAllUsers([]);
    }
  };

  const searchUsers = async (term) => {
    if (!term.trim()) {
      setShowSearchDropdown(false);
      return;
    }
    setSearchLoading(true);
    setShowSearchDropdown(true);
    setSearchLoading(false);
  };

  const handleSearchSelect = (user) => {
    if (!user || !user._id) return;
    
    setSearchTerm("");
    setShowSearchDropdown(false);
    
    const existingRecipient = recipients.find(r => r && r._id === user._id);
    
    if (!existingRecipient) {
      const newRecipient = {
        _id: user._id,
        name: user.name,
        type: user.role === "staff" ? "staff" : "user",
        email: user.email,
        department: user.department,
        latestMessage: "New conversation",
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        unreadCount: 0
      };
      
      const updatedRecipients = [newRecipient, ...recipients];
      setRecipients(updatedRecipients);
    }
    
    const recipientToSelect = existingRecipient || {
      _id: user._id,
      name: user.name,
      type: user.role === "staff" ? "staff" : "user"
    };
    
    handleSelectRecipient(recipientToSelect);
  };

  const handleSelectRecipient = (recipient) => {
    if (!recipient || !recipient._id) return;

    localStorage.setItem("adminSelectedRecipient", JSON.stringify(recipient));
    
    const updatedRecipients = recipients.map(r => {
      if (!r) return r;
      return r._id === recipient._id 
        ? { ...r, timestamp: new Date().toISOString(), unreadCount: 0 }
        : r;
    }).filter(r => r !== undefined);
    
    const sortedRecipients = updatedRecipients.sort((a, b) => {
      if (!a || !b) return 0;
      if (a._id === recipient._id) return -1;
      if (b._id === recipient._id) return 1;
      
      const timeA = new Date(a.timestamp || a.createdAt || 0);
      const timeB = new Date(b.timestamp || b.createdAt || 0);
      return timeB - timeA;
    });

    setRecipients(sortedRecipients);
    setSelectedId(recipient._id);
    setSelectedName(recipient.name);
    setSelectedType(getRecipientType(recipient));
    setShowSearchDropdown(false);
    setError(null);
    
    markAsRead(recipient._id);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedId) return;

    const tempMsg = {
      _id: "temp-" + Date.now(),
      localId: Date.now(),
      sender: "admin",
      senderName: "Administration",
      receiver: selectedId,
      content: newMessage,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");

    try {
      setError(null);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/messages/send`, {
        sender: "admin",
        receiver: selectedId,
        content: newMessage
      });
      
      setMessages(prev => prev.map(msg => 
        msg.localId === tempMsg.localId 
          ? { ...response.data, status: "sent" }
          : msg
      ));

      const updatedRecipients = recipients.map(recipient => {
        if (!recipient) return recipient;
        return recipient._id === selectedId
          ? { 
              ...recipient, 
              timestamp: new Date().toISOString(),
              latestMessage: newMessage,
              latestMessageTimestamp: new Date().toISOString(),
              unreadCount: 0
            }
          : recipient;
      }).filter(r => r !== undefined);

      if (!updatedRecipients.find(r => r._id === selectedId)) {
        const newRecipient = {
          _id: selectedId,
          name: selectedName,
          type: selectedType,
          latestMessage: newMessage,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          unreadCount: 0
        };
        updatedRecipients.unshift(newRecipient);
      }

      const sortedRecipients = updatedRecipients.sort((a, b) => {
        if (!a || !b) return 0;
        if (a._id === selectedId) return -1;
        if (b._id === selectedId) return 1;
        
        const timeA = new Date(a.timestamp || a.createdAt || 0);
        const timeB = new Date(b.timestamp || b.createdAt || 0);
        return timeB - timeA;
      });

      setRecipients(sortedRecipients);
      
      const currentRecipient = sortedRecipients.find(r => r._id === selectedId);
      if (currentRecipient) {
        localStorage.setItem("adminSelectedRecipient", JSON.stringify(currentRecipient));
      }

      await refreshDashboardUnreadCounts();

    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again.");
      setMessages(prev => prev.map(msg => 
        msg.localId === tempMsg.localId 
          ? { ...msg, status: "failed" }
          : msg
      ));
    }
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      return "";
    }
  };

  const formatMessageDate = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (d.toDateString() === now.toDateString()) {
        return "Today";
      } else if (d.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      } else {
        return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
      }
    } catch (error) {
      return "";
    }
  };

  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(msg => {
      if (!msg || !(msg.sender === "admin" || msg.receiver === "admin")) return;
      
      const date = formatMessageDate(msg.createdAt);
      if (!groups[date]) groups[date] = [];
      
      const messageExists = groups[date].some(m => m._id === msg._id);
      if (!messageExists) {
        groups[date].push(msg);
      }
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  const getAvatar = (name, type = "user", size = "md") => {
    const sizeClasses = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
    return (
      <div className={`${sizeClasses} bg-gradient-to-r from-[#CC0000] to-red-600 rounded-full flex items-center justify-center text-white font-bold shadow-md flex-shrink-0`}>
        {name ? name.charAt(0).toUpperCase() : "U"}
      </div>
    );
  };

  const getRecipientType = (recipient) => {
    return recipient.type || "user";
  };

  const filteredSearchResults = allUsers.filter(user =>
    user && (
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).slice(0, 5);

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminMessage" onLogout={onLogout} />
      
      <div className="ml-[250px] h-screen flex flex-col bg-gray-100">
        {/* EXACT HEADER STYLE - Copied pixel for pixel from News Management */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-[#CC0000]">Messages</h1>
          <p className="text-gray-600">Chat with users and staff</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversations Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-gray-200" ref={searchRef}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Messenger"
                  className="w-full bg-gray-100 rounded-full pl-10 pr-4 py-2 text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  onFocus={() => searchTerm && setShowSearchDropdown(true)}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Search Dropdown */}
                {showSearchDropdown && searchTerm && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-10 mt-1 max-h-60 overflow-y-auto animate-fadeIn">
                    {searchLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#CC0000] mx-auto"></div>
                      </div>
                    ) : filteredSearchResults.length > 0 ? (
                      filteredSearchResults.map((user) => (
                        <button
                          key={user._id}
                          onClick={() => handleSearchSelect(user)}
                          className="w-full flex items-center p-3 hover:bg-gray-50 transition-colors"
                        >
                          {getAvatar(user.name, user.role === "staff" ? "staff" : "user", "sm")}
                          <div className="ml-3 text-left">
                            <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                            <div className="text-xs text-gray-500">
                              {user.role === "staff" ? "Staff" : "User"}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No users found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto" ref={listRef}>
              {recipients.filter(r => r !== undefined).length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="font-medium">No conversations yet</p>
                  <p className="text-xs mt-2">Search for someone to start chatting</p>
                </div>
              ) : (
                recipients.filter(r => r !== undefined).map((recipient) => (
                  <button
                    key={recipient._id}
                    onClick={() => handleSelectRecipient(recipient)}
                    className={`w-full text-left p-3 transition-all duration-200 cursor-pointer hover:bg-gray-50 ${
                      selectedId === recipient._id 
                        ? 'bg-[#CC0000]/5 border-l-4 border-[#CC0000]' 
                        : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {getAvatar(recipient.name, getRecipientType(recipient))}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800 text-sm truncate">
                            {recipient.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {recipient.timestamp ? formatTime(recipient.timestamp) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <div className="text-xs text-gray-600 truncate max-w-[180px]">
                            {recipient.latestMessage || "No messages yet"}
                          </div>
                          {recipient.unreadCount > 0 && (
                            <span className="bg-[#CC0000] text-white text-xs px-2 py-0.5 rounded-full ml-2">
                              {recipient.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gray-100">
            {selectedId ? (
              <>
                {/* Chat Header */}
                <div className="bg-white px-4 py-3 border-b border-gray-200 shadow-sm flex items-center">
                  <div className="flex items-center space-x-3">
                    {getAvatar(selectedName, selectedType)}
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedName}</h3>
                      <p className="text-xs text-gray-500">
                        {selectedType === "staff" ? "Staff" : "User"} • Active now
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Messages Container */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto px-4 py-6"
                >
                  {messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">Say hello to {selectedName}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(messageGroups).map(([date, dateMessages]) => (
                        <div key={date}>
                          <div className="flex justify-center mb-4">
                            <span className="text-xs bg-gray-200/80 text-gray-600 px-3 py-1 rounded-full">
                              {date}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {dateMessages.map((msg, idx) => {
                              const isAdmin = msg.sender === "admin";
                              const showAvatar = !isAdmin && (
                                idx === 0 || 
                                dateMessages[idx - 1]?.sender !== msg.sender
                              );
                              
                              return (
                                <div key={msg._id || msg.localId} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`flex items-end space-x-2 max-w-[65%] ${isAdmin ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                    {!isAdmin && showAvatar ? (
                                      getAvatar(selectedName, selectedType, "sm")
                                    ) : !isAdmin ? (
                                      <div className="w-8"></div>
                                    ) : null}
                                    
                                    <div className="flex flex-col">
                                      <div className={`px-3 py-2 rounded-2xl ${
                                        isAdmin 
                                          ? 'bg-[#CC0000] text-white rounded-br-none' 
                                          : 'bg-white border border-gray-200 rounded-bl-none shadow-sm'
                                      }`}>
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                          {msg.content}
                                        </div>
                                      </div>
                                      <div className={`text-[10px] text-gray-400 mt-1 ${isAdmin ? 'text-right' : 'text-left'}`}>
                                        {formatTime(msg.createdAt)}
                                        {msg.status === "sending" && " • Sending"}
                                        {msg.status === "failed" && " • Failed"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="bg-white px-4 py-3 border-t border-gray-200">
                  <div className="flex items-end space-x-2">
                    <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-2">
                      <textarea
                        ref={messageInputRef}
                        placeholder={`Message ${selectedName}`}
                        className="w-full bg-transparent border-0 focus:ring-0 text-sm resize-none outline-none max-h-32"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        rows={1}
                        style={{ minHeight: '20px' }}
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-[#CC0000] text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[#CC0000]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC0000] cursor-pointer flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center bg-gray-100">
                <div className="text-center text-gray-500">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-700">Your Messages</h3>
                  <p className="text-gray-500 max-w-sm">
                    Select a conversation from the sidebar or search for someone to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
      `}</style>
    </>
  );
}

export default AdminMessages;