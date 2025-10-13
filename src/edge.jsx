import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageCircle, Heart, Plus, Search, Home, User, X, Send, MoreVertical, Image as ImageIcon, ChevronLeft, ChevronRight, Bell, Settings, LogOut, Edit2, Trash2, Users, Calendar, Camera, Loader, RefreshCw, Sprout, Droplet } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { useSwipeable } from 'react-swipeable';

const SCRIPT_URL = '/api';

const apiRequest = async (method, path, data = null, id = null) => {
  const requestBody = { method, path, id, data };
  try {
    console.debug('apiRequest ->', requestBody);

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      redirect: 'follow'
    });

    const responseText = await response.text();
    console.debug('apiRequest <- raw:', response.status, response.statusText, responseText);

    if (!response.ok) {
      const msg = `HTTP ${response.status} ${response.statusText} — ${responseText || '[no body]'}`;
      console.error('apiRequest HTTP error:', msg);
      throw new Error(msg);
    }

    let jsonData;
    try {
      jsonData = responseText ? JSON.parse(responseText) : null;
    } catch (parseErr) {
      console.error('apiRequest JSON parse failure for', path, 'raw:', responseText);
      throw new Error('Invalid JSON response from server: ' + parseErr.message);
    }

    if (jsonData && jsonData.status === 'error') {
      console.error('apiRequest server error:', jsonData.message, 'payload:', jsonData);
      throw new Error(jsonData.message || 'Server returned error');
    }

    // Return jsonData.data if present else full jsonData
    return jsonData && jsonData.data !== undefined ? jsonData.data : jsonData;
  } catch (error) {
    console.error('apiRequest failed', { method, path, id, error });
    throw error;
  }
};


const uploadImage = async (blob, type) => {
  const dataURL = await toBase64(blob);
  return dataURL;
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
    return '...';
  }
};

const toBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
});

const compressToBlob = (input, maxBytes = 25 * 1024) => {
  return new Promise((resolve, reject) => {
    let blobInput;
    if (typeof input === 'string') { // dataURL
      fetch(input).then(res => res.blob()).then(b => {
        blobInput = b;
        proceed();
      }).catch(reject);
      return;
    } else if (input instanceof File || input instanceof Blob) {
      blobInput = input;
      proceed();
    } else {
      reject(new Error('Invalid input'));
      return;
    }

    function proceed() {
      const img = new Image();
      const reader = new FileReader();
      reader.readAsDataURL(blobInput);
      reader.onload = () => {
        img.src = reader.result;
      };
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        let scale = 1;

        const compress = (quality) => {
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          return new Promise((res) => {
            canvas.toBlob(res, 'image/jpeg', quality);
          });
        };

        const binarySearchQuality = async () => {
          let low = 0.1;
          let high = 1;
          let bestBlob = null;
          for (let i = 0; i < 10; i++) {
            const mid = (low + high) / 2;
            const blob = await compress(mid);
            if (blob && blob.size <= maxBytes) {
              bestBlob = blob;
              low = mid;
            } else {
              high = mid;
            }
          }
          return bestBlob;
        };

        const tryCompress = async () => {
          let blob = await binarySearchQuality();
          while (!blob && scale > 0.1) {
            scale *= 0.8;
            blob = await binarySearchQuality();
          }
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not compress image'));
          }
        };

        tryCompress();
      };
      img.onerror = reject;
    }
  });
};

const LoadingSpinner = () => (
  <div className="inline-flex items-center justify-center">
    <Loader className="animate-spin" size={20} />
  </div>
);

const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
);

const SkeletonCard = () => (
  <div className="bg-white rounded-3xl border border-slate-200 p-5 overflow-hidden relative shadow-sm animate-fade-in">
    <Shimmer />
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex-shrink-0 animate-pulse"></div>
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-1/3 animate-pulse"></div>
        <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-1/2 animate-pulse"></div>
      </div>
    </div>
    <div className="space-y-3 mt-4">
      <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-full animate-pulse"></div>
      <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded w-5/6 animate-pulse"></div>
    </div>
  </div>
);

