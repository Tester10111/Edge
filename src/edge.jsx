import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Plus, Search, Home, Briefcase, ShoppingBag, User, X, DollarSign, Send, Bookmark, Star, MoreVertical, Image as ImageIcon, CheckCircle, Award, Zap, ChevronLeft, ChevronRight, Bell, Settings, LogOut, Edit2, Compass, Trash2, ShieldCheck, Baby, Code, TrendingUp, Sparkles, RefreshCw, Moon, Sun, Palette } from 'lucide-react';

// --- IMPORTANT: Set your Google Apps Script Web App URL here ---
const SCRIPT_URL = '/api';

// --- Helper Functions ---
const apiRequest = async (method, path, data = null, id = null) => {
    const requestBody = { method, path, id, data };
    
    console.log('🚀 API Request:', { url: SCRIPT_URL, body: requestBody });

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            redirect: 'follow'
        });

        console.log('✅ Response Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error Response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const responseText = await response.text();
        console.log('📦 Response Data:', responseText);
        
        const jsonData = responseText ? JSON.parse(responseText) : { status: 'success' };

if (jsonData.status === 'error') {
    throw new Error(jsonData.message || 'Unknown error');
}

// <<< NEW: return the .data when present (so callers get an array/object directly) >>>
return jsonData.data !== undefined ? jsonData.data : jsonData;

    } catch (error) {
        console.error('💥 Full Error:', {
            message: error.message,
            stack: error.stack,
            url: SCRIPT_URL
        });
        throw error;
    }
};

const formatTimestamp = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'a while ago';

    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    
    const formattedDate = date.toLocaleDateString('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    });

    return `${formattedTime} ${formattedDate}`;
  } catch (error) {
    console.error("Error formatting timestamp:", isoString, error);
    return '...';
  }
};

// --- UI Components ---

const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-800/50"></div>
);

const SkeletonCard = () => (
  <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 overflow-hidden relative shadow-sm animate-fade-in">
    <Shimmer />
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 animate-pulse"></div>
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 animate-pulse"></div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse"></div>
      </div>
    </div>
    <div className="space-y-3 mt-4">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6 animate-pulse"></div>
    </div>
    <div className="mt-4 h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse"></div>
  </div>
);

const Badge = ({ name }) => {
    const badgeConfig = {
        'Regional Manager': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/30', icon: <Award size={14} className="flex-shrink-0" /> },
        'Branch Manager': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/30', icon: <ShieldCheck size={14} className="flex-shrink-0" /> },
        'Warehouse Associate': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', icon: <Briefcase size={14} className="flex-shrink-0" /> },
        'Pro Picker': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30', icon: <Zap size={14} className="flex-shrink-0" /> },
        'Pro Receiver': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/30', icon: <TrendingUp size={14} className="flex-shrink-0" /> },
        'Pro Stacker': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/30', icon: <Star size={14} className="flex-shrink-0" /> },
        'Developer': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30', icon: <Zap size={14} className="flex-shrink-0" /> },

    };
    const config = badgeConfig[name] || { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', icon: null };
    
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} animate-scale-in shadow-sm hover:shadow-md transition-shadow`}>
            {config.icon}
            <span>{name}</span>
        </span>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full border border-slate-200 dark:border-slate-700 shadow-2xl animate-slide-up-bounce" onClick={(e) => e.stopPropagation()}>
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
                        <Trash2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
                    <p className="text-slate-600 dark:text-slate-400">{message}</p>
                </div>
                <div className="flex gap-4 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 active:scale-95 transition-all">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

const StarRating = ({ rating, totalStars = 5 }) => (
    <div className="flex items-center">
        {[...Array(totalStars)].map((_, index) => {
            const starValue = index + 1;
            return (
                <Star
                    key={index}
                    size={20}
                    className={`transition-colors ${starValue <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                />
            );
        })}
    </div>
);

