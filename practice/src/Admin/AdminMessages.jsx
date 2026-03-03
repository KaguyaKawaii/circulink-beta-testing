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
  const [userNames, setUserNames] = useState({}); // Cache for user names

  const listRef = useRef(null);
  const messagesEndRef = useRef(null);
  const searchRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null); // For focusing input

  // Smooth scroll to bottom function
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Refresh unread counts on dashboard
  const refreshDashboardUnreadCounts = async () => {
    try {
      if (typeof refreshUnreadCounts === 'function') {
        await refreshUnreadCounts();
        console.log('✅ AdminMessages: Triggered unread count refresh');
      } else {
        console.log('🔄 AdminMessages: Manual unread count refresh');
        const adminRecipients = await axios.get(`${import.meta.env.VITE_API_URL}/api/messages/recipients/admin`);
        socket.emit('adminUnreadUpdate', { recipients: adminRecipients.data });
      }
    } catch (error) {
      console.error('❌ AdminMessages: Failed to refresh unread counts:', error);
    }
  };

  // Load initial data and setup socket
  useEffect(() => {
    fetchRecipients();
    fetchAllUsers();
    socket.emit("join", { userId: "admin" });

    // Restore last opened recipient
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
      console.log("📨 New message received in Admin Messages:", msg);
      
      // Only handle messages that involve admin
      const involvesAdmin = msg.sender === "admin" || msg.receiver === "admin";
      
      if (!involvesAdmin) {
        return; // Ignore user-staff conversations
      }

      const isCurrentConversation = msg.sender === selectedId || msg.receiver === selectedId;

      if (isCurrentConversation) {
        setMessages((prev) => {
          const existing = prev.find(m => m._id === msg._id);
          if (existing) return prev;
          
          // Replace temporary message with real one
          const idx = prev.findIndex(
            (m) => m.localId && m.content === msg.content
          );
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = msg;
            console.log("✅ Replaced temporary message with real one:", msg);
            return copy;
          }
          console.log("✅ Adding new message to admin conversation:", msg);
          return [...prev, msg];
        });
      }

      // Always update recipients when a new message arrives that involves admin
      fetchRecipients();
      
      refreshDashboardUnreadCounts();
    };

    // Handle message sent confirmation
    const handleMessageSent = (msg) => {
      console.log("✅ Admin message sent confirmation:", msg);
      setMessages(prev => prev.map(m => 
        m.localId && m.status === "sending" && m.content === msg.content 
          ? { ...msg, status: "sent" }
          : m
      ));
      
      refreshDashboardUnreadCounts();
    };

    // Listen for admin unread updates
    const handleAdminUnreadUpdate = (data) => {
      console.log('📥 AdminMessages: Received admin unread update', data);
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

  // Fetch messages when recipient changes
  useEffect(() => {
    if (selectedId) {
      socket.emit("join", { userId: selectedId });
      fetchMessagesWithoutLoading();
    }
  }, [selectedId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when recipient changes
  useEffect(() => {
    if (selectedId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedId]);

  // Enhanced recipient filtering to ensure privacy
  const isAdminConversation = (recipient) => {
    if (!recipient || !recipient._id) return false;
    
    // Filter out floors
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

  // Fetch user name by ID
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

  // Enhanced function to fetch messages with proper name handling
  const fetchMessagesWithNames = async (messagesArray) => {
    const messagesWithNames = await Promise.all(
      messagesArray.map(async (msg) => {
        if (msg.senderName) {
          return msg;
        }
        
        if (msg.sender === "admin") {
          return { ...msg, senderName: "Administration" };
        }
        
        const senderName = await fetchUserName(msg.sender);
        return { ...msg, senderName };
      })
    );
    
    return messagesWithNames;
  };

  // Fetch recipients with enhanced privacy filtering
  const fetchRecipients = async () => {
    try {
      setError(null);
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/messages/recipients/admin`
      );

      const backendRecipients = res.data.filter(recipient => 
        recipient &&
        recipient._id &&
        recipient.name &&
        isAdminConversation(recipient)
      );

      const existingRecipientsMap = new Map();
      recipients.forEach(recipient => {
        if (recipient && recipient._id && isAdminConversation(recipient)) {
          existingRecipientsMap.set(recipient._id, recipient);
        }
      });

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

  // Fetch messages with privacy check and name handling
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

  // Fetch all users with privacy consideration
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

  // Handle selecting a user from search results
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
        createdAt: new Date().toISOString()
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

  // Handle selecting a recipient from the list
  const handleSelectRecipient = (recipient) => {
    if (!recipient || !recipient._id) return;

    localStorage.setItem("adminSelectedRecipient", JSON.stringify(recipient));
    
    const updatedRecipients = recipients.map(r => {
      if (!r) return r;
      return r._id === recipient._id 
        ? { ...r, timestamp: new Date().toISOString() }
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
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send a new message with privacy enforcement AND UNREAD COUNT REFRESH
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
              latestMessageTimestamp: new Date().toISOString()
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
          createdAt: new Date().toISOString()
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

  // Format time
  const formatTime = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return "";
    }
  };

  // Format date
  const formatDate = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString();
    } catch (error) {
      return "";
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(msg => {
      if (!msg || !(msg.sender === "admin" || msg.receiver === "admin")) {
        return;
      }
      
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

  const getAvatar = (name, type = "user") => {
    return (
      <div className="w-10 h-10 bg-gradient-to-r from-[#CC0000] to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
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
      
      <div className="ml-[250px] h-screen flex flex-col bg-gray-50">
        {/* HEADER - kept exactly as original */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-[#CC0000]">Admin Message Center</h1>
          <p className="text-gray-600">Communicate with users and staff</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversations Sidebar - improved visual spacing */}
          <div className="w-80 bg-white border-r border-gray-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-700">Conversations</h2>
              </div>
              
              {/* Search Bar - refined */}
              <div className="relative mb-2" ref={searchRef}>
                <input
                  type="text"
                  placeholder="Search users or staff..."
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent text-sm transition-shadow"
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

                {/* Search Dropdown - smoother */}
                {showSearchDropdown && searchTerm && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-10 mt-1 max-h-60 overflow-y-auto animate-fadeIn">
                    {searchLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#CC0000] mx-auto"></div>
                        <span className="text-sm block mt-2">Searching...</span>
                      </div>
                    ) : filteredSearchResults.length > 0 ? (
                      filteredSearchResults.map((user) => (
                        <button
                          key={user._id}
                          onClick={() => handleSearchSelect(user)}
                          className="w-full flex items-center p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          {getAvatar(user.name, user.role === "staff" ? "staff" : "user")}
                          <div className="ml-3 text-left">
                            <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                            <div className="text-xs text-gray-500">
                              {user.role === "staff" ? "Staff" : "User"}
                              {user.department && ` • ${user.department}`}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No users found for "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {recipients.filter(r => r !== undefined).length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="font-medium">No conversations yet</p>
                  <p className="text-xs mt-2">{searchTerm ? "Try different search terms" : "Search for a user above"}</p>
                </div>
              ) : (
                recipients.filter(r => r !== undefined).map((recipient) => (
                  <button
                    key={recipient._id}
                    onClick={() => handleSelectRecipient(recipient)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                      selectedId === recipient._id 
                        ? 'bg-gradient-to-r from-red-50 to-yellow-50 border-2 border-red-200 shadow-md' 
                        : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {getAvatar(recipient.name, getRecipientType(recipient))}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800 text-sm truncate">
                            {recipient.name}
                          </span>
                          {recipient.unreadCount > 0 && (
                            <span className="bg-[#CC0000] text-white text-xs px-2 py-0.5 rounded-full ml-2 animate-pulse">
                              {recipient.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 truncate mt-0.5">
                          {recipient.latestMessage || "No messages yet"}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {recipient.timestamp ? formatTime(recipient.timestamp) : ''}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area - refined spacing and shadows */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {selectedId ? (
              <>
                <div className="bg-white px-6 py-4 border-b border-gray-200 shadow-sm">
                  <div className="flex items-center space-x-4">
                    {getAvatar(selectedName, selectedType)}
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{selectedName}</h3>
                      <p className="text-sm text-gray-500">
                        {selectedType === "staff" ? "Staff Member" : "User"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto bg-gradient-to-b from-red-50/30 to-yellow-50/20 px-4 py-6"
                >
                  {messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center text-gray-500 max-w-sm">
                        <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                        <p className="text-gray-600 text-sm">Send a message to {selectedName}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-4xl mx-auto space-y-6">
                      {Object.entries(messageGroups).map(([date, dateMessages]) => (
                        <div key={date}>
                          <div className="flex justify-center mb-4">
                            <div className="bg-gray-200/80 text-gray-600 px-4 py-1 rounded-full text-xs font-medium shadow-sm">
                              {date}
                            </div>
                          </div>
                          <div className="space-y-3">
                            {dateMessages.map(msg => (
                              <div key={msg._id || msg.localId} className={`flex ${msg.sender === "admin" ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-2xl p-3 shadow-sm transition-all ${
                                  msg.sender === "admin" 
                                    ? 'bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-br-none' 
                                    : 'bg-white border border-gray-200 rounded-bl-none'
                                }`}>
                                  <div className="flex items-center justify-between mb-1 px-1">
                                    <span className="text-xs font-semibold opacity-90">
                                      {msg.sender === "admin" ? "Admin" : msg.senderName?.split(' ')[0]}
                                    </span>
                                    {msg.status === "sending" && (
                                      <span className="text-xs opacity-80 flex items-center ml-2">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></span>
                                        Sending
                                      </span>
                                    )}
                                    {msg.status === "failed" && (
                                      <span className="text-xs text-red-200 ml-2">Failed</span>
                                    )}
                                  </div>
                                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words px-1">
                                    {msg.content}
                                  </div>
                                  <div className={`text-xs mt-1 text-right px-1 ${
                                    msg.sender === "admin" ? 'text-red-100' : 'text-gray-400'
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

                <div className="bg-white px-4 py-4 border-t border-gray-200 shadow-inner">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-end space-x-2">
                      <div className="flex-1 relative">
                        <textarea
                          ref={inputRef}
                          placeholder={`Message ${selectedName}...`}
                          className="w-full bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent text-sm shadow-sm resize-none transition-all"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyPress}
                          rows={1}
                          style={{ minHeight: '48px', maxHeight: '120px' }}
                        />
                        <div className="absolute right-3 bottom-3 text-gray-400 text-xs">
                          {newMessage.length > 0 && '↵ Enter'}
                        </div>
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-gradient-to-r from-[#CC0000] to-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC0000] cursor-pointer flex-shrink-0"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs text-gray-400 mt-2 text-center">
                      Sending as <span className="font-semibold text-[#CC0000]">Administration</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-red-50/50 to-yellow-50/50">
                <div className="text-center text-gray-500 max-w-md px-6">
                  <svg className="w-28 h-28 mx-auto text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-2xl font-semibold mb-3 text-gray-700">Select a Conversation</h3>
                  <p className="text-gray-600">
                    Choose a user or staff member from the list to start messaging.
                  </p>
                  <p className="text-sm text-gray-400 mt-4">(Only admin-related conversations are shown)</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add a subtle fade-in animation for dropdown */}
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