const Badge = ({ name }) => {
  const badgeConfig = {
    'Regional Manager': { bg: 'bg-gradient-to-r from-purple-100 to-purple-200', text: 'text-purple-700', border: 'border-purple-300', icon: '🏢' },
    'Branch Manager': { bg: 'bg-gradient-to-r from-blue-100 to-blue-200', text: 'text-blue-700', border: 'border-blue-300', icon: '📊' },
    'Warehouse Associate': {bg: 'bg-gradient-to-r from-slate-100 to-slate-200', text: 'text-slate-700', border: 'border-slate-300', icon: '📦' },
    'Developer': { bg: 'bg-gradient-to-r from-slate-100 to-slate-200', text: 'text-slate-700', border: 'border-slate-300', icon: '💻' },
    'OG': { bg: 'bg-gradient-to-r from-purple-100 to-purple-200', text: 'text-purple-700', border: 'border-purple-300', icon: '👑'},
    'Pro Stacker': { bg: 'bg-gradient-to-r from-cyan-100 to-cyan-200', text: 'text-cyan-700', border: 'border-cyan-300', icon: '⭐' },
    'Picker': { bg: 'bg-gradient-to-r from-emerald-100 to-emerald-200', text: 'text-emerald-700', border: 'border-emerald-300', icon: '🎯' },
    'Receiver': { bg: 'bg-gradient-to-r from-amber-100 to-amber-200', text: 'text-amber-700', border: 'border-amber-300', icon: '📥' },
  };
  const config = badgeConfig[name] || { bg: 'bg-gradient-to-r from-slate-100 to-slate-200', text: 'text-slate-700', border: 'border-slate-300', icon: null };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} animate-scale-in shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 cursor-default`}>
      {config.icon}
      <span>{name}</span>
    </span>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-premium flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={onClose}>
      <div className="glass-strong rounded-3xl p-8 max-w-sm w-full border border-slate-200 shadow-premium animate-slide-up-bounce" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in shadow-glow-purple">
            <Trash2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
          <p className="text-slate-600">{message}</p>
        </div>
        <div className="flex gap-4 mt-8">
          <button onClick={onClose} disabled={isLoading} className="flex-1 py-3 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 rounded-xl font-bold hover:from-slate-200 hover:to-slate-300 btn-press hover-lift transition-all duration-300 disabled:opacity-50 shadow-sm">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isLoading} className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 btn-press hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-premium">
            {isLoading ? <LoadingSpinner /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CropModal = ({ imageSrc, cropType, onCropComplete, onClose }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const aspect = cropType === 'profile' ? 1 : cropType === 'cover' ? 16/9 : 4/3;
  const cropShape = cropType === 'profile' ? 'round' : 'rect';

  const onCrop = useCallback(async () => {
    try {
      const croppedBlob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
      onClose();
    } catch (e) {
      onClose();
    }
  }, [croppedAreaPixels, imageSrc, onCropComplete, onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-premium flex items-center justify-center z-[70] animate-fade-in">
      <div className="glass-strong p-4 rounded-2xl w-11/12 max-w-md shadow-premium border border-slate-200 animate-slide-up-bounce">
        <div className="relative w-full h-64 rounded-xl overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropAreaChange={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 rounded-xl font-semibold hover:from-slate-300 hover:to-slate-400 btn-press hover-lift transition-all duration-300 shadow-sm">Cancel</button>
          <button onClick={onCrop} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-indigo-800 btn-press hover:scale-105 transition-all duration-300 shadow-md hover:shadow-glow-blue">Crop</button>
        </div>
      </div>
    </div>
  );
};

const getCroppedBlob = (imageSrc, pixelCrop) => {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
    };
  });
};

const EdgeApp = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [highlightedPost, setHighlightedPost] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropType, setCropType] = useState(null);
  const [onCropCompleteCallback, setOnCropCompleteCallback] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [showGardenPage, setShowGardenPage] = useState(false);
  const [gardenData, setGardenData] = useState({
    id: null,
    userId: null,
    plots: Array(6).fill(null).map((_, i) => ({ id: i, plantType: null, stage: 0, wateredCount: 0, plantedTime: null, boostedTime: null })),
    seeds: { tomato: 0, sunflower: 0, carrot: 0, pepper: 0, strawberry: 0, rose: 0, orchid: 0, lotus: 0 },
    waterDrops: 0,
    coins: 100,
    points: 0,
    fertilizers: 0,
    lastCheckIn: null,
    lastShopRefresh: null,
    shopInventory: []
  });
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState(null);
  const [shopTimer, setShopTimer] = useState(0);
  const [showShopRefreshAnimation, setShowShopRefreshAnimation] = useState(false);
  const [offlineGrowthMessage, setOfflineGrowthMessage] = useState(null);
  const saveTimeoutRef = useRef(null);
  const hasLoadedGardenRef = useRef(false);

  const [posts, setPosts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [comments, setComments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

  const [settings, setSettings] = useState({});

  const scrollRef = useRef(null);
  const lastScrollY = useRef(0);
  const touchStartY = useRef(0);
  const profileMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const groupChatScrollRef = useRef(null);

  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    avatar: '',
    email: '',
    profileImageURL: '',
    coverImageURL: ''
  });

  const tabs = ['feed', 'groupchat', 'dailylog'];

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
      const [usersData, postsData, interactionsData, commentsData, notificationsData, groupChatData, dailyLogsData] = await Promise.all([
        apiRequest('GET', 'users'),
        apiRequest('GET', 'posts'),
        apiRequest('GET', 'interactions'),
        apiRequest('GET', 'comments'),
        apiRequest('GET', 'notifications'),
        apiRequest('GET', 'groupchat'),
        apiRequest('GET', 'dailylogs'),
      ]);

      const enrichedPosts = postsData
        .filter(post => post.type === 'post' || !post.type)
        .map(post => {
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

      const enrichedGroupMessages = groupChatData
        .map(msg => ({
          ...msg,
          user: usersData.find(u => u.id === msg.senderId)
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setAllUsers(usersData);
      setPosts(enrichedPosts);
      setInteractions(interactionsData);
      setComments(commentsData);
      setNotifications(notificationsData);
      setGroupMessages(enrichedGroupMessages);
      setDailyLogs(dailyLogsData.filter(l => l.userId === currentUser?.id).sort((a, b) => new Date(b.date) - new Date(a.date)));

    } catch (error) {
      showToast("Failed to fetch data.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast, currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('edge-currentUser');
      const savedSettings = localStorage.getItem('edge-settings');

      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
        setProfileForm({
          name: user.name || '',
          bio: user.bio || '',
          avatar: user.avatar || '',
          email: user.email || '',
          profileImageURL: user.profileImageURL || '',
          coverImageURL: user.coverImageURL || ''
        });

        const settingsToApply = savedSettings ? JSON.parse(savedSettings) : {};
        setSettings(settingsToApply);
      } else {
        const guestSettings = localStorage.getItem('edge-settings');
        if (guestSettings) {
          setSettings(JSON.parse(guestSettings));
        }
      }

    } catch (error) {
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

  // Load garden data from API when user logs in
  useEffect(() => {
    const loadGardenFromAPI = async () => {
      if (!currentUser || !isAuthenticated || hasLoadedGardenRef.current) return;

      try {
        const gardenResponse = await apiRequest('GET', 'garden', null, currentUser.id);
        if (gardenResponse && gardenResponse.id) {
          hasLoadedGardenRef.current = true;

          // Calculate offline growth
          const updatedPlots = gardenResponse.plots.map(plot => {
            if (!plot.plantType || !plot.plantedTime) return plot;

            const maxStages = getMaxStagesForPlant(plot.plantType);
            const hoursPassed = (Date.now() - new Date(plot.plantedTime).getTime()) / (1000 * 60 * 60);
            const stagesFromTime = Math.floor(hoursPassed / 8);
            const totalStages = stagesFromTime + plot.wateredCount;
            const currentStage = Math.min(totalStages, maxStages);

            return { ...plot, stage: currentStage };
          });

          const stagesGrown = updatedPlots.reduce((sum, plot, idx) => {
            return sum + Math.max(0, plot.stage - gardenResponse.plots[idx].stage);
          }, 0);

          if (stagesGrown > 0) {
            setOfflineGrowthMessage(`Your plants grew ${stagesGrown} stages while you were away!`);
            setTimeout(() => setOfflineGrowthMessage(null), 5000);
          }

          setGardenData({ ...gardenResponse, plots: updatedPlots });
        }
      } catch (error) {
        // Garden doesn't exist, create new one
        try {
          const newGarden = {
            userId: currentUser.id,
            plots: Array(6).fill(null).map((_, i) => ({ id: i, plantType: null, stage: 0, wateredCount: 0, plantedTime: null, boostedTime: null })),
            seeds: { tomato: 0, sunflower: 0, carrot: 0, pepper: 0, strawberry: 0, rose: 0, orchid: 0, lotus: 0 },
            waterDrops: 0,
            coins: 100,
            points: 0,
            fertilizers: 0,
            lastCheckIn: null,
            lastShopRefresh: null,
            shopInventory: []
          };
          const result = await apiRequest('POST', 'garden', newGarden);
          setGardenData({ ...newGarden, id: result.id || result.data?.id });
          hasLoadedGardenRef.current = true;
        } catch (createError) {
          console.error('Failed to create garden:', createError);
        }
      }
    };

    loadGardenFromAPI();
  }, [currentUser, isAuthenticated]);

  // Auto-save garden data to API every 30 seconds (debounced)
  useEffect(() => {
    if (!currentUser || !isAuthenticated || !gardenData.id) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await apiRequest('PUT', 'garden', gardenData, gardenData.id);
        console.log('Garden auto-saved');
      } catch (error) {
        console.error('Failed to auto-save garden:', error);
      }
    }, 30000); // 30 seconds

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [gardenData, currentUser, isAuthenticated]);

  const handleNotificationClick = useCallback(async (notification) => {
    if (notification.relatedPostId) {
      setHighlightedPost(notification.relatedPostId);
      setActiveTab('feed');
      setTimeout(() => setHighlightedPost(null), 2000);
    }
    setShowNotifications(false);

    try {
      await apiRequest('PUT', 'notifications', { isRead: true }, notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
    } catch (error) {
      showToast('Failed to mark notification as read.', 'error');
    }
  }, [showToast]);

  const useOutsideAlerter = (ref, action) => {
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
          action();
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
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
    if (isRefreshing) return;
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    showToast('Refreshed! ✨');
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
    localStorage.setItem('edge-settings', JSON.stringify(settings));
  }, [settings]);

  const handleLogin = useCallback(async (formData) => {
    const usernameStr = '@' + formData.username.trim();
    const user = allUsers.find(u => u.username === usernameStr);

    if (!user) {
      showToast('User not found. Please sign up.', 'error');
      return;
    }

    const userPassword = String(user.password || '').trim();
    const inputPassword = String(formData.password || '').trim();

    if (!userPassword || userPassword !== inputPassword) {
      showToast('Incorrect password.', 'error');
      return;
    }

    const userSettings = {};
    setSettings(userSettings);
    setCurrentUser(user);
    setProfileForm({
      name: user.name || '',
      bio: user.bio || '',
      avatar: user.avatar || '',
      email: user.email || '',
      profileImageURL: user.profileImageURL || '',
      coverImageURL: user.coverImageURL || ''
    });
    setIsAuthenticated(true);
    setShowAuthModal(false);
    localStorage.setItem('edge-currentUser', JSON.stringify(user));
    localStorage.setItem('edge-settings', JSON.stringify(userSettings));
    showToast(`Welcome back, ${user.name}!`);

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
      profileImageURL: '',
      coverImageURL: ''
    };

    try {
      const result = await apiRequest('POST', 'users', newUser);
      if (result.status === 'success' || result.id) {
        const userWithId = { ...newUser, id: result.id || result.data?.id };
        setAllUsers(prev => [...prev, userWithId]);
        setCurrentUser(userWithId);
        setProfileForm({
          name: userWithId.name,
          bio: userWithId.bio,
          avatar: userWithId.avatar,
          email: userWithId.email || '',
          profileImageURL: '',
          coverImageURL: ''
        });
        setIsAuthenticated(true);
        setShowAuthModal(false);
        const userSettings = {};
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
    setSettings({});
    showToast('Logged out successfully');
  }, [showToast]);

  const handleSaveProfile = useCallback(async () => {
    if (!currentUser) {
      showToast('No user logged in', 'error');
      return;
    }

    setIsSaving(true);

    try {
      let profileImageURL = profileForm.profileImageURL;
      if (profileImageURL.startsWith('data:')) {
        const blob = await compressToBlob(profileImageURL);
        profileImageURL = await uploadImage(blob, 'profile');
      }

      let coverImageURL = profileForm.coverImageURL;
      if (coverImageURL.startsWith('data:')) {
        const blob = await compressToBlob(coverImageURL);
        coverImageURL = await uploadImage(blob, 'cover');
      }

      const updateData = {
        name: profileForm.name,
        bio: profileForm.bio,
        email: profileForm.email,
        profileImageURL,
        coverImageURL,
        avatar: profileForm.avatar
      };

      await apiRequest('PUT', 'users', updateData, currentUser.id);
      const updatedUser = { ...currentUser, ...updateData };
      setCurrentUser(updatedUser);
      setAllUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));
      localStorage.setItem('edge-currentUser', JSON.stringify(updatedUser));
      setIsEditingProfile(false);
      setProfileForm(prev => ({ ...prev, profileImageURL, coverImageURL }));
      showToast('Profile updated! ✨');
    } catch (error) {
      showToast('Failed to update profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, profileForm, showToast]);

  const handleLike = useCallback(async (postId) => {
    if (!currentUser) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.liked;
    setPosts(currentPosts =>
      currentPosts.map(p =>
        p.id === postId ? { ...p, likes: wasLiked ? p.likes - 1 : p.likes + 1, liked: !wasLiked } : p
      )
    );

    try {
      if (wasLiked) {
        const likeToDelete = interactions.find(i => i.postId === postId && i.userId === currentUser.id && i.interactionType === 'like');
        if (likeToDelete) {
          await apiRequest('DELETE', 'interactions', null, likeToDelete.id);
          setInteractions(prev => prev.filter(i => i.id !== likeToDelete.id));
        }
      } else {
        const newLike = { postId, userId: currentUser.id, interactionType: 'like' };
        const result = await apiRequest('POST', 'interactions', newLike);
        if (result.data || result.id) {
          const likeWithId = { ...newLike, id: result.id || result.data?.id, timestamp: new Date().toISOString() };
          setInteractions(prev => [...prev, likeWithId]);

          if (post.userId !== currentUser.id) {
            await apiRequest('POST', 'notifications', {
              recipientId: post.userId,
              senderId: currentUser.id,
              type: 'like',
              relatedPostId: postId,
              content: `${currentUser.name} liked your post`,
              isRead: false,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      showToast('Like action failed.', 'error');
      setPosts(currentPosts =>
        currentPosts.map(p =>
          p.id === postId ? { ...p, likes: wasLiked ? p.likes + 1 : p.likes - 1, liked: wasLiked } : p
        )
      );
    }
  }, [posts, interactions, currentUser, showToast]);

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
    setIsPosting(true);

    try {
      const processedImages = await Promise.all(postData.images.map(async (img) => {
        if (img.startsWith('data:')) {
          const blob = await compressToBlob(img);
          return await uploadImage(blob, 'post');
        }
        return img;
      }));

      const dataToSubmit = {
        ...postData,
        userId: currentUser.id,
        type: 'post',
        images: JSON.stringify(processedImages)
      };

      if (postData.id) {
        const result = await apiRequest('PUT', 'posts', dataToSubmit, postData.id);

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
        const result = await apiRequest('POST', 'posts', dataToSubmit);

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
          id: result.id || result.data?.id,
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
    } finally {
      setIsPosting(false);
    }
  }, [currentUser, posts, showToast]);

  const handleDeletePost = useCallback((postId) => {
    setPostToDelete(postId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    setIsSaving(true);
    try {
      await apiRequest('DELETE', 'posts', null, postToDelete);
      setPosts(posts.filter(p => p.id !== postToDelete));
      showToast('Post deleted', 'success');
    } catch (error) {
      showToast('Failed to delete post.', 'error');
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
      setPostToDelete(null);
    }
  }, [postToDelete, posts, showToast]);

  const handleEditPost = useCallback((post) => {
    setEditingPost(post);
    setShowCreateModal(true);
  }, []);

  const handleCommentSubmit = useCallback(async (postId, commentText) => {
    if (!commentText.trim() || !currentUser) return;

    const newCommentData = {
      postId,
      userId: currentUser.id,
      text: commentText,
      timestamp: new Date().toISOString()
    };

    try {
      const result = await apiRequest('POST', 'comments', newCommentData);
      const newComment = {
        ...newCommentData,
        id: result.id || result.data?.id,
        user: currentUser
      };

      setComments(prev => [...prev, newComment]);

      setPosts(currentPosts => currentPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            commentsList: [newComment, ...(post.commentsList || [])]
          }
        }
        return post;
      }));

      const post = posts.find(p => p.id === postId);
      if (post && post.userId !== currentUser.id) {
        await apiRequest('POST', 'notifications', {
          recipientId: post.userId,
          senderId: currentUser.id,
          type: 'comment',
          relatedPostId: postId,
          content: `${currentUser.name} commented on your post`,
          isRead: false,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      showToast('Failed to post comment.', 'error');
    }
  }, [currentUser, showToast, posts]);

  // Shop timer countdown
  useEffect(() => {
    const updateShopTimer = () => {
      if (!gardenData.lastShopRefresh) return;

      const lastRefresh = new Date(gardenData.lastShopRefresh).getTime();
      const now = Date.now();
      const timeSinceRefresh = now - lastRefresh;
      const fiveMinutes = 5 * 60 * 1000;
      const timeRemaining = fiveMinutes - timeSinceRefresh;

      if (timeRemaining <= 0) {
        // Time to refresh shop
        refreshShopInventory();
      } else {
        setShopTimer(Math.floor(timeRemaining / 1000));
      }
    };

    updateShopTimer();
    const interval = setInterval(updateShopTimer, 1000);
    return () => clearInterval(interval);
  }, [gardenData.lastShopRefresh]);

  // Calculate growth when garden page is viewed
  const calculateGrowth = useCallback(() => {
    setGardenData(prev => {
      const updatedPlots = prev.plots.map(plot => {
        if (!plot.plantType || !plot.plantedTime) return plot;

        const maxStages = getMaxStagesForPlant(plot.plantType);
        const hoursPassed = (Date.now() - new Date(plot.plantedTime).getTime()) / (1000 * 60 * 60);
        const stagesFromTime = Math.floor(hoursPassed / 8);
        const totalStages = stagesFromTime + plot.wateredCount;
        const currentStage = Math.min(totalStages, maxStages);

        return { ...plot, stage: currentStage };
      });

      return { ...prev, plots: updatedPlots };
    });
  }, []);

  // Calculate growth when garden page opens
  useEffect(() => {
    if (showGardenPage) {
      calculateGrowth();
    }
  }, [showGardenPage, calculateGrowth]);

  // Helper function to get max stages for each plant
  const getMaxStagesForPlant = (plantType) => {
    const stageMap = {
      tomato: 5, sunflower: 5, carrot: 5, pepper: 5, strawberry: 5,
      rose: 4, orchid: 5, lotus: 5
    };
    return stageMap[plantType] || 5;
  };

  // Helper function to save garden immediately
  const saveGardenImmediately = useCallback(async (updatedGarden) => {
    if (!currentUser || !isAuthenticated || !updatedGarden.id) return;

    try {
      await apiRequest('PUT', 'garden', updatedGarden, updatedGarden.id);
    } catch (error) {
      console.error('Failed to save garden:', error);
    }
  }, [currentUser, isAuthenticated]);

  // Generate random shop inventory
  const generateShopInventory = useCallback(() => {
    const items = [];
    const commonSeeds = ['tomato', 'sunflower', 'carrot', 'pepper', 'strawberry'];
    const rareSeeds = [
      { type: 'rose', price: 50, rarity: 'rare' },
      { type: 'orchid', price: 80, rarity: 'rare' },
      { type: 'lotus', price: 120, rarity: 'rare' }
    ];

    // Generate 4 random items
    for (let i = 0; i < 4; i++) {
      const rand = Math.random();

      if (rand < 0.5) {
        // Common seed (50% chance)
        const seedType = commonSeeds[Math.floor(Math.random() * commonSeeds.length)];
        const price = Math.floor(Math.random() * 11) + 5; // 5-15 coins
        items.push({
          id: `item-${Date.now()}-${i}`,
          type: 'seed',
          seedType,
          rarity: 'common',
          price,
          quantity: 1
        });
      } else if (rand < 0.75) {
        // Water pack (25% chance)
        items.push({
          id: `item-${Date.now()}-${i}`,
          type: 'water',
          price: 10,
          quantity: 3
        });
      } else if (rand < 0.9) {
        // Fertilizer (15% chance)
        items.push({
          id: `item-${Date.now()}-${i}`,
          type: 'fertilizer',
          price: 30,
          quantity: 1
        });
      } else {
        // Rare seed (10% chance)
        const rareSeed = rareSeeds[Math.floor(Math.random() * rareSeeds.length)];
        items.push({
          id: `item-${Date.now()}-${i}`,
          type: 'seed',
          seedType: rareSeed.type,
          rarity: rareSeed.rarity,
          price: rareSeed.price,
          quantity: 1
        });
      }
    }

    return items;
  }, []);

  // Refresh shop inventory
  const refreshShopInventory = useCallback(() => {
    const newInventory = generateShopInventory();
    const updatedGarden = {
      ...gardenData,
      shopInventory: newInventory,
      lastShopRefresh: new Date().toISOString()
    };
    setGardenData(updatedGarden);
    setShowShopRefreshAnimation(true);
    setTimeout(() => setShowShopRefreshAnimation(false), 2000);
    saveGardenImmediately(updatedGarden);
  }, [gardenData, generateShopInventory, saveGardenImmediately]);

  // Initialize shop on first load
  useEffect(() => {
    if (gardenData.id && !gardenData.lastShopRefresh) {
      refreshShopInventory();
    }
  }, [gardenData.id, gardenData.lastShopRefresh, refreshShopInventory]);

  // Garden Game Functions
  const handleDailyCheckIn = useCallback(() => {
    const now = new Date();
    const lastCheckIn = gardenData.lastCheckIn ? new Date(gardenData.lastCheckIn) : null;

    if (lastCheckIn && now.toDateString() === lastCheckIn.toDateString()) {
      showToast('You already checked in today!', 'error');
      return;
    }

    const plantTypes = ['tomato', 'sunflower', 'carrot', 'pepper', 'strawberry'];
    const randomSeeds = {};

    for (let i = 0; i < 3; i++) {
      const randomType = plantTypes[Math.floor(Math.random() * plantTypes.length)];
      randomSeeds[randomType] = (randomSeeds[randomType] || 0) + 1;
    }

    const updatedGarden = {
      ...gardenData,
      seeds: {
        ...gardenData.seeds,
        tomato: gardenData.seeds.tomato + (randomSeeds.tomato || 0),
        sunflower: gardenData.seeds.sunflower + (randomSeeds.sunflower || 0),
        carrot: gardenData.seeds.carrot + (randomSeeds.carrot || 0),
        pepper: gardenData.seeds.pepper + (randomSeeds.pepper || 0),
        strawberry: gardenData.seeds.strawberry + (randomSeeds.strawberry || 0),
      },
      waterDrops: gardenData.waterDrops + 5,
      coins: gardenData.coins + 20,
      lastCheckIn: now.toISOString()
    };

    setGardenData(updatedGarden);
    showToast('Daily check-in complete! 💰 +20 coins, 🌱 +3 seeds, 💧 +5 water!');
    saveGardenImmediately(updatedGarden);
  }, [gardenData, showToast, saveGardenImmediately]);

  const handleWater = useCallback((plotId) => {
    if (gardenData.waterDrops <= 0) {
      showToast('Not enough water drops!', 'error');
      return;
    }

    const updatedGarden = {
      ...gardenData,
      waterDrops: gardenData.waterDrops - 1,
      plots: gardenData.plots.map(plot => {
        if (plot.id === plotId && plot.stage < 5) {
          const newWateredCount = plot.wateredCount + 1;
          const newStage = Math.min(newWateredCount + 1, 5);
          return { ...plot, wateredCount: newWateredCount, stage: newStage };
        }
        return plot;
      })
    };

    setGardenData(updatedGarden);
    showToast('Plant watered! 💧');
    saveGardenImmediately(updatedGarden);
  }, [gardenData, showToast, saveGardenImmediately]);

  const handleHarvest = useCallback((plotId) => {
    const plot = gardenData.plots.find(p => p.id === plotId);
    if (!plot || plot.stage !== 5) return;

    const rewardsMap = {
      tomato: { points: 10, coins: 5 },
      sunflower: { points: 15, coins: 5 },
      carrot: { points: 12, coins: 5 },
      pepper: { points: 18, coins: 5 },
      strawberry: { points: 20, coins: 5 },
      rose: { points: 30, coins: 15 },
      orchid: { points: 40, coins: 20 },
      lotus: { points: 50, coins: 25 }
    };

    const rewards = rewardsMap[plot.plantType] || { points: 10, coins: 5 };

    const updatedGarden = {
      ...gardenData,
      points: gardenData.points + rewards.points,
      coins: gardenData.coins + rewards.coins,
      plots: gardenData.plots.map(p =>
        p.id === plotId
          ? { id: p.id, plantType: null, stage: 0, wateredCount: 0, plantedTime: null }
          : p
      )
    };

    setGardenData(updatedGarden);
    showToast(`Harvested ${plot.plantType}! ⭐ +${rewards.points} pts, 💰 +${rewards.coins} coins!`);
    saveGardenImmediately(updatedGarden);
  }, [gardenData, showToast, saveGardenImmediately]);

  const handlePlotClick = useCallback((plot) => {
    if (!isAuthenticated) {
      handleGuestAction();
      return;
    }

    if (plot.stage === 5) {
      // Harvest
      handleHarvest(plot.id);
    } else if (plot.plantType && plot.stage > 0 && plot.stage < 5) {
      // Water
      handleWater(plot.id);
    } else if (!plot.plantType) {
      // Plant
      setSelectedPlotId(plot.id);
      setShowSeedModal(true);
    }
  }, [isAuthenticated, handleHarvest, handleWater, handleGuestAction]);

  const handlePlantSeed = useCallback((plantType) => {
    if (gardenData.seeds[plantType] <= 0) {
      showToast('Not enough seeds!', 'error');
      return;
    }

    const updatedGarden = {
      ...gardenData,
      seeds: { ...gardenData.seeds, [plantType]: gardenData.seeds[plantType] - 1 },
      plots: gardenData.plots.map(plot =>
        plot.id === selectedPlotId
          ? { ...plot, plantType, stage: 1, wateredCount: 0, plantedTime: new Date().toISOString() }
          : plot
      )
    };

    setGardenData(updatedGarden);
    setShowSeedModal(false);
    setSelectedPlotId(null);
    showToast(`Planted ${plantType}! 🌱`);
    saveGardenImmediately(updatedGarden);
  }, [gardenData, selectedPlotId, showToast, saveGardenImmediately]);

  const handleShopPurchase = useCallback((item) => {
    if (gardenData.coins < item.price) {
      showToast('Not enough coins! 💰', 'error');
      return;
    }

    const updatedGarden = { ...gardenData };
    updatedGarden.coins -= item.price;

    // Add purchased item to inventory
    if (item.type === 'seed') {
      updatedGarden.seeds[item.seedType] = (updatedGarden.seeds[item.seedType] || 0) + (item.quantity || 1);
      showToast(`Purchased ${item.seedType}! 🌱`, 'success');
    } else if (item.type === 'water') {
      updatedGarden.waterDrops += (item.quantity || 3);
      showToast(`Purchased water drops! 💧`, 'success');
    } else if (item.type === 'fertilizer') {
      // Fertilizer will be applied to next watered plant
      showToast(`Purchased fertilizer! ✨ (Use on next water)`, 'success');
    }

    // Remove purchased item from shop inventory
    updatedGarden.shopInventory = updatedGarden.shopInventory.filter(i => i.id !== item.id);

    setGardenData(updatedGarden);
    saveGardenImmediately(updatedGarden);
  }, [gardenData, showToast, saveGardenImmediately]);

  const filteredAndSortedPosts = useMemo(() => {
    return posts
      .filter(post => {
        if (searchQuery && !post.content?.toLowerCase().includes(searchQuery.toLowerCase()) && !post.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [posts, searchQuery]);

  const userPosts = useMemo(() => {
    return currentUser ? posts.filter(p => p.userId === currentUser.id) : [];
  }, [currentUser, posts]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead && n.recipientId === currentUser?.id).length;
  }, [notifications, currentUser?.id]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  const PostCard = React.memo(({ post, isAuthenticated, onGuestAction, onLike, onNextImage, onPrevImage, onToggleComments, onCommentSubmit, onEdit, onDelete, highlighted }) => {
    const currentIndex = currentImageIndex[post.id] || 0;
    const isCommentsExpanded = expandedComments === post.id;
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
      <div id={`post-${post.id}`} ref={cardRef} className="card-premium hover-lift hover:border-indigo-200 transition-all duration-300 ease-out group relative overflow-hidden">
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
              className="text-4xl hover:scale-110 btn-press transition-all duration-300 animate-bounce-in glow-effect"
            >
              {post.user?.profileImageURL ?
                <img src={post.user.profileImageURL} alt="Avatar" className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent hover:ring-indigo-300 transition-all duration-300" /> :
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
                <span className="font-bold text-slate-900 text-base truncate">{post.user?.name}</span>
                {post.user?.verified && <img src="verify.png" alt="Verified" className="w-5 h-5 flex-shrink-0 animate-scale-in" />}
                <span className="text-slate-500 text-sm">· {formatTimestamp(post.timestamp)}</span>
              </button>
              <div className="flex items-center flex-wrap gap-2 mt-2">
                {post.user?.badges && post.user.badges.split(',').map(badge => <Badge key={badge} name={badge.trim()} />)}
              </div>
            </div>
            {isOwnPost && (
              <div className="relative">
                <button type="button" onClick={() => setShowActions(!showActions)} onTouchStart={() => setShowActions(!showActions)} className="text-slate-400 hover:text-slate-800 p-3 hover:bg-slate-100 rounded-full transition-all active:scale-95">
                  <MoreVertical size={20} />
                </button>
                {showActions && (
                  <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl border-2 border-slate-200 shadow-2xl z-20 overflow-hidden animate-slide-down">
                    <button onClick={() => { onEdit(post); setShowActions(false); }} onTouchStart={() => { onEdit(post); setShowActions(false); }} className="w-full flex items-center gap-3 px-5 py-4 text-left text-base font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"><Edit2 size={18}/> Edit Post</button>
                    <button onClick={() => { onDelete(post.id); setShowActions(false); }} onTouchStart={() => { onDelete(post.id); setShowActions(false); }} className="w-full flex items-center gap-3 px-5 py-4 text-left text-base font-medium text-red-600 hover:bg-red-50 active:scale-95 transition-all border-t border-slate-100"><Trash2 size={18}/> Delete Post</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-slate-700 text-base leading-relaxed mb-4 whitespace-pre-wrap break-words animate-slide-in-up">
            {post.content && post.content.split(' ').map((word, i) => {
              if (word.startsWith('@')) {
                return <span key={i} className="text-indigo-600 font-semibold hover:underline cursor-pointer">{word} </span>;
              }
              return word + ' ';
            })}
          </p>

          {Array.isArray(post.images) && post.images.length > 0 && (
            <div className="relative mb-4 rounded-2xl overflow-hidden bg-slate-100 group/image animate-scale-in">
              <div className="aspect-video flex items-center justify-center">
                <img src={post.images[currentIndex]} alt="" className="w-full h-full object-cover" />
              </div>
              {post.images.length > 1 && (
                <>
                  <button onClick={() => onPrevImage(post.id)} onTouchStart={() => onPrevImage(post.id)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-all active:scale-95 backdrop-blur-sm">
                    <ChevronLeft size={24} />
                  </button>
                  <button onClick={() => onNextImage(post.id)} onTouchStart={() => onNextImage(post.id)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-all active:scale-95 backdrop-blur-sm">
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

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1">
              <button onClick={() => isAuthenticated ? onLike(post.id) : onGuestAction()} onTouchStart={() => isAuthenticated ? onLike(post.id) : onGuestAction()} className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 btn-press hover-lift group/like ${post.liked ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 shadow-soft' : 'hover:bg-slate-100 text-slate-600'}`}>
                <Heart size={20} className={`transition-all duration-300 ${post.liked ? 'fill-current animate-heart-beat' : 'group-hover/like:scale-110'}`} />
                <span className="font-bold text-sm">{post.likes || 0}</span>
              </button>
              <button onClick={() => isAuthenticated ? onToggleComments(post.id) : onGuestAction()} onTouchStart={() => isAuthenticated ? onToggleComments(post.id) : onGuestAction()} className="flex items-center gap-2 px-4 py-2.5 rounded-full hover:bg-slate-100 text-slate-600 transition-all duration-300 btn-press hover-lift">
                <MessageCircle size={20} className="transition-transform group-hover:scale-110 duration-300" />
                <span className="font-bold text-sm">{post.commentsList?.length || 0}</span>
              </button>
            </div>
          </div>

          {isCommentsExpanded && isAuthenticated && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-slide-down">
              <div className="relative">
                <div className="flex gap-3">
                  <div className="text-2xl">
                    {currentUser?.profileImageURL ?
                      <img src={currentUser.profileImageURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover" /> :
                      currentUser?.avatar
                    }
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      value={commentText}
                      onChange={handleCommentChange}
                      placeholder="Add a comment... (use @ to mention)"
                      rows={2}
                      className="w-full bg-slate-50 text-slate-900 rounded-2xl px-4 py-3 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all duration-300 resize-none text-sm hover:border-slate-300"
                    />
                    {commentMentionSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-slide-down z-10">
                        {commentMentionSuggestions.map((user, index) => (
                          <button
                            key={user.id}
                            onClick={() => insertCommentMention(user.username)}
                            onTouchStart={() => insertCommentMention(user.username)}
                            className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition-all text-left"
                          >
                            <div className="text-xl">
                              {user.profileImageURL ?
                                <img src={user.profileImageURL} alt="Avatar" className="w-6 h-6 rounded-full object-cover" /> :
                                user.avatar
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 truncate text-xs">{user.name}</p>
                              <p className="text-slate-500 text-xs truncate">{user.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleComment}
                    onTouchStart={handleComment}
                    disabled={!commentText.trim()}
                    className="self-end px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-glow-blue btn-press hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>

              {post.commentsList && post.commentsList.length > 0 && (
                <div className="space-y-3">
                  {post.commentsList.map((comment, idx) => (
                    <div key={idx} className="flex gap-3 animate-slide-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="text-2xl">
                        {comment.user?.profileImageURL ?
                          <img src={comment.user.profileImageURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover" /> :
                          comment.user?.avatar
                        }
                      </div>
                      <div className="flex-1 bg-slate-50/50 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900 text-sm">{comment.user?.name}</span>
                        </div>
                        <p className="text-slate-700 text-sm">{comment.text}</p>
                        <p className="text-slate-500 text-xs mt-1">{formatTimestamp(comment.timestamp)}</p>
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

  const NotificationDropdown = () => {
    const userNotifications = notifications
      .filter(n => n.recipientId === currentUser.id && n.type !== 'message')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    return (
      <div ref={notificationsRef} className="absolute right-0 top-14 w-80 glass-strong rounded-3xl border-2 border-slate-200 shadow-premium overflow-hidden z-50 animate-slide-down max-h-96 overflow-y-auto custom-scrollbar">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white backdrop-blur-xl">
          <h3 className="font-bold text-lg text-slate-900">Notifications</h3>
        </div>
        {userNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">No notifications yet</p>
          </div>
        ) : (
          userNotifications.map((notif, index) => (
            <button
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              onTouchStart={() => handleNotificationClick(notif)}
              className="w-full p-5 border-b border-slate-100/50 hover:bg-slate-50 transition-all duration-300 flex items-start gap-3 animate-slide-in-left hover-lift"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="text-3xl">{allUsers.find(u => u.id === notif.senderId)?.avatar || '🔔'}</div>
              <div className="flex-1 text-left">
                <p className="text-slate-900">{notif.content}</p>
                <p className="text-slate-500 text-sm mt-1">{formatTimestamp(notif.timestamp)}</p>
              </div>
              {!notif.isRead && <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>}
            </button>
          ))
        )}
      </div>
    );
  };

  const AuthModal = ({ onLogin, onSignup, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', username: '', password: '' });

    const handleSubmit = () => {
      if (isLogin) {
        onLogin(formData);
      } else {
        onSignup(formData);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-premium flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={onClose}>
        <div className="glass-strong rounded-3xl p-8 max-w-sm w-full border border-slate-200 shadow-premium animate-slide-up-bounce" onClick={(e) => e.stopPropagation()}>
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{isLogin ? 'Welcome Back' : 'Join Edge'}</h2>
            <p className="text-slate-600">Connect with your team</p>
          </div>
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-slate-50 text-slate-900 rounded-2xl px-4 py-3 mb-4 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:outline-none transition-all duration-300 hover:border-slate-300"
            />
          )}
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            className="w-full bg-slate-50 text-slate-900 rounded-2xl px-4 py-3 mb-4 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:outline-none transition-all duration-300 hover:border-slate-300"
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full bg-slate-50 text-slate-900 rounded-2xl px-4 py-3 mb-6 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:outline-none transition-all duration-300 hover:border-slate-300"
          />
          <button onClick={handleSubmit} onTouchStart={handleSubmit} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold hover:shadow-glow-blue btn-press hover:scale-105 transition-all duration-300">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
          <p className="text-center mt-4 text-slate-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} onTouchStart={() => setIsLogin(!isLogin)} className="text-indigo-600 font-semibold hover:underline transition-all duration-300">
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    );
  };

  const CreateModal = ({ onPost, postToEdit, onClose }) => {
    const [content, setContent] = useState(postToEdit?.content || '');
    const [images, setImages] = useState(postToEdit?.images || []);
    const fileInputRef = useRef(null);
    const isEdit = !!postToEdit;
    const [uploading, setUploading] = useState(false);

    const handleImage = async (e) => {
      const file = e.target.files[0];
      if (file) {
        setUploading(true);
        try {
          const url = URL.createObjectURL(file);
          setCropImage(url);
          setCropType('post');
          setOnCropCompleteCallback(() => async (croppedBlob) => {
            const compressed = await compressToBlob(croppedBlob);
            const uploadedUrl = await uploadImage(compressed, 'post');
            setImages(prev => [...prev, uploadedUrl]);
          });
        } catch (error) {
          showToast('Failed to upload image.', 'error');
        } finally {
          setUploading(false);
          e.target.value = '';
        }
      }
    };

    const handleSubmit = () => {
      onPost({
        id: postToEdit?.id,
        content,
        images
      });
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-premium flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={onClose}>
        <div className="glass-strong rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-premium animate-slide-up-bounce" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-6">
            <div className="text-4xl">
              {currentUser?.profileImageURL ?
                <img src={currentUser.profileImageURL} alt="Avatar" className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-100" /> :
                currentUser?.avatar
              }
            </div>
            <div>
              <p className="font-bold text-slate-900">{currentUser?.name}</p>
              <p className="text-slate-500 text-sm">{currentUser?.username}</p>
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening in the warehouse?"
            rows={4}
            className="w-full bg-slate-50 text-slate-900 rounded-2xl px-4 py-3 mb-4 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:outline-none transition-all duration-300 resize-none hover:border-slate-300"
          />
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img src={img} alt="" className="w-full h-32 object-cover rounded-xl transition-all duration-300 group-hover:scale-105" />
                  <button onClick={() => setImages(images.filter((_, i) => i !== idx))} onTouchStart={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 btn-press transition-all duration-300 opacity-0 group-hover:opacity-100">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center">
            <button disabled={uploading} onClick={() => fileInputRef.current?.click()} onTouchStart={() => fileInputRef.current?.click()} className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-300 btn-press hover-lift">
              <ImageIcon size={24} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImage} accept="image/*" hidden />
            <button onClick={handleSubmit} onTouchStart={handleSubmit} disabled={isPosting || uploading || (!content.trim() && images.length === 0)} className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold hover:shadow-glow-blue btn-press hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center gap-2">
              {isPosting ? <LoadingSpinner /> : (isEdit ? 'Update' : 'Post')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleProfileImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const tempUrl = URL.createObjectURL(file);
      setCropImage(tempUrl);
      setCropType(type);
      setOnCropCompleteCallback(() => async (croppedBlob) => {
        try {
          const compressedBlob = await compressToBlob(croppedBlob);
          const dataURL = await toBase64(compressedBlob);
          setProfileForm(prev => ({ ...prev, [type === 'profile' ? 'profileImageURL' : 'coverImageURL']: dataURL }));
        } catch (error) {
          showToast('Failed to process image', 'error');
        }
      });
      e.target.value = '';
    }
  };

  const SettingsPage = () => {
    return (
      <div className="fixed inset-0 bg-slate-50 z-[60] overflow-y-auto animate-fade-in smooth-scroll hide-scrollbar">
        <div className="max-w-4xl mx-auto pb-24 md:pb-8">
          <div className="p-4 sticky top-0 glass backdrop-blur-xl z-10 flex items-center gap-4 border-b border-slate-200 shadow-soft">
            <button onClick={() => setShowSettingsPage(false)} onTouchStart={() => setShowSettingsPage(false)} className="text-slate-500 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-full btn-press transition-all duration-300 float-on-hover"><X size={22}/></button>
            <div>
              <h2 className="font-bold text-lg text-slate-900">Settings</h2>
            </div>
          </div>

          <div className="p-6 space-y-8">
            <div className="animate-slide-in-up text-center py-12">
              <Settings className="mx-auto text-slate-300 mb-4" size={64} />
              <p className="text-slate-500 text-lg">Settings coming soon!</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ProfilePage = () => {
    const userPosts = useMemo(() => {
      return currentUser ? posts.filter(p => p.userId === currentUser.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : [];
    }, [currentUser, posts]);

    const profileImageInputRef = useRef(null);
    const coverImageInputRef = useRef(null);

    const cancelEdit = () => {
      setIsEditingProfile(false);
      setProfileForm({
        name: currentUser.name || '',
        bio: currentUser.bio || '',
        avatar: currentUser.avatar || '',
        email: currentUser.email || '',
        profileImageURL: currentUser.profileImageURL || '',
        coverImageURL: currentUser.coverImageURL || ''
      });
    };

    return (
      <div className="fixed inset-0 bg-slate-50 z-[60] overflow-y-auto animate-fade-in smooth-scroll hide-scrollbar">
        <div className="max-w-4xl mx-auto pb-24 md:pb-8">
          <div className="p-4 sticky top-0 glass backdrop-blur-xl z-10 flex items-center justify-between border-b border-slate-200 shadow-soft">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowProfilePage(false)} onTouchStart={() => setShowProfilePage(false)} className="text-slate-500 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-full btn-press transition-all duration-300 float-on-hover"><X size={22}/></button>
              <div>
                <h2 className="font-bold text-lg text-slate-900">{currentUser.name}</h2>
                <p className="text-sm text-slate-500">{userPosts.length} posts</p>
              </div>
            </div>
            {isEditingProfile ? (
              <div className="flex gap-2">
                <button onClick={cancelEdit} onTouchStart={cancelEdit} className="px-5 py-2.5 bg-slate-200 text-slate-800 rounded-xl font-semibold hover:bg-slate-300 btn-press hover-lift transition-all duration-300">Cancel</button>
                <button onClick={handleSaveProfile} onTouchStart={handleSaveProfile} disabled={isSaving} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-glow-blue btn-press hover:scale-105 transition-all duration-300 flex items-center gap-2 disabled:opacity-50">
                  {isSaving ? <LoadingSpinner/> : 'Save'}
                </button>
              </div>
            ) : (
              <button onClick={() => setIsEditingProfile(true)} onTouchStart={() => setIsEditingProfile(true)} className="px-5 py-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl font-semibold hover:bg-slate-200 btn-press hover-lift transition-all duration-300 flex items-center gap-2">
                <Edit2 size={18}/>
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          <div className="relative h-48 md:h-64 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 animate-gradient">
            {isEditingProfile ? (
              <>
                <input type="file" ref={coverImageInputRef} onChange={(e) => handleProfileImageUpload(e, 'cover')} accept="image/*" hidden />
                <button onClick={() => coverImageInputRef.current?.click()} onTouchStart={() => coverImageInputRef.current?.click()} className="w-full h-full group">
                  {profileForm.coverImageURL ? (
                    <img src={profileForm.coverImageURL} alt="Cover" className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full bg-slate-300"></div> }
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={48} className="text-white"/>
                  </div>
                </button>
              </>
            ) : (
              currentUser.coverImageURL && (
                <img src={currentUser.coverImageURL} alt="Cover" className="w-full h-full object-cover" />
              )
            )}
            <div className="absolute -bottom-16 left-6 w-32 h-32 rounded-full border-4 border-white bg-slate-300 flex items-center justify-center text-6xl shadow-premium animate-bounce-in overflow-hidden ring-4 ring-transparent hover:ring-indigo-200 transition-all duration-300">
              {isEditingProfile ? (
                <>
                  <input type="file" ref={profileImageInputRef} onChange={(e) => handleProfileImageUpload(e, 'profile')} accept="image/*" hidden />
                  <button onClick={() => profileImageInputRef.current?.click()} onTouchStart={() => profileImageInputRef.current?.click()} className="w-full h-full group">
                    {profileForm.profileImageURL ? (
                      <img src={profileForm.profileImageURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : <span className="text-6xl">{profileForm.avatar}</span>}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <Camera size={32} className="text-white"/>
                    </div>
                  </button>
                </>
              ) : (
                currentUser.profileImageURL ? (
                  <img src={currentUser.profileImageURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  currentUser.avatar
                )
              )}
            </div>
          </div>

          <div className="pt-20 px-6 pb-6">
            <div className="animate-slide-in-up">
              {isEditingProfile ? (
                <div className="space-y-4">
                  <input type="text" placeholder="Name" value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} className="w-full text-3xl font-bold bg-white text-slate-900 rounded-xl p-2 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-300 hover:border-slate-300"/>
                  <input type="text" placeholder="Email" value={profileForm.email} onChange={(e) => setProfileForm({...profileForm, email: e.target.value})} className="w-full text-base bg-white text-slate-500 rounded-xl p-2 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-300 hover:border-slate-300"/>
                  <textarea placeholder="Bio" value={profileForm.bio} onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})} rows={3} className="w-full text-base bg-white text-slate-700 rounded-xl p-2 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-300 hover:border-slate-300"/>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-slate-900">{currentUser.name}</h2>
                  <p className="text-slate-500 text-lg mt-1">{currentUser.username}</p>
                  {currentUser.email && <p className="text-slate-500 text-base mt-1">{currentUser.email}</p>}
                  <p className="text-slate-700 text-base mt-3 leading-relaxed">{currentUser.bio}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {currentUser.badges && currentUser.badges.split(',').map(badge => <Badge key={badge} name={badge.trim()} />)}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
             <h3 className="text-lg font-bold text-slate-900 px-2">Your Posts</h3>
            {userPosts.map((post, index) => (
              <div key={post.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-slide-in-up">
                <PostCard post={post} isAuthenticated={isAuthenticated} onGuestAction={handleGuestAction} onLike={handleLike} onNextImage={nextImage} onPrevImage={prevImage} onToggleComments={toggleComments} onCommentSubmit={handleCommentSubmit} onEdit={handleEditPost} onDelete={handleDeletePost} highlighted={highlightedPost === post.id}/>
              </div>
            ))}
            {userPosts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500">You haven't posted anything yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const DailyLogPage = () => {
    const [rating, setRating] = useState(3);
    const [feedback, setFeedback] = useState('');
    const [productivity, setProductivity] = useState(3);
    const [issues, setIssues] = useState('');
    const [suggestions, setSuggestions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const todaysLog = dailyLogs.find(l => l.date === today);

    useEffect(() => {
      if (todaysLog) {
        setRating(todaysLog.mood || 3);
        setFeedback(todaysLog.summary || '');
        setProductivity(todaysLog.productivity || 3);
        setIssues(todaysLog.issues || '');
        setSuggestions(todaysLog.suggestions || '');
      } else {
        setRating(3);
        setFeedback('');
        setProductivity(3);
        setIssues('');
        setSuggestions('');
      }
    }, [todaysLog]);

    const handleSubmitLog = async () => {
      if (!currentUser) return;

      setIsSubmitting(true);
      const logData = { 
        userId: currentUser.id, 
        date: today, 
        mood: rating, 
        summary: feedback, 
        productivity,
        issues,
        suggestions
      };

      try {
        if (todaysLog) {
          await apiRequest('PUT', 'dailylogs', logData, todaysLog.id);
          setDailyLogs(prev => prev.map(l => l.id === todaysLog.id ? { ...l, ...logData } : l));
        } else {
          const result = await apiRequest('POST', 'dailylogs', logData);
          const newLog = { ...logData, id: result.id || result.data?.id };
          setDailyLogs([newLog, ...dailyLogs]);
        }
        showToast('Daily log saved!');
      } catch (error) {
        showToast('Failed to save daily log.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    };

    const weekLogs = dailyLogs.slice(0, 7);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Today's Log</h2>
          <div className="mb-4">
            <p className="text-slate-700 mb-2">How was your work day?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  onClick={() => setRating(r)}
                  onTouchStart={() => setRating(r)}
                  className={`text-3xl transition-transform hover:scale-110 ${r <= rating ? 'text-yellow-400' : 'text-slate-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <p className="text-slate-700 mb-2">Productivity Level</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  onClick={() => setProductivity(r)}
                  onTouchStart={() => setProductivity(r)}
                  className={`text-3xl transition-transform hover:scale-110 ${r <= productivity ? 'text-green-400' : 'text-slate-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Summary of the day..."
            rows={3}
            className="w-full bg-slate-50 text-slate-900 rounded-2xl px-4 py-3 mb-4 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:outline-none transition-all duration-300 resize-none hover:border-slate-300"
          />
          <textarea
            value={issues}
            onChange={e => setIssues(e.target.value)}
            placeholder="Any issues encountered?"
            rows={3}
            className="w-full bg-slate-50 text-slate-900 rounded-2xl px-4 py-3 mb-4 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:outline-none transition-all duration-300 resize-none hover:border-slate-300"
          />
          <textarea
            value={suggestions}
            onChange={e => setSuggestions(e.target.value)}
            placeholder="Suggestions for improvement?"
            rows={3}
            className="w-full bg-slate-50 text-slate-900 rounded-2xl px-4 py-3 mb-4 border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:outline-none transition-all duration-300 resize-none hover:border-slate-300"
          />
          <button
            onClick={handleSubmitLog}
            onTouchStart={handleSubmitLog}
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-glow-blue btn-press hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <LoadingSpinner /> : 'Save Log'}
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">This Week's Logs</h2>
          {weekLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No logs this week yet.
            </div>
          ) : (
            weekLogs.map((log, index) => (
              <div
                key={log.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 animate-slide-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <p className="font-bold text-slate-900 mb-2">
                  {new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-yellow-400 mb-2">
                  Mood: {'★'.repeat(log.mood) + '☆'.repeat(5 - log.mood)}
                </p>
                <p className="text-green-400 mb-2">
                  Productivity: {'★'.repeat(log.productivity) + '☆'.repeat(5 - log.productivity)}
                </p>
                {log.summary && (
                  <p className="text-slate-700 mb-2">Summary: {log.summary}</p>
                )}
                {log.issues && (
                  <p className="text-slate-700 mb-2">Issues: {log.issues}</p>
                )}
                {log.suggestions && (
                  <p className="text-slate-700">Suggestions: {log.suggestions}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const GardenPage = () => {
    const plantEmojis = {
      tomato: '🌱',
      sunflower: '🌻',
      carrot: '🥕',
      pepper: '🌶️',
      strawberry: '🍓',
      rose: '🌹',
      orchid: '🌸',
      lotus: '🪷'
    };

    const stageEmojis = ['', '🌱', '🌿', '🪴', '🌺', '🎁'];

    const canCheckInToday = () => {
      if (!gardenData.lastCheckIn) return true;
      const lastCheckIn = new Date(gardenData.lastCheckIn);
      const now = new Date();
      return now.toDateString() !== lastCheckIn.toDateString();
    };

    const getGrowthProgress = (plot) => {
      if (!plot.plantType || plot.stage === 0) return 0;
      return (plot.stage / 5) * 100;
    };

    const SeedSelectionModal = () => {
      if (!showSeedModal) return null;

      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-premium flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={() => setShowSeedModal(false)}>
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full border border-slate-200 shadow-premium animate-slide-up-bounce" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">Choose a Seed</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {Object.entries(plantEmojis).map(([type, emoji]) => {
                const isRare = ['rose', 'orchid', 'lotus'].includes(type);
                const hasSeeds = gardenData.seeds[type] > 0;

                return (
                  <button
                    key={type}
                    onClick={() => handlePlantSeed(type)}
                    disabled={!hasSeeds}
                    className={`w-full p-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-between ${
                      hasSeeds
                        ? isRare
                          ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 hover:from-purple-200 hover:to-pink-200 btn-press hover-lift border-2 border-purple-300 animate-glow'
                          : 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 hover:from-green-200 hover:to-green-300 btn-press hover-lift'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-3xl">{emoji}</span>
                      <span className="capitalize">{type}</span>
                      {isRare && hasSeeds && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">✨ Rare</span>}
                    </span>
                    <span className="text-sm">x{gardenData.seeds[type] || 0}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowSeedModal(false)}
              className="w-full mt-4 py-3 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 rounded-xl font-bold hover:from-slate-300 hover:to-slate-400 btn-press transition-all duration-300"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6 animate-fade-in pb-4">
        <SeedSelectionModal />

        {/* Header */}
        <div className="card-premium p-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">🌻 My Garden</h1>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-amber-200 px-6 py-3 rounded-full border-2 border-amber-300 shadow-soft">
              <span className="text-2xl">⭐</span>
              <span className="text-2xl font-bold text-amber-900">{gardenData.points}</span>
              <span className="text-sm font-semibold text-amber-800">Points</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-amber-100 px-6 py-3 rounded-full border-2 border-yellow-300 shadow-soft">
              <span className="text-2xl">💰</span>
              <span className="text-2xl font-bold text-yellow-900">{gardenData.coins}</span>
              <span className="text-sm font-semibold text-yellow-800">Coins</span>
            </div>
          </div>
        </div>

        {/* Daily Check-in */}
        <div className="card-premium p-6">
          <button
            onClick={handleDailyCheckIn}
            disabled={!canCheckInToday()}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
              canCheckInToday()
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-glow-blue animate-glow btn-press hover:scale-105'
                : 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Calendar size={24} />
            {canCheckInToday() ? 'Daily Check-in Available!' : 'Already Checked In Today'}
          </button>
          <p className="text-slate-600 text-sm text-center mt-3">Get 20 coins + 3 random seeds + 5 water drops daily!</p>
        </div>

        {/* Inventory */}
        <div className="card-premium p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">🎒 Inventory</h2>

          {/* Water Drops */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-2xl mb-4 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet size={24} className="text-blue-600 fill-blue-600" />
                <span className="font-bold text-slate-900">Water Drops</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{gardenData.waterDrops}</span>
            </div>
          </div>

          {/* Seeds */}
          <div className="space-y-2">
            <p className="font-semibold text-slate-700 mb-3">Seeds:</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(plantEmojis).map(([type, emoji]) => (
                <div
                  key={type}
                  className="glass p-3 rounded-xl border border-slate-200 flex items-center justify-between hover-lift transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-sm font-semibold text-slate-700 capitalize">{type}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">x{gardenData.seeds[type]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Shop Section */}
        <div className="card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">🛒 Shop</h2>
            {shopTimer > 0 && (
              <div className={`text-sm font-semibold px-3 py-1 rounded-full ${shopTimer < 30 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700'}`}>
                ⏰ {Math.floor(shopTimer / 60)}:{(shopTimer % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>

          {showShopRefreshAnimation && (
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border-2 border-purple-300 animate-bounce-in text-center">
              <p className="font-bold text-purple-900">✨ New Items Available! ✨</p>
            </div>
          )}

          {offlineGrowthMessage && (
            <div className="mb-4 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border-2 border-green-300 animate-slide-up text-center">
              <p className="font-bold text-green-900">{offlineGrowthMessage}</p>
            </div>
          )}

          {gardenData.shopInventory && gardenData.shopInventory.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {gardenData.shopInventory.map((item) => {
                const itemDisplay = item.type === 'seed'
                  ? { emoji: item.rarity === 'rare' ? (item.seedType === 'rose' ? '🌹' : item.seedType === 'orchid' ? '🌸' : '🪷') : '🌱', name: item.seedType }
                  : item.type === 'water'
                  ? { emoji: '💧', name: `${item.quantity || 3} Water` }
                  : { emoji: '✨', name: 'Fertilizer' };

                const canAfford = gardenData.coins >= item.price;

                return (
                  <div
                    key={item.id}
                    className={`glass p-4 rounded-xl border-2 transition-all duration-300 ${
                      item.rarity === 'rare' ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 animate-glow' : 'border-slate-200'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2 animate-bounce-in">{itemDisplay.emoji}</div>
                      <p className="font-bold text-slate-900 text-sm capitalize mb-1">{itemDisplay.name}</p>
                      <div className="flex items-center justify-center gap-1 mb-3">
                        <span className="text-xl">💰</span>
                        <span className="font-bold text-yellow-700">{item.price}</span>
                      </div>
                      <button
                        onClick={() => handleShopPurchase(item)}
                        disabled={!canAfford}
                        className={`w-full py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                          canAfford
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 btn-press hover-lift'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? 'Buy' : 'Need More'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p className="text-4xl mb-2">🔄</p>
              <p className="font-semibold">Shop refreshing...</p>
            </div>
          )}
        </div>

        {/* Garden Grid */}
        <div className="card-premium p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">🌿 Garden Plots</h2>
          <div className="grid grid-cols-2 gap-4">
            {gardenData.plots.map((plot) => (
              <button
                key={plot.id}
                onClick={() => handlePlotClick(plot)}
                className={`glass p-6 rounded-2xl border-2 transition-all duration-300 btn-press hover-lift relative overflow-hidden ${
                  plot.stage === 5
                    ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-glow-purple animate-pulse'
                    : plot.plantType
                    ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50'
                    : 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 hover:border-indigo-300'
                }`}
              >
                {/* Plot Content */}
                <div className="flex flex-col items-center justify-center gap-2 min-h-[100px]">
                  {plot.plantType ? (
                    <>
                      <div className="text-5xl animate-bounce-in">
                        {stageEmojis[plot.stage]}
                      </div>
                      <div className="text-xs font-semibold text-slate-700 capitalize">
                        {plot.plantType}
                      </div>
                      {plot.stage < 5 && (
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                            style={{ width: `${getGrowthProgress(plot)}%` }}
                          />
                        </div>
                      )}
                      {plot.stage === 5 && (
                        <div className="text-xs font-bold text-amber-600 animate-bounce">
                          Ready to Harvest!
                        </div>
                      )}
                      {plot.stage > 0 && plot.stage < 5 && (
                        <div className="text-xs text-blue-600 flex items-center gap-1">
                          <Droplet size={12} className="fill-blue-600" />
                          <span>Click to Water</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-4xl text-slate-300">➕</div>
                      <div className="text-xs font-semibold text-slate-500">Plant Seed</div>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Achievement Info */}
        <div className="card-premium p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">🏆 Harvest Rewards</h2>
          <div className="space-y-2 text-sm">
            <p className="text-xs text-slate-600 mb-3 font-semibold">Common Seeds:</p>
            <div className="flex justify-between items-center p-2 glass rounded-lg">
              <span>🌱 Tomato</span>
              <span className="font-bold text-amber-600">10 pts + 5 💰</span>
            </div>
            <div className="flex justify-between items-center p-2 glass rounded-lg">
              <span>🥕 Carrot</span>
              <span className="font-bold text-amber-600">12 pts + 5 💰</span>
            </div>
            <div className="flex justify-between items-center p-2 glass rounded-lg">
              <span>🌻 Sunflower</span>
              <span className="font-bold text-amber-600">15 pts + 5 💰</span>
            </div>
            <div className="flex justify-between items-center p-2 glass rounded-lg">
              <span>🌶️ Pepper</span>
              <span className="font-bold text-amber-600">18 pts + 5 💰</span>
            </div>
            <div className="flex justify-between items-center p-2 glass rounded-lg">
              <span>🍓 Strawberry</span>
              <span className="font-bold text-amber-600">20 pts + 5 💰</span>
            </div>

            <p className="text-xs text-purple-600 mb-2 mt-4 font-semibold">✨ Rare Seeds:</p>
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <span>🌹 Rose</span>
              <span className="font-bold text-purple-600">30 pts + 15 💰</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <span>🌸 Orchid</span>
              <span className="font-bold text-purple-600">40 pts + 20 💰</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <span>🪷 Lotus</span>
              <span className="font-bold text-purple-600">50 pts + 25 💰</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const UserProfileView = ({ user }) => {
    const userPosts = posts.filter(p => p.userId === user.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return (
      <div className="fixed inset-0 bg-slate-50 z-[60] overflow-y-auto animate-fade-in smooth-scroll hide-scrollbar">
        <div className="max-w-4xl mx-auto pb-24 md:pb-8">
          <div className="p-4 sticky top-0 glass backdrop-blur-xl z-10 flex items-center justify-between border-b border-slate-200 shadow-soft">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewingUser(null)} onTouchStart={() => setViewingUser(null)} className="text-slate-500 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-full btn-press transition-all duration-300 float-on-hover"><X size={22}/></button>
              <div>
                <h2 className="font-bold text-lg text-slate-900">{user.name}</h2>
                <p className="text-sm text-slate-500">{userPosts.length} posts</p>
              </div>
            </div>
          </div>

          <div className="relative h-48 md:h-64 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 animate-gradient">
            {user.coverImageURL && (
              <img src={user.coverImageURL} alt="Cover" className="w-full h-full object-cover" />
            )}
            <div className="absolute -bottom-16 left-6 w-32 h-32 rounded-full border-4 border-white bg-slate-300 flex items-center justify-center text-6xl shadow-xl animate-bounce-in overflow-hidden">
              {user.profileImageURL ? (
                <img src={user.profileImageURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.avatar
              )}
            </div>
          </div>

          <div className="pt-20 px-6 pb-6">
            <div className="animate-slide-in-up">
              <h2 className="text-3xl font-bold text-slate-900">{user.name}</h2>
              <p className="text-slate-500 text-lg mt-1">{user.username}</p>
              {user.email && <p className="text-slate-500 text-base mt-1">{user.email}</p>}
              <p className="text-slate-700 text-base mt-3 leading-relaxed">{user.bio}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {user.badges && user.badges.split(',').map(badge => <Badge key={badge} name={badge.trim()} />)}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {userPosts.map((post, index) => (
              <div key={post.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-slide-in-up">
                <PostCard post={post} isAuthenticated={isAuthenticated} onGuestAction={handleGuestAction} onLike={handleLike} onNextImage={nextImage} onPrevImage={prevImage} onToggleComments={toggleComments} onCommentSubmit={handleCommentSubmit} onEdit={handleEditPost} onDelete={handleDeletePost} highlighted={highlightedPost === post.id}/>
              </div>
            ))}
            {userPosts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500">No posts yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const GroupChatPage = () => {
    const [localGroupChatMessage, setLocalGroupChatMessage] = useState('');
    const [isChatRefreshing, setIsChatRefreshing] = useState(false);

    useEffect(() => {
      if (groupChatScrollRef.current) {
        groupChatScrollRef.current.scrollTop = groupChatScrollRef.current.scrollHeight;
      }
    }, [groupMessages]);

    const handleChatRefresh = async () => {
      setIsChatRefreshing(true);
      try {
        const groupChatData = await apiRequest('GET', 'groupchat');
        const enrichedGroupMessages = groupChatData
          .map(msg => ({
            ...msg,
            user: allUsers.find(u => u.id === msg.senderId)
          }))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setGroupMessages(enrichedGroupMessages);
        showToast('Chat refreshed!');
      } catch (error) {
        showToast('Failed to refresh chat.', 'error');
      } finally {
        setIsChatRefreshing(false);
      }
    };

    const handleSendGroupMessage = async () => {
      if (!localGroupChatMessage.trim() || !currentUser) return;

      try {
        const newMessage = {
          senderId: currentUser.id,
          text: localGroupChatMessage,
          timestamp: new Date().toISOString()
        };

        const result = await apiRequest('POST', 'groupchat', newMessage);

        const messageWithId = {
          ...newMessage,
          id: result.id || result.data?.id,
          user: currentUser
        };

        setGroupMessages(prev => [...prev, messageWithId]);
        setLocalGroupChatMessage('');

        setTimeout(() => {
          if (groupChatScrollRef.current) {
            groupChatScrollRef.current.scrollTop = groupChatScrollRef.current.scrollHeight;
          }
        }, 100);
      } catch (error) {
        showToast('Failed to send group message.', 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col animate-fade-in">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center gap-4">
          <button onClick={() => setShowGroupChat(false)} onTouchStart={() => setShowGroupChat(false)} className="text-slate-500 hover:text-slate-900 p-2 hover:bg-white/50 rounded-full active:scale-95 transition-all">
            <X size={22}/>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Team Chat</h2>
            <p className="text-sm text-slate-500">{allUsers.length} team members</p>
          </div>
          <button onClick={handleChatRefresh} onTouchStart={handleChatRefresh} disabled={isChatRefreshing} className="ml-auto p-2 text-slate-500 hover:text-indigo-600 transition-all">
            {isChatRefreshing ? <LoadingSpinner /> : <RefreshCw size={22} />}
          </button>
        </div>

        <div ref={groupChatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {groupMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">👋</div>
                <p className="text-slate-500 font-medium">Say hello to the team!</p>
              </div>
            </div>
          ) : (
            groupMessages.map((msg, index) => {
              const isOwnMessage = msg.senderId === currentUser?.id;
              return (
                <div
                  key={msg.id || index}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-slide-in-up`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {!isOwnMessage && (
                    <div className="text-3xl mr-3">
                      {msg.user?.profileImageURL ?
                        <img src={msg.user.profileImageURL} alt="Avatar" className="w-10 h-10 rounded-full object-cover" /> :
                        msg.user?.avatar
                      }
                    </div>
                  )}
                  <div className={`max-w-xs lg:max-w-md ${
                    isOwnMessage
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                      : 'bg-white text-slate-900 border border-slate-200'
                  } rounded-3xl px-5 py-3 shadow-sm`}>
                    {!isOwnMessage && (
                      <p className="font-bold text-xs mb-1 opacity-70">{msg.user?.name}</p>
                    )}
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className={`text-xs mt-1 ${isOwnMessage ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {formatTimestamp(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-3">
            <input
              type="text"
              value={localGroupChatMessage}
              onChange={(e) => setLocalGroupChatMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && localGroupChatMessage.trim()) {
                  handleSendGroupMessage();
                }
              }}
              placeholder="Message the team..."
              className="flex-1 bg-slate-100 text-slate-900 rounded-2xl px-5 py-3 border-2 border-transparent focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:outline-none transition-all duration-300 hover:bg-slate-50"
            />
            <button
              onClick={handleSendGroupMessage}
              onTouchStart={handleSendGroupMessage}
              disabled={!localGroupChatMessage.trim()}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:shadow-glow-blue btn-press hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 overflow-hidden flex flex-col relative">
      {/* Premium Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.05),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.05),transparent_50%)] pointer-events-none"></div>
      <header className={`glass border-b border-slate-200/50 backdrop-blur-xl transition-all duration-300 z-40 shadow-soft ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            
              <img src="logo10.png" alt="Edge Logo" className="w-10 h-10" />
            
            <h1 className="text-2xl font-bold text-slate-900">WUPHF</h1>
          </div>

          <div className="flex-1 max-w-xl mx-8 relative hidden md:block">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 transition-colors duration-300" size={20} />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 text-slate-900 rounded-2xl pl-12 pr-4 py-3 border-2 border-transparent focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:outline-none transition-all duration-300 hover:bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              onTouchStart={handleRefresh}
              disabled={isRefreshing}
              className="p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all duration-300 btn-press hover-lift"
            >
              {isRefreshing ? <LoadingSpinner /> : <RefreshCw size={22} className="transition-transform duration-300 hover:rotate-45" />}
            </button>
            <div className="relative">
              <button
                onClick={() => isAuthenticated ? setShowNotifications(!showNotifications) : handleGuestAction()}
                onTouchStart={() => isAuthenticated ? setShowNotifications(!showNotifications) : handleGuestAction()}
                className="relative p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all duration-300 btn-press float-on-hover"
              >
                <Bell size={22} className="transition-transform duration-300" />
                {isAuthenticated && unreadCount > 0 && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-gradient-to-br from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce-in shadow-glow-purple pulse-notification">
                    {unreadCount}
                  </div>
                )}
              </button>
              {isAuthenticated && showNotifications && <NotificationDropdown />}
            </div>
            <div className="relative">
              <button
                onClick={() => isAuthenticated ? setShowProfileMenu(!showProfileMenu) : handleGuestAction()}
                onTouchStart={() => isAuthenticated ? setShowProfileMenu(!showProfileMenu) : handleGuestAction()}
                className="text-3xl hover:scale-110 btn-press transition-all duration-300 glow-effect"
              >
                {isAuthenticated && currentUser ? (
                  currentUser.profileImageURL ?
                  <img src={currentUser.profileImageURL} alt="Avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent hover:ring-indigo-300 transition-all duration-300 shadow-soft hover:shadow-glow-blue" /> :
                  currentUser.avatar
                ) : <User className="w-10 h-10 rounded-full p-2 bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors duration-300"/>
                }
              </button>
              {isAuthenticated && showProfileMenu && (
                <div ref={profileMenuRef} className="absolute right-0 top-14 w-64 bg-white rounded-3xl border-2 border-slate-200 shadow-2xl overflow-hidden z-50 animate-slide-down">
                  <div className="p-5 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-4xl">
                        {currentUser?.profileImageURL ?
                          <img src={currentUser.profileImageURL} alt="Avatar" className="w-12 h-12 rounded-full object-cover" /> :
                          currentUser?.avatar
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{currentUser?.name}</p>
                        <p className="text-slate-500 text-sm truncate">{currentUser?.username}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setShowProfilePage(true); setShowProfileMenu(false); }} onTouchStart={() => { setShowProfilePage(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-5 py-4 text-left text-slate-700 hover:bg-slate-50 transition-all active:scale-95">
                    <User size={20} />
                    <span className="font-medium">Profile</span>
                  </button>
                  <button onClick={() => { setShowSettingsPage(true); setShowProfileMenu(false); }} onTouchStart={() => { setShowSettingsPage(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-5 py-4 text-left text-slate-700 hover:bg-slate-50 transition-all active:scale-95 border-t border-slate-100">
                    <Settings size={20} />
                    <span className="font-medium">Settings</span>
                  </button>
                  <button onClick={handleLogout} onTouchStart={handleLogout} className="w-full flex items-center gap-3 px-5 py-4 text-left text-red-600 hover:bg-red-50 transition-all active:scale-95 border-t border-slate-100">
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
        className="flex-1 overflow-y-auto smooth-scroll hide-scrollbar transition-all duration-300 ease-in-out"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        {...swipeHandlers}
      >
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          {isLoading || isRefreshing ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <>
              {activeTab === 'feed' && (
                <div className="space-y-4">
                  {filteredAndSortedPosts.map((post, index) => (
                    <div key={post.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-slide-in-up">
                      <PostCard
                        post={post}
                        isAuthenticated={isAuthenticated}
                        onGuestAction={handleGuestAction}
                        onLike={handleLike}
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
                      <h3 className="text-2xl font-bold text-slate-800 mb-2">No posts yet</h3>
                      <p className="text-slate-600">Be the first to share something!</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'groupchat' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center animate-fade-in">
                  <div className="text-7xl mb-4">💬</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Team Chat</h3>
                  <p className="text-slate-600 mb-6">Connect with your warehouse team</p>
                  <button
                    onClick={() => isAuthenticated ? setShowGroupChat(true) : handleGuestAction()}
                    onTouchStart={() => isAuthenticated ? setShowGroupChat(true) : handleGuestAction()}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold hover:shadow-glow-blue float-on-hover btn-press transition-all duration-300"
                  >
                    Open Team Chat
                  </button>
                </div>
              )}

              {activeTab === 'dailylog' && <DailyLogPage />}

              {activeTab === 'garden' && <GardenPage />}
            </>
          )}
        </div>
      </div>

      <nav className="glass border-t border-slate-200/50 px-2 py-2 flex justify-around items-center shadow-soft backdrop-blur-xl">
        <button onClick={() => setActiveTab('feed')} onTouchStart={() => setActiveTab('feed')} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300 btn-press hover-lift ${activeTab === 'feed' ? 'text-indigo-600 bg-gradient-to-r from-indigo-50 to-indigo-100 shadow-soft' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Home size={22} className={`transition-transform duration-300 ${activeTab === 'feed' ? 'fill-current' : ''}`} />
          <span className="text-xs font-semibold">Feed</span>
        </button>
        <button onClick={() => setActiveTab('groupchat')} onTouchStart={() => setActiveTab('groupchat')} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300 btn-press hover-lift ${activeTab === 'groupchat' ? 'text-indigo-600 bg-gradient-to-r from-indigo-50 to-indigo-100 shadow-soft' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Users size={22} className={`transition-transform duration-300 ${activeTab === 'groupchat' ? 'fill-current' : ''}`} />
          <span className="text-xs font-semibold">Chat</span>
        </button>
        <button onClick={() => isAuthenticated ? setShowCreateModal(true) : handleGuestAction()} onTouchStart={() => isAuthenticated ? setShowCreateModal(true) : handleGuestAction()} className="relative -mt-6 w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl flex items-center justify-center shadow-premium hover:shadow-glow-blue float-on-hover btn-press transition-all duration-300 animate-glow">
          <Plus size={32} strokeWidth={3} className="transition-transform duration-300" />
        </button>
        <button onClick={() => setActiveTab('dailylog')} onTouchStart={() => setActiveTab('dailylog')} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300 btn-press hover-lift ${activeTab === 'dailylog' ? 'text-indigo-600 bg-gradient-to-r from-indigo-50 to-indigo-100 shadow-soft' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Calendar size={22} className={`transition-transform duration-300 ${activeTab === 'dailylog' ? 'fill-current' : ''}`} />
          <span className="text-xs font-semibold">Log</span>
        </button>
        <button onClick={() => isAuthenticated ? setActiveTab('garden') : handleGuestAction()} onTouchStart={() => isAuthenticated ? setActiveTab('garden') : handleGuestAction()} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300 btn-press hover-lift ${activeTab === 'garden' ? 'text-green-600 bg-gradient-to-r from-green-50 to-green-100 shadow-soft' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Sprout size={22} className={`transition-transform duration-300 ${activeTab === 'garden' ? 'fill-current' : ''}`} />
          <span className="text-xs font-semibold">Garden</span>
        </button>
      </nav>

      {showAuthModal && <AuthModal onLogin={handleLogin} onSignup={handleSignup} onClose={() => setShowAuthModal(false)} />}
      {showCreateModal && <CreateModal onPost={handlePostSubmit} postToEdit={editingPost} onClose={() => { setShowCreateModal(false); setEditingPost(null); }} />}
      {showDeleteConfirm && <ConfirmationModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} title="Delete Post?" message="This action cannot be undone." isLoading={isSaving} />}
      {showProfilePage && currentUser && <ProfilePage />}
      {showSettingsPage && isAuthenticated && <SettingsPage />}
      {showGroupChat && isAuthenticated && <GroupChatPage />}
      {viewingUser && <UserProfileView user={viewingUser} />}
      {cropImage && <CropModal imageSrc={cropImage} cropType={cropType} onCropComplete={onCropCompleteCallback} onClose={() => setCropImage(null)} />}

      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-[70] animate-slide-in-up ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-white text-slate-900 border-2 border-slate-200'
        }`}>
          <p className="font-semibold">{toast.message}</p>
        </div>
      )}
    </div>
  );
};

export default EdgeApp;