const EdgeApp = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('foryou');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [expandedComments, setExpandedComments] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [profileTab, setProfileTab] = useState('posts');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [highlightedPost, setHighlightedPost] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [showMessagesPage, setShowMessagesPage] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  
  const [posts, setPosts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [comments, setComments] = useState([]);
  const [messages, setMessages] = useState([]);
  
  const [currentUser, setCurrentUser] = useState(null);

  const [settings, setSettings] = useState({
      darkMode: false,
      emailNotifications: true,
      pushNotifications: false,
  });

  const scrollRef = useRef(null);
  const lastScrollY = useRef(0);
  const touchStartY = useRef(0);
  const profileMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  
  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    avatar: '',
    email: ''
  });

  const categories = ['Picking', 'Receiving', 'Stacking', 'Inventory', 'Management', 'Maintenance', 'Other'];

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  
  const handleGuestAction = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        if (SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
            showToast("Please set your Google Apps Script URL", "error");
            console.error("SCRIPT_URL is not set in edge.jsx");
            setIsLoading(false);
            return;
        }
        const [usersData, postsData, interactionsData, commentsData, convosData, messagesData, notificationsData] = await Promise.all([
            apiRequest('GET', 'users'),
            apiRequest('GET', 'posts'),
            apiRequest('GET', 'interactions'),
            apiRequest('GET', 'comments'),
            apiRequest('GET', 'conversations'),
            apiRequest('GET', 'messages'),
            apiRequest('GET', 'notifications'),
        ]);

        const enrichedPosts = postsData.map(post => {
            // Parse images if stored as JSON string
            let imageArray = [];
            if (post.images) {
                try {
                    imageArray = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
                } catch (e) {
                    imageArray = [];
                }
            }

            return {
                ...post,
                images: Array.isArray(imageArray) ? imageArray : [],
                user: usersData.find(u => u.id === post.userId),
                commentsList: commentsData.filter(c => c.postId === post.id)
                  .map(c => ({...c, user: usersData.find(u => u.id === c.userId)})),
                likes: interactionsData.filter(i => i.postId === post.id && i.interactionType === 'like').length,
                liked: false
            };
        });

        // Enrich conversations with user data and messages
        const enrichedConvos = convosData.map(conv => {
            const participantIds = (conv.participantIds || '').split(',').map(s => s.trim()).filter(Boolean);
            const otherUserId = participantIds.find(pid => pid !== currentUser?.id) || participantIds[0];
            const otherUser = usersData.find(u => u.id === otherUserId);
            const convMessages = messagesData.filter(m => m.conversationId === conv.id)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const lastMsg = convMessages[convMessages.length - 1];

            return {
                ...conv,
                user: otherUser || { name: 'Unknown', avatar: '👤', username: '@unknown' },
                userId: otherUserId,
                messages: convMessages,
                lastMessage: lastMsg ? (lastMsg.type === 'image' ? '📷 Image' : lastMsg.text) : '',
                timestamp: conv.lastMessageTimestamp || conv.timestamp,
                unread: 0
            };
        });

        setAllUsers(usersData);
        setPosts(enrichedPosts);
        setInteractions(interactionsData);
        setComments(commentsData);
        setMessages(messagesData);
        setConversations(enrichedConvos);
        setNotifications(notificationsData);
        
    } catch (error) {
        showToast("Failed to fetch data from database.", "error");
        console.error(error);
    } finally {
        setIsLoading(false);
    }
  }, [showToast, currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('edge-currentUser');
      const savedSettings = localStorage.getItem('edge-settings');

      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
        setProfileForm(user);
        
        const settingsToApply = savedSettings ? JSON.parse(savedSettings) : {
            darkMode: user.darkMode || false,
            emailNotifications: true,
            pushNotifications: false
        };
        setSettings(settingsToApply);
      } else {
        const guestSettings = localStorage.getItem('edge-settings');
        if(guestSettings){
            setSettings(JSON.parse(guestSettings));
        }
      }
    } catch (error) {
        console.error("Failed to load data from localStorage", error);
        localStorage.removeItem('edge-currentUser');
        localStorage.removeItem('edge-settings');
    }
  }, []);

  useEffect(() => {
    if (currentUser && posts.length > 0) {
      const userLikes = new Set(interactions.filter(i => i.userId === currentUser.id && i.interactionType === 'like').map(i => i.postId));
      setPosts(prevPosts =>
        prevPosts.map(post => ({
          ...post,
          liked: userLikes.has(post.id),
        }))
      );
    }
  }, [currentUser, interactions, posts.length]);

  const handleNotificationClick = useCallback((notification) => {
    // Mark as read and navigate to related content
    if (notification.relatedPostId) {
      setHighlightedPost(notification.relatedPostId);
      setTimeout(() => setHighlightedPost(null), 2000);
    }
  }, []);

  const useOutsideAlerter = (ref, action) => {
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                action();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref, action]);
  }

  useOutsideAlerter(profileMenuRef, () => setShowProfileMenu(false));
  useOutsideAlerter(notificationsRef, () => setShowNotifications(false));

  const handleTouchStart = useCallback((e) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (isPulling && scrollRef.current?.scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
        e.preventDefault();
      }
    }
  }, [isPulling]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60) {
      handleRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  }, [pullDistance]);

  const handleRefresh = useCallback(async () => {
    if(isRefreshing) return;
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    showToast('Feed refreshed! ✨');
  }, [isRefreshing, showToast, fetchData]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = scrollRef.current?.scrollTop || 0;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setHeaderVisible(false);
      } else {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    const scrollElement = scrollRef.current;
    scrollElement?.addEventListener('scroll', handleScroll);
    return () => scrollElement?.removeEventListener('scroll', handleScroll);
  }, []);
  
   useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('edge-settings', JSON.stringify(settings));
  }, [settings]);

  const handleLogin = useCallback(async (formData) => {
    const usernameStr = '@' + formData.username.trim();
    const user = allUsers.find(u => u.username === usernameStr);

    if (!user) {
      showToast('User not found. Please sign up.', 'error');
      return;
    }

    // FIX: Validate password - convert both to strings and trim to handle type mismatches
    const userPassword = String(user.password || '').trim();
    const inputPassword = String(formData.password || '').trim();
    
    if (!userPassword || userPassword !== inputPassword) {
      showToast('Incorrect password.', 'error');
      console.log('Password mismatch:', { stored: userPassword, input: inputPassword, storedType: typeof user.password, inputType: typeof formData.password });
      return;
    }

    const userSettings = { darkMode: user.darkMode || false, emailNotifications: true, pushNotifications: false };
    setSettings(userSettings);
    setCurrentUser(user);
    setProfileForm(user);
    setIsAuthenticated(true);
    setShowAuthModal(false);
    localStorage.setItem('edge-currentUser', JSON.stringify(user));
    localStorage.setItem('edge-settings', JSON.stringify(userSettings));
    showToast(`Welcome back, ${user.name}!`);
    
    // Refresh data after login to get conversations, etc.
    fetchData();
  }, [allUsers, showToast, fetchData]);

  const handleSignup = useCallback(async (formData) => {
    if (!formData.name || !formData.username || !formData.password) { 
        showToast('Please fill in Name, Username, and Password', 'error'); 
        return; 
    }
    
    const newUser = {
      name: formData.name,
      username: '@' + formData.username,
      email: '',
      password: formData.password,
      avatar: '😊',
      bio: 'Excited to be here!',
      verified: false,
      badges: 'Warehouse Associate',
      darkMode: false,
    };

    try {
        const result = await apiRequest('POST', 'users', newUser);
        if (result.status === 'success') {
            const userWithId = { ...newUser, id: result.id || result.data.id };
            setAllUsers(prev => [...prev, userWithId]);
            setCurrentUser(userWithId);
            setProfileForm(userWithId);
            setIsAuthenticated(true);
            setShowAuthModal(false);
            const userSettings = { darkMode: false, emailNotifications: true, pushNotifications: false };
            setSettings(userSettings);
            localStorage.setItem('edge-currentUser', JSON.stringify(userWithId));
            localStorage.setItem('edge-settings', JSON.stringify(userSettings));
            showToast('Account created! Welcome to Edge! 🎉');
        }
    } catch (error) {
        showToast('Failed to create account.', 'error');
    }
  }, [showToast]);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false); 
    setCurrentUser(null);
    setShowProfileMenu(false); 
    setShowProfilePage(false); 
    localStorage.removeItem('edge-currentUser');
    setSettings({ darkMode: false, emailNotifications: true, pushNotifications: false });
    showToast('Logged out successfully');
  }, [showToast]);
  
  const handleSaveProfile = useCallback(async () => {
      if (!currentUser) {
          showToast('No user logged in', 'error');
          return;
      }
      try {
        await apiRequest('PUT', 'users', profileForm, currentUser.id);
        const updatedUser = { ...currentUser, ...profileForm };
        setCurrentUser(updatedUser);
        setAllUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));
        localStorage.setItem('edge-currentUser', JSON.stringify(updatedUser));
        setIsEditingProfile(false);
        showToast('Profile updated! ✨');
      } catch (error) {
        showToast('Failed to update profile.', 'error');
        console.error(error);
      }
  }, [currentUser, profileForm, showToast]);
  
  const handleLike = useCallback(async (postId) => {
    if (!currentUser) return;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic UI update
    const wasLiked = post.liked;
    setPosts(currentPosts => 
      currentPosts.map(p => 
        p.id === postId ? { ...p, likes: wasLiked ? p.likes - 1 : p.likes + 1, liked: !wasLiked } : p 
      )
    );
    
    try {
        if(wasLiked) {
            const likeToDelete = interactions.find(i => i.postId === postId && i.userId === currentUser.id && i.interactionType === 'like');
            if (likeToDelete) {
                await apiRequest('DELETE', 'interactions', null, likeToDelete.id);
                setInteractions(prev => prev.filter(i => i.id !== likeToDelete.id));
            }
        } else {
            const newLike = { postId, userId: currentUser.id, interactionType: 'like' };
            const result = await apiRequest('POST', 'interactions', newLike);
            if(result.data || result.id) {
              const likeWithId = { ...newLike, id: result.id || result.data.id, timestamp: new Date().toISOString() };
              setInteractions(prev => [...prev, likeWithId]);
              
              // FIX: Create notification for post owner
              if (post.userId !== currentUser.id) {
                  await apiRequest('POST', 'notifications', {
                      recipientId: post.userId,
                      senderId: currentUser.id,
                      type: 'like',
                      relatedPostId: postId,
                      content: `${currentUser.name} liked your post`,
                      isRead: false
                  });
              }
            }
        }
    } catch (error) {
        showToast('Like action failed.', 'error');
        // Revert UI on failure
        setPosts(currentPosts => 
          currentPosts.map(p => 
            p.id === postId ? { ...p, likes: wasLiked ? p.likes + 1 : p.likes - 1, liked: wasLiked } : p 
          )
        );
    }
  }, [posts, interactions, currentUser, showToast]);
  
  const handleBookmark = useCallback((postId) => {
    showToast('Bookmark functionality not fully connected yet.');
  }, [showToast]);
  
  const nextImage = useCallback((postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !Array.isArray(post.images) || post.images.length === 0) return;
    setCurrentImageIndex(prev => ({ ...prev, [postId]: ((prev[postId] || 0) + 1) % post.images.length }));
  }, [posts]);

  const prevImage = useCallback((postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !Array.isArray(post.images) || post.images.length === 0) return;
    setCurrentImageIndex(prev => {
      const newIndex = ((prev[postId] || 0) - 1 + post.images.length) % post.images.length;
      return { ...prev, [postId]: newIndex };
    });
  }, [posts]);
  
  const toggleComments = useCallback((postId) => {
      setExpandedComments(prev => prev === postId ? null : postId);
  }, []);

  const handlePostSubmit = useCallback(async (postData) => {
      const dataToSubmit = {
          ...postData,
          userId: currentUser.id
      };
      
      try {
          if (postData.id) {
              // Editing existing post
              const result = await apiRequest('PUT', 'posts', dataToSubmit, postData.id);
              
              // Parse images if returned as JSON string
              let imageArray = [];
              if (result.data?.images) {
                  try {
                      imageArray = typeof result.data.images === 'string' ? JSON.parse(result.data.images) : result.data.images;
                  } catch (e) {
                      imageArray = [];
                  }
              }
              
              setPosts(posts.map(p => p.id === postData.id ? {
                  ...p, 
                  ...result.data, 
                  images: Array.isArray(imageArray) ? imageArray : [],
                  user: currentUser
              } : p));
              showToast('Post updated successfully!');
          } else {
              // Creating new post
              const result = await apiRequest('POST', 'posts', dataToSubmit);
              
              // Parse returned images
              let imageArray = [];
              if (result.data?.images) {
                  try {
                      imageArray = typeof result.data.images === 'string' ? JSON.parse(result.data.images) : result.data.images;
                  } catch (e) {
                      imageArray = [];
                  }
              }
              
              const newPost = {
                  ...result.data, 
                  id: result.id || result.data.id,
                  images: Array.isArray(imageArray) ? imageArray : [],
                  user: currentUser, 
                  commentsList: [], 
                  likes: 0,
                  liked: false
              };
              setPosts([newPost, ...posts]);
              showToast('Posted successfully! 🎉');
          }
          setShowCreateModal(false);
          setEditingPost(null);
      } catch (error) {
          showToast('Failed to submit post.', 'error');
          console.error(error);
      }
  }, [currentUser, posts, showToast]);
  
  const handleDeletePost = useCallback((postId) => {
      setPostToDelete(postId);
      setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
      try {
          await apiRequest('DELETE', 'posts', null, postToDelete);
          setPosts(posts.filter(p => p.id !== postToDelete));
          showToast('Post deleted', 'success');
      } catch(error) {
          showToast('Failed to delete post.', 'error');
      } finally {
          setShowDeleteConfirm(false);
          setPostToDelete(null);
      }
  }, [postToDelete, posts, showToast]);

  const handleEditPost = useCallback((post) => {
      setEditingPost(post);
      setShowCreateModal(true);
  }, []);

  const handleCommentSubmit = useCallback(async (postId, commentText) => {
    if(!commentText.trim() || !currentUser) return;
    
    const newCommentData = {
        postId,
        userId: currentUser.id,
        text: commentText,
    };
    
    try {
        const result = await apiRequest('POST', 'comments', newCommentData);
        const newComment = {
            ...result.data,
            id: result.id || result.data.id,
            user: currentUser
        };
        
        setPosts(currentPosts => currentPosts.map(post => {
            if(post.id === postId) {
                return {
                    ...post,
                    commentsList: [newComment, ...(post.commentsList || [])]
                }
            }
            return post;
        }));
        
        // FIX: Create notification for post owner
        const post = posts.find(p => p.id === postId);
        if (post && post.userId !== currentUser.id) {
            await apiRequest('POST', 'notifications', {
                recipientId: post.userId,
                senderId: currentUser.id,
                type: 'comment',
                relatedPostId: postId,
                content: `${currentUser.name} commented on your post`,
                isRead: false
            });
        }
        
    } catch (error) {
        showToast('Failed to post comment.', 'error');
        console.error(error);
    }
  }, [currentUser, showToast, posts]);

  // FIX: Implement direct messaging
  const handleSendMessage = useCallback(async (conversationId, messageData) => {
      if (!currentUser) return;
      
      try {
          const newMessage = {
              conversationId,
              senderId: currentUser.id,
              text: messageData.text || '',
              imageUrl: messageData.image || '',
              type: messageData.type || 'text',
          };
          
          const result = await apiRequest('POST', 'messages', newMessage);
          const messageWithId = {
              ...newMessage,
              id: result.id || result.data.id,
              timestamp: new Date().toISOString()
          };
          
          // Update local state
          setConversations(prev => prev.map(conv => {
              if (conv.id === conversationId) {
                  return {
                      ...conv,
                      messages: [...(conv.messages || []), messageWithId],
                      lastMessage: messageData.type === 'image' ? '📷 Image' : messageData.text,
                      timestamp: messageWithId.timestamp
                  };
              }
              return conv;
          }));
          
          // Update selected conversation
          if (selectedConversation?.id === conversationId) {
              setSelectedConversation(prev => ({
                  ...prev,
                  messages: [...(prev.messages || []), messageWithId]
              }));
          }
          
          // FIX: Create notification for recipient
          const conv = conversations.find(c => c.id === conversationId);
          if (conv) {
              const recipientId = conv.userId;
              if (recipientId && recipientId !== currentUser.id) {
                  await apiRequest('POST', 'notifications', {
                      recipientId,
                      senderId: currentUser.id,
                      type: 'message',
                      relatedPostId: '',
                      content: `${currentUser.name} sent you a message`,
                      isRead: false
                  });
              }
          }
          
      } catch (error) {
          showToast('Failed to send message.', 'error');
          console.error(error);
      }
  }, [currentUser, conversations, selectedConversation, showToast]);

  // FIX: Implement start conversation
  const startConversation = useCallback(async (user) => {
      if (!currentUser) return;
      
      try {
          // Check if conversation already exists
          const existing = conversations.find(conv => 
              conv.userId === user.id || 
              (conv.participantIds && conv.participantIds.includes(user.id))
          );
          
          if (existing) {
              setSelectedConversation(existing);
              setShowMessagesPage(true);
              setShowUserSearch(false);
              return;
          }
          
          // Create new conversation
          const newConv = {
              participantIds: `${currentUser.id},${user.id}`,
              lastMessageTimestamp: new Date().toISOString()
          };
          
          const result = await apiRequest('POST', 'conversations', newConv);
          const convWithId = {
              ...newConv,
              id: result.id || result.data.id,
              user: user,
              userId: user.id,
              messages: [],
              lastMessage: '',
              timestamp: newConv.lastMessageTimestamp,
              unread: 0
          };
          
          setConversations(prev => [convWithId, ...prev]);
          setSelectedConversation(convWithId);
          setShowMessagesPage(true);
          setShowUserSearch(false);
          
      } catch (error) {
          showToast('Failed to start conversation.', 'error');
          console.error(error);
      }
  }, [currentUser, conversations, showToast]);

  const filteredAndSortedPosts = posts
    .filter(post => {
      if (activeTab === 'services' && post.type !== 'service') return false;
      if (activeTab === 'marketplace' && post.type !== 'item') return false;
      if (searchQuery && !post.content?.toLowerCase().includes(searchQuery.toLowerCase()) && !post.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

  const userPosts = currentUser ? posts.filter(p => p.userId === currentUser.id) : [];
  const userServices = userPosts.filter(p => p.type === 'service');
  const userItems = userPosts.filter(p => p.type === 'item');
  const unreadCount = notifications.filter(n => !n.isRead && n.recipientId === currentUser?.id).length;
  
  const AuthModal = ({ onLogin, onSignup, onClose }) => {
    const [authMode, setAuthMode] = useState('login');
    const [authForm, setAuthForm] = useState({ name: '', username: '', password: '', email: '' });
    
    const handleFormChange = (e) => {
      const { name, value } = e.target;
      setAuthForm(prev => ({...prev, [name]: value}));
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center z-[60] p-0 md:p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl p-8 w-full md:max-w-md border-t md:border border-slate-200 dark:border-slate-700 shadow-2xl animate-slide-up-bounce" onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6 md:hidden"></div>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl flex items-center justify-center shadow-xl mb-4 mx-auto animate-bounce-in">
                        <Zap size={28} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 animate-slide-in-left">Welcome to Edge</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-base animate-slide-in-right">
                        {authMode === 'login' ? 'Sign in to continue' : 'Create your account'}
                    </p>
                </div>
                <div className="space-y-4">
                    {authMode === 'signup' && (
                        <input type="text" name="name" placeholder="Full Name" value={authForm.name} onChange={handleFormChange} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all text-base animate-slide-in-left" />
                    )}
                    <input type="text" name="username" placeholder="Username" value={authForm.username} onChange={handleFormChange} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all text-base" />
                    <input type="password" name="password" placeholder="Password" value={authForm.password} onChange={handleFormChange} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all text-base" />
                </div>
                <button type="button" onClick={() => authMode === 'login' ? onLogin(authForm) : onSignup(authForm)} className="w-full mt-6 py-4 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-2xl font-bold hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-base relative overflow-hidden group">
                    <span className="relative z-10">{authMode === 'login' ? 'Login' : 'Create Account'}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
                <p className="text-slate-600 dark:text-slate-400 text-base text-center mt-6">
                    {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-slate-900 dark:text-white hover:underline font-bold">
                        {authMode === 'login' ? 'Sign up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
  };
  
  const CreateModal = ({ onPost, postToEdit, onClose, categories }) => {
    const [createType, setCreateType] = useState(postToEdit?.type || 'post');
    const [formData, setFormData] = useState({
        id: postToEdit?.id || null,
        title: postToEdit?.title || '',
        content: postToEdit?.content || '',
        price: postToEdit?.price || '',
        category: postToEdit?.category || '',
        condition: postToEdit?.condition || '',
        location: postToEdit?.location || '',
        images: postToEdit?.images || []
    });
    const [localMentionSuggestions, setLocalMentionSuggestions] = useState([]);
    const fileInputRef = useRef(null);

    const handleFormChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));

      if (name === 'content') {
        const lastWord = value.split(' ').pop();
        if (lastWord.startsWith('@') && lastWord.length > 1) {
          const query = lastWord.slice(1).toLowerCase();
          const suggestions = allUsers.filter(user =>
            user.username.toLowerCase().includes(query) ||
            user.name.toLowerCase().includes(query)
          ).slice(0, 5);
          setLocalMentionSuggestions(suggestions);
        } else {
          setLocalMentionSuggestions([]);
        }
      }
    };

    const insertMention = (username) => {
      const words = formData.content.split(' ');
      words[words.length - 1] = username + ' ';
      setFormData(prev => ({ ...prev, content: words.join(' ') }));
      setLocalMentionSuggestions([]);
    };

    const handleImageUpload = (e) => {
      const files = Array.from(e.target.files);
      Promise.all(files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(file);
        });
      })).then(base64Images => {
        setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...base64Images] }));
      });
    };

    const removeImage = (index) => {
      setFormData(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }));
    };

    const handleSubmit = () => {
        onPost({...formData, type: createType});
    }
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center z-[60] p-0 md:p-4 animate-fade-in" onClick={onClose}>
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl p-6 md:p-8 w-full md:max-w-2xl border-t md:border border-slate-200 dark:border-slate-700 shadow-2xl animate-slide-up-bounce max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6 md:hidden"></div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{postToEdit ? 'Edit Post' : 'Create New'}</h2>
              <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-95"><X size={24} /></button>
            </div>
            {!postToEdit && (
                <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl">
                    <button onClick={() => setCreateType('post')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-base ${ createType === 'post' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white' }`}>Post</button>
                    <button onClick={() => setCreateType('service')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-base ${ createType === 'service' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white' }`}>Service</button>
                    <button onClick={() => setCreateType('item')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-base ${ createType === 'item' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white' }`}>Item</button>
                </div>
            )}
            <div className="space-y-4">
              {(createType === 'service' || createType === 'item') && (
                <input name="title" type="text" placeholder="Title" value={formData.title} onChange={handleFormChange} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all text-base" />
              )}
              <div className="relative">
                <textarea name="content" placeholder={createType === 'post' ? "What's on your mind? Use @ to mention someone..." : "Description (use @ to mention)"} value={formData.content} onChange={handleFormChange} rows={4} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all resize-none text-base" />
                {localMentionSuggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-down z-10">
                    {localMentionSuggestions.map((user, index) => (
                      <button
                        key={user.id}
                        onClick={() => insertMention(user.username)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-left animate-slide-in-up"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="text-2xl">{user.avatar}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{user.name}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{user.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {(createType === 'service' || createType === 'item') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input name="price" type="number" placeholder="Price" value={formData.price} onChange={handleFormChange} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all text-base" />
                  {createType === 'service' && (
                    <select name="category" value={formData.category} onChange={handleFormChange} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all text-base">
                      <option value="">Select Category</option>
                      {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                  )}
                  {createType === 'item' && (
                    <>
                      <input name="condition" type="text" placeholder="Condition" value={formData.condition} onChange={handleFormChange} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all text-base" />
                      <input name="location" type="text" placeholder="Location" value={formData.location} onChange={handleFormChange} className="w-full md:col-span-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all text-base" />
                    </>
                  )}
                </div>
              )}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 text-center hover:border-slate-900 dark:hover:border-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon size={40} className="mx-auto text-slate-400 dark:text-slate-500 mb-3 animate-bounce-in" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">Tap to upload images</p>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple hidden />
              </div>
              {Array.isArray(formData.images) && formData.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      <button onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleSubmit} className="w-full mt-6 py-4 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-2xl font-bold hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base relative overflow-hidden group">
                <span className="relative z-10 flex items-center gap-2"><Send size={20} />{postToEdit ? 'Save Changes' : 'Publish'}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        </div>
    );
  };

  const NotificationDropdown = () => {
    return (
        <div ref={notificationsRef} className="absolute right-0 top-14 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-slide-down z-50">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Notifications</h3>
            {unreadCount > 0 && (
            <button className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all active:scale-95">
                Mark all read
            </button>
            )}
        </div>
        <div className="max-h-96 overflow-y-auto">
            {notifications.filter(n => n.recipientId === currentUser?.id).length === 0 ? (
            <div className="p-12 text-center">
                <Bell size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No notifications yet</p>
            </div>
            ) : (
            notifications.filter(n => n.recipientId === currentUser?.id).map((notif, index) => {
                const notifIcon = {
                'like': <Heart size={16} className="text-pink-500 fill-current" />,
                'comment': <MessageCircle size={16} className="text-blue-500" />,
                'follow': <User size={16} className="text-purple-500" />,
                'mention': <span className="text-indigo-500 font-bold text-sm">@</span>,
                'message': <MessageCircle size={16} className="text-emerald-500 fill-current" />
                };
                
                const sender = allUsers.find(u => u.id === notif.senderId);
                
                return (
                <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-5 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-all active:scale-[0.98] animate-slide-in-right ${!notif.isRead ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className="flex items-start gap-3">
                    <div className="relative">
                        <div className="text-3xl animate-bounce-in">{sender?.avatar || '👤'}</div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                        {notifIcon[notif.type]}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-slate-900 dark:text-slate-200 font-medium text-sm">
                        <span className="font-bold">{sender?.name || 'Unknown'}</span> {notif.content}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{formatTimestamp(notif.timestamp)}</p>
                    </div>
                    {!notif.isRead && (
                        <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping self-center"></div>
                    )}
                    </div>
                </div>
                );
            })
            )}
        </div>
        </div>
    )
    };

  const ProfilePage = () => {
    const fileInputRef = useRef(null);

    const handleAvatarUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setProfileForm(prev => ({ ...prev, avatar: event.target.result }));
        };
        reader.readAsDataURL(file);
      }
    };

    return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 overflow-y-auto animate-fade-in no-scrollbar">
        <div className="max-w-4xl mx-auto pb-24 md:pb-8">
            <div className="p-4 sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl z-10 flex items-center gap-4 border-b border-slate-200 dark:border-slate-700">
                <button onClick={() => setShowProfilePage(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full active:scale-95 transition-all"><X size={22}/></button>
                <div>
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">{currentUser?.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{userPosts.length} posts</p>
                </div>
            </div>

            <div className="relative h-48 md:h-64 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 animate-gradient">
                <div className="absolute -bottom-16 left-6 w-32 h-32 rounded-full border-4 border-white dark:border-slate-900 bg-slate-300 flex items-center justify-center text-6xl shadow-xl animate-bounce-in cursor-pointer" onClick={() => isEditingProfile && fileInputRef.current?.click()}>
                    {isEditingProfile ? (
                        typeof profileForm.avatar === 'string' && profileForm.avatar.startsWith('data:') ? 
                          <img src={profileForm.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> :
                          profileForm.avatar
                    ) : (
                        typeof currentUser?.avatar === 'string' && currentUser.avatar.startsWith('data:') ? 
                          <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> :
                          currentUser?.avatar
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" hidden />
                </div>
            </div>

            <div className="pt-20 px-6 pb-6">
                <div className="flex justify-end mb-4">
                    {isEditingProfile ? (
                        <div className="flex gap-2 animate-slide-in-right">
                            <button onClick={() => { setIsEditingProfile(false); setProfileForm(currentUser); }} className="px-6 py-3 text-base font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all">Cancel</button>
                            <button onClick={handleSaveProfile} className="px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-slate-900 to-slate-700 rounded-full hover:shadow-xl active:scale-95 transition-all">Save</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditingProfile(true)} className="px-6 py-3 text-base font-bold text-slate-800 dark:text-white border-2 border-slate-300 dark:border-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all animate-slide-in-left">Edit profile</button>
                    )}
                </div>
                
                {isEditingProfile ? (
                    <div className="space-y-4 animate-fade-in">
                        <input type="text" value={profileForm.name} onChange={(e) => setProfileForm(prev => ({...prev, name: e.target.value}))} className="text-2xl font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 w-full border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:outline-none"/>
                        <p className="text-slate-500 dark:text-slate-400 text-lg px-4">{currentUser?.username}</p>
                        <textarea value={profileForm.bio} onChange={(e) => setProfileForm(prev => ({...prev, bio: e.target.value}))} className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 w-full border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:outline-none resize-none" rows={3}/>
                        <input type="email" placeholder="Add your email" value={profileForm.email} onChange={(e) => setProfileForm(prev => ({...prev, email: e.target.value}))} className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 w-full border-2 border-slate-200 dark:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:outline-none"/>
                    </div>
                ) : (
                    <div className="animate-slide-in-up">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{currentUser?.name}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg mt-1">{currentUser?.username}</p>
                        {currentUser?.email && <p className="text-slate-500 dark:text-slate-400 text-base mt-1">{currentUser.email}</p>}
                        <p className="text-slate-700 dark:text-slate-300 text-base mt-3 leading-relaxed">{currentUser?.bio}</p>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {currentUser?.badges && currentUser.badges.split(',').map(badge => <Badge key={badge} name={badge.trim()} />)}
                        </div>
                    </div>
                )}

            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-[73px] z-10">
                <nav className="flex justify-around px-4">
                    <button onClick={() => setProfileTab('posts')} className={`flex-1 py-4 text-base font-bold text-center relative active:scale-95 transition-all ${profileTab === 'posts' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Posts {profileTab === 'posts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-slate-900 dark:bg-white rounded-full animate-slide-in-left"></div>}</button>
                    <button onClick={() => setProfileTab('services')} className={`flex-1 py-4 text-base font-bold text-center relative active:scale-95 transition-all ${profileTab === 'services' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Services {profileTab === 'services' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-slate-900 dark:bg-white rounded-full animate-slide-in-left"></div>}</button>
                    <button onClick={() => setProfileTab('items')} className={`flex-1 py-4 text-base font-bold text-center relative active:scale-95 transition-all ${profileTab === 'items' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Items {profileTab === 'items' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-slate-900 dark:bg-white rounded-full animate-slide-in-left"></div>}</button>
                </nav>
            </div>
            
            <div className="p-4 space-y-4">
              {profileTab === 'posts' && userPosts.filter(p => p.type === 'post').map((post, index) => (
                <div key={post.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-slide-in-up">
                  <PostCard post={post} isAuthenticated={isAuthenticated} onGuestAction={handleGuestAction} onLike={handleLike} onBookmark={handleBookmark} onNextImage={nextImage} onPrevImage={prevImage} onToggleComments={toggleComments} onCommentSubmit={handleCommentSubmit} onEdit={handleEditPost} onDelete={handleDeletePost} highlighted={highlightedPost === post.id}/>
                </div>
              ))}
              {profileTab === 'services' && userServices.map((post, index) => (
                <div key={post.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-slide-in-up">
                  <PostCard post={post} isAuthenticated={isAuthenticated} onGuestAction={handleGuestAction} onLike={handleLike} onBookmark={handleBookmark} onNextImage={nextImage} onPrevImage={prevImage} onToggleComments={toggleComments} onCommentSubmit={handleCommentSubmit} onEdit={handleEditPost} onDelete={handleDeletePost} highlighted={highlightedPost === post.id}/>
                </div>
              ))}
              {profileTab === 'items' && userItems.map((post, index) => (
                <div key={post.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-slide-in-up">
                  <PostCard post={post} isAuthenticated={isAuthenticated} onGuestAction={handleGuestAction} onLike={handleLike} onBookmark={handleBookmark} onNextImage={nextImage} onPrevImage={prevImage} onToggleComments={toggleComments} onCommentSubmit={handleCommentSubmit} onEdit={handleEditPost} onDelete={handleDeletePost} highlighted={highlightedPost === post.id}/>
                </div>
              ))}
            </div>
        </div>
    </div>
    )
  };

  const SettingsPage = () => {
    const handleSettingChange = async (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        if (currentUser && key === 'darkMode') {
            try {
                const updatedUser = { ...currentUser, darkMode: value };
                setCurrentUser(updatedUser);
                localStorage.setItem('edge-currentUser', JSON.stringify(updatedUser));
                
                await apiRequest('PUT', 'users', { darkMode: value }, currentUser.id);
                showToast(`Dark mode ${value ? 'enabled' : 'disabled'}`);
            } catch (error) {
                showToast('Failed to save preference.', 'error');
                const oldSettings = { ...settings };
                setSettings(oldSettings);
                setCurrentUser(prev => ({ ...prev, darkMode: oldSettings.darkMode }));
                localStorage.setItem('edge-currentUser', JSON.stringify({ ...currentUser, darkMode: oldSettings.darkMode }));
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-[60] overflow-y-auto animate-fade-in no-scrollbar">
            <div className="max-w-4xl mx-auto pb-24 md:pb-8">
                 <div className="p-4 sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl z-10 flex items-center gap-4 border-b border-slate-200 dark:border-slate-700">
                    <button onClick={() => setShowSettingsPage(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full active:scale-95 transition-all"><X size={22}/></button>
                    <div>
                        <h2 className="font-bold text-lg text-slate-900 dark:text-white">Settings</h2>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    <div className="animate-slide-in-up">
                        <h3 className="text-base font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2"><Palette size={18}/> Appearance</h3>
                        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                             <div className="p-5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    {settings.darkMode ? <Moon className="text-indigo-400"/> : <Sun className="text-amber-500" />}
                                    <span className="font-medium text-slate-800 dark:text-slate-200">Dark Mode</span>
                                </div>
                                <button onClick={() => handleSettingChange('darkMode', !settings.darkMode)} className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${settings.darkMode ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}>
                                    <span className="w-6 h-6 bg-white rounded-full shadow transition-transform"></span>
                                </button>
                            </div>
                        </div>
                    </div>

                     <div className="animate-slide-in-up" style={{ animationDelay: '100ms' }}>
                        <h3 className="text-base font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2"><Bell size={18}/> Notifications</h3>
                        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
                             <div className="p-5 flex justify-between items-center">
                                <span className="font-medium text-slate-800 dark:text-slate-200">Email Notifications</span>
                                <button onClick={() => showToast("This setting is not connected yet.")} className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${settings.emailNotifications ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}>
                                    <span className="w-6 h-6 bg-white rounded-full shadow transition-transform"></span>
                                </button>
                            </div>
                             <div className="p-5 flex justify-between items-center">
                                <span className="font-medium text-slate-800 dark:text-slate-200">Push Notifications</span>
                                <button onClick={() => showToast("This setting is not connected yet.")} className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${settings.pushNotifications ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}>
                                    <span className="w-6 h-6 bg-white rounded-full shadow transition-transform"></span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const UserSearchModal = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const filteredUsers = allUsers.filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in" onClick={() => setShowUserSearch(false)}>
        <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl border-t md:border border-slate-200 dark:border-slate-700 shadow-2xl animate-slide-up-bounce max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => setShowUserSearch(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full active:scale-95 transition-all"><X size={22}/></button>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Find People</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl pl-12 pr-4 py-4 border-2 border-transparent focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredUsers.map((user, index) => (
              <div 
                key={user.id} 
                className="p-5 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all animate-slide-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => {
                  setViewingUser(user);
                  setShowUserSearch(false);
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{user.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 dark:text-white truncate">{user.name}</span>
                      {user.verified && <CheckCircle size={16} className="text-blue-500 fill-current flex-shrink-0" />}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm truncate">{user.username}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.badges && user.badges.split(',').slice(0, 2).map(badge => <Badge key={badge} name={badge.trim()} />)}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      startConversation(user);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl font-semibold text-sm hover:shadow-lg active:scale-95 transition-all"
                  >
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const UserProfileView = ({ user }) => {
    const userPosts = posts.filter(p => p.userId === user.id);

    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-[60] overflow-y-auto animate-fade-in no-scrollbar">
        <div className="max-w-4xl mx-auto pb-24 md:pb-8">
          <div className="p-4 sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewingUser(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full active:scale-95 transition-all"><X size={22}/></button>
              <div>
                <h2 className="font-bold text-lg text-slate-900 dark:text-white">{user.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{userPosts.length} posts</p>
              </div>
            </div>
            <button 
              onClick={() => startConversation(user)}
              className="px-5 py-2.5 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl font-semibold hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
            >
              <MessageCircle size={18} />
              <span>Message</span>
            </button>
          </div>

          <div className="relative h-48 md:h-64 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 animate-gradient">
            <div className="absolute -bottom-16 left-6 w-32 h-32 rounded-full border-4 border-white dark:border-slate-900 bg-slate-300 flex items-center justify-center text-6xl shadow-xl animate-bounce-in">
              {typeof user.avatar === 'string' && user.avatar.startsWith('data:') ? 
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> :
                user.avatar
              }
            </div>
          </div>

          <div className="pt-20 px-6 pb-6">
            <div className="animate-slide-in-up">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mt-1">{user.username}</p>
               {user.email && <p className="text-slate-500 dark:text-slate-400 text-base mt-1">{user.email}</p>}
              <p className="text-slate-700 dark:text-slate-300 text-base mt-3 leading-relaxed">{user.bio}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                 {user.badges && user.badges.split(',').map(badge => <Badge key={badge} name={badge.trim()} />)}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {userPosts.map((post, index) => (
              <div key={post.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-slide-in-up">
                <PostCard post={post} isAuthenticated={isAuthenticated} onGuestAction={handleGuestAction} onLike={handleLike} onBookmark={handleBookmark} onNextImage={nextImage} onPrevImage={prevImage} onToggleComments={toggleComments} onCommentSubmit={handleCommentSubmit} onEdit={handleEditPost} onDelete={handleDeletePost} highlighted={highlightedPost === post.id}/>
              </div>
            ))}
            {userPosts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">No posts yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const MessagesPage = () => {
    const [messageText, setMessageText] = useState('');
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          handleSendMessage(selectedConversation.id, { type: 'image', image: event.target.result });
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 flex animate-fade-in">
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r border-slate-200 dark:border-slate-700 flex-col bg-white dark:bg-slate-900`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h2>
              <button onClick={() => setShowMessagesPage(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full active:scale-95 transition-all"><X size={22}/></button>
            </div>
            <button 
              onClick={() => setShowUserSearch(true)}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              <span>New Message</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-12 text-center">
                <MessageCircle size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No conversations yet</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Start a new conversation</p>
              </div>
            ) : (
              conversations.map((conv, index) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-5 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 animate-slide-in-left ${
                    selectedConversation?.id === conv.id ? 'bg-slate-100 dark:bg-slate-800/50' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{conv.user.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 dark:text-white truncate">{conv.user.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(conv.timestamp)}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm truncate">{conv.lastMessage || 'Start a conversation'}</p>
                    </div>
                    {conv.unread > 0 && (
                      <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-full text-xs font-bold flex items-center justify-center animate-bounce-in">
                        {conv.unread}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedConversation && (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50 flex items-center gap-4">
              <button 
                onClick={() => setSelectedConversation(null)} 
                className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full active:scale-95 transition-all"
              >
                <ChevronLeft size={22}/>
              </button>
              <div 
                className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  const user = allUsers.find(u => u.id === selectedConversation.userId);
                  if (user) {
                    setViewingUser(user);
                    setShowMessagesPage(false);
                    setSelectedConversation(null);
                  }
                }}
              >
                <div className="text-4xl">{selectedConversation.user.avatar}</div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{selectedConversation.user.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedConversation.user.username}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-900">
              {(!selectedConversation.messages || selectedConversation.messages.length === 0) ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-slate-500 dark:text-slate-400">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                selectedConversation.messages.map((msg, index) => {
                  const isOwnMessage = msg.senderId === currentUser?.id;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-slide-in-up`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={`max-w-xs lg:max-w-md ${
                        isOwnMessage 
                          ? 'bg-gradient-to-br from-slate-900 to-slate-700 text-white' 
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                      } rounded-3xl px-5 py-3 shadow-sm`}>
                        {msg.type === 'image' && msg.imageUrl ? (
                          <img src={msg.imageUrl} alt="Sent" className="max-w-full rounded-lg" />
                        ) : (
                          <p className="leading-relaxed">{msg.text}</p>
                        )}
                        <p className={`text-xs mt-2 ${isOwnMessage ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {formatTimestamp(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex gap-3">
                <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors">
                  <ImageIcon size={20} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" hidden />
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && messageText.trim()) {
                      handleSendMessage(selectedConversation.id, { type: 'text', text: messageText });
                      setMessageText('');
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-2xl px-5 py-3 border-2 border-transparent focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all"
                />
                <button
                  onClick={() => {
                    if (messageText.trim()) {
                      handleSendMessage(selectedConversation.id, { type: 'text', text: messageText });
                      setMessageText('');
                    }
                  }}
                  disabled={!messageText.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-2xl hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {!selectedConversation && (
          <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="text-center animate-fade-in">
              <div className="text-7xl mb-4">💬</div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Your Messages</h3>
              <p className="text-slate-600 dark:text-slate-400">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const PostCard = React.memo(({ post, isAuthenticated, onGuestAction, onLike, onBookmark, onNextImage, onPrevImage, onToggleComments, onCommentSubmit, onEdit, onDelete, highlighted }) => {
    const currentIndex = currentImageIndex[post.id] || 0;
    const isCommentsExpanded = expandedComments === post.id;
    const cardColorClass = post.featured ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20' : 'bg-white dark:bg-slate-800/50';
    const [showActions, setShowActions] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentMentionSuggestions, setCommentMentionSuggestions] = useState([]);
    const cardRef = useRef(null);

    useEffect(() => {
        if (highlighted && cardRef.current) {
            cardRef.current.classList.add('highlight');
            setTimeout(() => {
                cardRef.current?.classList.remove('highlight');
            }, 2000);
        }
    }, [highlighted]);

    const handleCommentChange = (e) => {
      const value = e.target.value;
      setCommentText(value);
      
      const lastWord = value.split(' ').pop();
      if (lastWord.startsWith('@') && lastWord.length > 1) {
        const query = lastWord.slice(1).toLowerCase();
        const suggestions = allUsers.filter(user => 
          user.username.toLowerCase().includes(query) || 
          user.name.toLowerCase().includes(query)
        ).slice(0, 5);
        setCommentMentionSuggestions(suggestions);
      } else {
        setCommentMentionSuggestions([]);
      }
    };

    const insertCommentMention = (username) => {
      const words = commentText.split(' ');
      words[words.length - 1] = username + ' ';
      setCommentText(words.join(' '));
      setCommentMentionSuggestions([]);
    };

    const handleComment = () => {
        onCommentSubmit(post.id, commentText);
        setCommentText('');
        setCommentMentionSuggestions([]);
    }

    const isOwnPost = isAuthenticated && currentUser?.username === post.user?.username;

    return (
        <div id={`post-${post.id}`} ref={cardRef} className={`${cardColorClass} rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 ease-out group relative overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1`}>
            {post.featured && (
                <div className="absolute top-0 right-0 px-4 py-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-bl-3xl rounded-tr-2xl flex items-center gap-2 z-10 shadow-lg animate-slide-in-right">
                    <Star size={14} className="text-white fill-current animate-spin-slow" />
                    <span className="text-xs text-white font-bold tracking-wide">FEATURED</span>
                </div>
            )}
            <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                    <button 
                      onClick={() => {
                        const user = allUsers.find(u => u.username === post.user?.username);
                        if (user) {
                          if (isAuthenticated && user.username === currentUser?.username) {
                            setShowProfilePage(true);
                          } else {
                            setViewingUser(user);
                          }
                        }
                      }}
                      className="text-4xl hover:scale-110 active:scale-95 transition-transform animate-bounce-in"
                    >
                      {typeof post.user?.avatar === 'string' && post.user.avatar.startsWith('data:') ? 
                        <img src={post.user.avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover" /> :
                        post.user?.avatar
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                        <button 
                          onClick={() => {
                            const user = allUsers.find(u => u.username === post.user?.username);
                            if (user) {
                              if (isAuthenticated && user.username === currentUser?.username) {
                                setShowProfilePage(true);
                              } else {
                                setViewingUser(user);
                              }
                            }
                          }}
                          className="flex items-center gap-2 flex-wrap mb-1 text-left hover:opacity-80 transition-opacity"
                        >
                            <span className="font-bold text-slate-900 dark:text-white text-base truncate">{post.user?.name}</span>
                            {post.user?.verified && <CheckCircle size={18} className="text-blue-500 fill-current flex-shrink-0 animate-scale-in" />}
                            <span className="text-slate-500 dark:text-slate-400 text-sm">· {formatTimestamp(post.timestamp)}</span>
                        </button>
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                           {post.user?.badges && post.user.badges.split(',').map(badge => <Badge key={badge} name={badge.trim()} />)}
                        </div>
                    </div>
                    {isOwnPost && (
                        <div className="relative">
                            <button type="button" onClick={() => setShowActions(!showActions)} className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-95">
                                <MoreVertical size={20} />
                            </button>
                             {showActions && (
                                <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl z-20 overflow-hidden animate-slide-down">
                                    <button onClick={() => { onEdit(post); setShowActions(false); }} className="w-full flex items-center gap-3 px-5 py-4 text-left text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-95 transition-all"><Edit2 size={18}/> Edit Post</button>
                                    <button onClick={() => { onDelete(post.id); setShowActions(false); }} className="w-full flex items-center gap-3 px-5 py-4 text-left text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all border-t border-slate-100 dark:border-slate-700"><Trash2 size={18}/> Delete Post</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {post.title && <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 animate-slide-in-left">{post.title}</h3>}
                
                <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed mb-4 whitespace-pre-wrap break-words animate-slide-in-up">
                    {post.content && post.content.split(' ').map((word, i) => {
                        if (word.startsWith('@')) {
                            return <span key={i} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer">{word} </span>;
                        }
                        return word + ' ';
                    })}
                </p>

                {Array.isArray(post.images) && post.images.length > 0 && (
                    <div className="relative mb-4 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 group/image animate-scale-in">
                        <div className="aspect-video flex items-center justify-center">
                            <img src={post.images[currentIndex]} alt="" className="w-full h-full object-cover" />
                        </div>
                        {post.images.length > 1 && (
                            <>
                                <button onClick={() => onPrevImage(post.id)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-all active:scale-95 backdrop-blur-sm">
                                    <ChevronLeft size={24} />
                                </button>
                                <button onClick={() => onNextImage(post.id)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-all active:scale-95 backdrop-blur-sm">
                                    <ChevronRight size={24} />
                                </button>
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                                    {post.images.map((_, idx) => (
                                        <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/50'}`} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {post.type === 'service' && (
                    <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 animate-slide-in-up">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">${post.price}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{post.priceType || 'per hour'}</p>
                                </div>
                                {post.category && (
                                    <span className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-sm font-semibold border border-indigo-200 dark:border-indigo-500/30">
                                        {post.category}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {post.type === 'item' && (
                    <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 animate-slide-in-up">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border-2 border-emerald-200 dark:border-emerald-500/30">
                                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">${post.price}</p>
                                </div>
                                {post.condition && (
                                    <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-semibold border border-blue-200 dark:border-blue-500/30">
                                        {post.condition}
                                    </span>
                                )}
                            </div>
                            {post.location && (
                                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">📍 {post.location}</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1">
                        <button onClick={() => isAuthenticated ? onLike(post.id) : onGuestAction()} className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all active:scale-95 group/like ${post.liked ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                            <Heart size={20} className={`transition-all ${post.liked ? 'fill-current animate-heart-beat' : 'group-hover/like:scale-110'}`} />
                            <span className="font-bold text-sm">{post.likes || 0}</span>
                        </button>
                        <button onClick={() => isAuthenticated ? onToggleComments(post.id) : onGuestAction()} className="flex items-center gap-2 px-4 py-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all active:scale-95">
                            <MessageCircle size={20} />
                            <span className="font-bold text-sm">{post.commentsList?.length || 0}</span>
                        </button>
                    </div>
                    <button onClick={() => isAuthenticated ? onBookmark(post.id) : onGuestAction()} className={`p-2.5 rounded-full transition-all active:scale-95 ${post.bookmarked ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                        <Bookmark size={20} className={post.bookmarked ? 'fill-current' : ''} />
                    </button>
                </div>

                {isCommentsExpanded && isAuthenticated && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4 animate-slide-down">
                        <div className="relative">
                            <div className="flex gap-3">
                                <div className="text-2xl">{currentUser?.avatar}</div>
                                <div className="flex-1 relative">
                                    <textarea
                                        value={commentText}
                                        onChange={handleCommentChange}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                                                e.preventDefault();
                                                handleComment();
                                            }
                                        }}
                                        placeholder="Add a comment... (use @ to mention)"
                                        rows={2}
                                        className="w-full bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-2xl px-4 py-3 border-2 border-slate-200 dark:border-slate-600 focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all resize-none text-sm"
                                    />
                                    {commentMentionSuggestions.length > 0 && (
                                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-down z-10">
                                            {commentMentionSuggestions.map((user, index) => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => insertCommentMention(user.username)}
                                                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-left"
                                                >
                                                    <div className="text-xl">{user.avatar}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-900 dark:text-white truncate text-xs">{user.name}</p>
                                                        <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{user.username}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleComment}
                                    disabled={!commentText.trim()}
                                    className="self-end px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>

                        {post.commentsList && post.commentsList.length > 0 && (
                            <div className="space-y-3">
                                {post.commentsList.map((comment, idx) => (
                                    <div key={idx} className="flex gap-3 animate-slide-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <div className="text-2xl">{comment.user?.avatar}</div>
                                        <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-4 py-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-slate-900 dark:text-white text-sm">{comment.user?.name}</span>
                                                <span className="text-slate-500 dark:text-slate-400 text-xs">· {formatTimestamp(comment.timestamp)}</span>
                                            </div>
                                            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                {comment.text.split(' ').map((word, i) => {
                                                    if (word.startsWith('@')) {
                                                        return <span key={i} className="text-indigo-600 dark:text-indigo-400 font-semibold">{word} </span>;
                                                    }
                                                    return word + ' ';
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
  });

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col">
      <style>{`
        @keyframes shimmer { to { transform: translateX(100%); } }
        @keyframes gradient { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes heart-beat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-left { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slide-in-right { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slide-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up-bounce { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce-in { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-gradient { background-size: 200% 200%; animation: gradient 15s ease infinite; }
        .animate-heart-beat { animation: heart-beat 0.3s ease; }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        .animate-fade-in { animation: fade-in 0.3s ease; }
        .animate-slide-in-left { animation: slide-in-left 0.4s ease; }
        .animate-slide-in-right { animation: slide-in-right 0.4s ease; }
        .animate-slide-in-up { animation: slide-in-up 0.4s ease; }
        .animate-slide-down { animation: slide-down 0.3s ease; }
        .animate-slide-up-bounce { animation: slide-up-bounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        .animate-scale-in { animation: scale-in 0.3s ease; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .highlight { animation: highlight-pulse 2s ease; }
        @keyframes highlight-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
          50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.4); }
        }
      `}</style>

      <header className={`bg-white dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 backdrop-blur-xl transition-transform duration-300 z-40 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-lg animate-bounce-in">
              <Zap size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edge</h1>
          </div>

          <div className="flex-1 max-w-xl mx-8 relative hidden md:block">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Search posts, services, items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-2xl pl-12 pr-4 py-3 border-2 border-transparent focus:border-slate-900 dark:focus:border-white focus:ring-0 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => isAuthenticated ? setShowMessagesPage(true) : handleGuestAction()} 
              className="relative p-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all active:scale-95"
            >
              <MessageCircle size={22} />
              {isAuthenticated && conversations.some(c => c.unread > 0) && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full animate-ping"></div>
              )}
            </button>
            <div className="relative">
              <button 
                onClick={() => isAuthenticated ? setShowNotifications(!showNotifications) : handleGuestAction()} 
                className="relative p-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all active:scale-95"
              >
                <Bell size={22} />
                {isAuthenticated && unreadCount > 0 && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-gradient-to-br from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce-in">
                    {unreadCount}
                  </div>
                )}
              </button>
              {isAuthenticated && showNotifications && <NotificationDropdown />}
            </div>
            <div className="relative">
              <button 
                onClick={() => isAuthenticated ? setShowProfileMenu(!showProfileMenu) : handleGuestAction()} 
                className="text-3xl hover:scale-110 active:scale-95 transition-transform"
              >
                {isAuthenticated && currentUser ? (
                    typeof currentUser.avatar === 'string' && currentUser.avatar.startsWith('data:') ? 
                    <img src={currentUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" /> :
                    currentUser.avatar
                ) : <User className="w-10 h-10 rounded-full p-2 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"/>
                }
              </button>
              {isAuthenticated && showProfileMenu && (
                <div ref={profileMenuRef} className="absolute right-0 top-14 w-64 bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden z-50 animate-slide-down">
                  <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-4xl">
                        {typeof currentUser?.avatar === 'string' && currentUser.avatar.startsWith('data:') ? 
                          <img src={currentUser.avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover" /> :
                          currentUser?.avatar
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{currentUser?.name}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm truncate">{currentUser?.username}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setShowProfilePage(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-5 py-4 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all active:scale-95">
                    <User size={20} />
                    <span className="font-medium">Profile</span>
                  </button>
                  <button onClick={() => { setShowSettingsPage(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-5 py-4 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all active:scale-95 border-t border-slate-100 dark:border-slate-700">
                    <Settings size={20} />
                    <span className="font-medium">Settings</span>
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-4 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95 border-t border-slate-100 dark:border-slate-700">
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          {isLoading || isRefreshing ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedPosts.map((post, index) => (
                <div key={post.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-slide-in-up">
                  <PostCard 
                    post={post} 
                    isAuthenticated={isAuthenticated}
                    onGuestAction={handleGuestAction}
                    onLike={handleLike} 
                    onBookmark={handleBookmark} 
                    onNextImage={nextImage} 
                    onPrevImage={prevImage} 
                    onToggleComments={toggleComments} 
                    onCommentSubmit={handleCommentSubmit}
                    onEdit={handleEditPost}
                    onDelete={handleDeletePost}
                    highlighted={highlightedPost === post.id}
                  />
                </div>
              ))}
              {filteredAndSortedPosts.length === 0 && (
                <div className="text-center py-16 animate-fade-in">
                  <div className="text-7xl mb-4">🔭</div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">No posts yet</h3>
                  <p className="text-slate-600 dark:text-slate-400">Be the first to share something!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-around items-center">
        <button onClick={() => setActiveTab('foryou')} className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-all active:scale-95 ${activeTab === 'foryou' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
          <Home size={24} className={activeTab === 'foryou' ? 'fill-current' : ''} />
          <span className="text-xs font-semibold">Home</span>
        </button>
        <button onClick={() => setActiveTab('services')} className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-all active:scale-95 ${activeTab === 'services' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
          <Briefcase size={24} className={activeTab === 'services' ? 'fill-current' : ''} />
          <span className="text-xs font-semibold">Services</span>
        </button>
        <button onClick={() => isAuthenticated ? setShowCreateModal(true) : handleGuestAction()} className="w-14 h-14 bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all -mt-8">
          <Plus size={28} strokeWidth={3} />
        </button>
        <button onClick={() => setActiveTab('marketplace')} className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-all active:scale-95 ${activeTab === 'marketplace' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
          <ShoppingBag size={24} className={activeTab === 'marketplace' ? 'fill-current' : ''} />
          <span className="text-xs font-semibold">Items</span>
        </button>
        <button onClick={() => isAuthenticated ? setShowProfilePage(true) : handleGuestAction()} className="flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-all active:scale-95 text-slate-500 dark:text-slate-400">
          <User size={24} />
          <span className="text-xs font-semibold">Profile</span>
        </button>
      </nav>

      {showAuthModal && <AuthModal onLogin={handleLogin} onSignup={handleSignup} onClose={() => setShowAuthModal(false)} />}
      {showCreateModal && <CreateModal onPost={handlePostSubmit} postToEdit={editingPost} onClose={() => { setShowCreateModal(false); setEditingPost(null); }} categories={categories} />}
      {showDeleteConfirm && <ConfirmationModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} title="Delete Post?" message="This action cannot be undone." />}
      {showProfilePage && currentUser && <ProfilePage />}
      {showSettingsPage && isAuthenticated && <SettingsPage />}
      {showMessagesPage && isAuthenticated && <MessagesPage />}
      {showUserSearch && isAuthenticated && <UserSearchModal />}
      {viewingUser && <UserProfileView user={viewingUser} />}

      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[70] animate-slide-in-up ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700'
        }`}>
          <p className="font-semibold">{toast.message}</p>
        </div>
      )}
    </div>
  );
};

export default EdgeApp;