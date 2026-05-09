import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useBrand } from "./contexts/BrandContext";
import { useApi } from "./lib/api/hooks";
import { apiRequest } from "./lib/api/client";
import { useOnboarding } from "./contexts/OnboardingContext";
import OnboardingLayout from "./components/onboarding/OnboardingLayout";
import WelcomeStep from "./components/onboarding/steps/WelcomeStep";
import BrandStep from "./components/onboarding/steps/BrandStep";
import MarketStep from "./components/onboarding/steps/MarketStep";
import GoalsStep from "./components/onboarding/steps/GoalsStep";
import PlatformsStep from "./components/onboarding/steps/PlatformsStep";
import GenerationStep from "./components/onboarding/steps/GenerationStep";
import ScheduleStep from "./components/onboarding/steps/ScheduleStep";
import CompletionStep from "./components/onboarding/steps/CompletionStep";
import ModeStep from "./components/onboarding/steps/ModeStep";
import ImportStep from "./components/onboarding/steps/ImportStep";
import ActivationStep from "./components/onboarding/steps/ActivationStep";
import CalendarSchedule from "./pages/CalendarSchedule";
import ArticleComposer from "./pages/ArticleComposer";
import Campaigns from "./pages/Campaigns";
import Analytics from "./pages/Analytics";
import SEOCentre from "./pages/SEOCentre";
import Reporting from "./pages/Reporting";
import CanvaTab from "./pages/CanvaTab";
import MediaLibrary from "./pages/MediaLibrary";
import Settings from "./pages/Settings";
import Integrations from "./pages/Integrations";
import DashboardOverview from "./pages/DashboardOverview";
import SocialComposer from "./pages/SocialComposer"; // DEPRECATED: Keep for safe migration reference
import CreatePost from "./pages/CreatePost";
import ContentManagement from "./pages/ContentManagement";
import Teams from "./pages/Teams";
import Growth from "./pages/Growth";
import DashboardInsights from "./pages/DashboardInsights";
import BrandDNA from "./pages/BrandDNA";
import ContentOpportunities from "./pages/ContentOpportunities";
import BillingTab from "./pages/BillingTab";
import NotificationsTab from "./pages/NotificationsTab";
import AssistantModal from "./components/shared/AssistantModal";
import CampaignBuilderModal from "./components/shared/CampaignBuilderModal";
import LayoutShell from "./components/layout/LayoutShell";
import ContentPreviewModal from "./components/shared/ContentPreviewModal";
import BrandDNAWizardModal from "./components/shared/BrandDNAWizardModal";
import FloatingChat from "./components/specialized/FloatingChat";
import InsightModal from "./components/shared/InsightModal";
import { generateIntelligence } from "./lib/intelligence";
import "./styles/auth.css";

const USE_FAKE_AI = true;

const PLATFORM_ICONS = {
  facebook: (color = "#1877F2") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  instagram: (color = "#E4405F") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4.162 4.162 0 110-8.324 4.162 4.162 0 010 8.324zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  linkedin: (color = "#0A66C2") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
    </svg>
  ),
  x: (color = "#000000") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.497h2.039L6.486 3.24H4.298l13.309 17.41z"/>
    </svg>
  ),
  pinterest: (color = "#BD081C") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12.017 0C5.396 0 0 5.397 0 12.017c0 5.078 3.158 9.412 7.618 11.169-.103-.947-.19-2.401.04-3.434.207-.88 1.337-5.66 1.337-5.66s-.341-.682-.341-1.691c0-1.583.918-2.766 2.061-2.766 0.972 0 1.441.73 1.441 1.604 0 .978-.622 2.441-.944 3.796-.269 1.137.571 2.064 1.692 2.064 2.03 0 3.593-2.141 3.593-5.232 0-2.736-1.966-4.649-4.774-4.649-3.252 0-5.161 2.439-5.161 4.958 0 .983.379 2.037.852 2.61.093.114.107.214.079.324-.087.363-.28 1.144-.317 1.298-.049.204-.163.248-.376.148-1.405-.654-2.28-2.709-2.28-4.363 0-3.554 2.581-6.819 7.456-6.819 3.913 0 6.954 2.788 6.954 6.517 0 3.888-2.451 7.017-5.852 7.017-1.143 0-2.218-.593-2.586-1.293 0 0-.568 2.164-.707 2.701-.257.986-.951 2.223-1.415 2.977 1.127.348 2.32.536 3.559.536 6.621 0 12.017-5.396 12.017-12.017C24.034 5.397 18.638 0 12.017 0z"/>
    </svg>
  ),
  youtube: (color = "#FF0000") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  tiktok: (color = "#000000") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.58-1.01V12a8.66 8.66 0 0 1-8.66 8.66A8.66 8.66 0 0 1 1 12a8.66 8.66 0 0 1 8.66-8.66c.55 0 1.09.05 1.62.14V7.52a4.67 4.67 0 0 0-1.62-.28A4.66 4.66 0 0 0 5 12a4.66 4.66 0 0 0 4.66 4.66 4.66 4.66 0 0 0 4.66-4.66V0s-1.8.02-1.8.02z"/>
    </svg>
  ),
  threads: (color = "#000000") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 24c-6.627 0-12-5.373-12-12s5.373-12 12-12 12 5.373 12 12-5.373 12-12 12zm0-2c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10zm0-18c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 2c3.314 0 6 2.686 6 6s-2.686 6-6 6-6-2.686-6-6 2.686-6 6-6z"/>
    </svg>
  )
};

// Authoritative Tab Content Wrapper
const TabContent = ({ id, children, activeTab }) => {
  if (activeTab !== id) return null;
  return (
    <div className={`tab-pane fade show active`} id={`tab-${id}`} role="tabpanel">
      {children}
    </div>
  );
};


function App() {
  const { token, login: setAuthToken, loading: authLoading, logout, user } = useAuth();
  
  // 🧪 5. ENABLE DEV BYPASS FOR TESTING
  const DEV_BYPASS = false;
  
  // Requirement: Use env variable for Canva Client ID (LOCKED)
  const CANVA_CLIENT_ID = import.meta.env.VITE_CANVA_CLIENT_ID || "mpp-test-client-id";

  /* ------------------------------------------------------------------
     CANVA SDK INITIALIZATION (PHASE 4)
  ------------------------------------------------------------------ */
  useEffect(() => {
    // 🚀 Load Canva SDK (LOCKED REQUIREMENT)
    const script = document.createElement("script");
    script.src = "https://sdk.canva.com/designbutton/v2/api.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const common = ["the", "and", "for", "with", "that", "this", "from", "your", "our", "are", "you", "will", "can", "how", "what", "when", "why"];
  const extractKeywords = (text) => {
    if (!text) return "";
    return text.toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 3 && !common.includes(w))
      .slice(0, 5)
      .join(" ");
  };

  const { brands, activeBrand, setActiveBrand, switchBrand, createBrand: contextCreateBrand, loading: brandLoading } = useBrand();
  const { step, isComplete, loading: onboardingLoading, data: onboardingData } = useOnboarding();
  const onboardingMode = onboardingData?.onboardingMode;

  const location = useLocation();
  const navigate = useNavigate();
  const isRegistering = location.pathname === "/register";

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [auditFixContext, setAuditFixContext] = useState(null);
  const [showNewDashboard, setShowNewDashboard] = useState(true);

  // Notification & Growth Global State
  const [notifications, setNotifications] = useState([]);
  const [growth, setGrowth] = useState({ points: 0, level: 'Starter', streak_days: 0, progress_percentage: 0 });
  const [intelligence, setIntelligence] = useState([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);

  const apiSafeFetch = async (url) => {
    try {
      const res = await apiRequest(url);
      return res;
    } catch (e) {
      return { data: [], error: true };
    }
  };

  const fetchGlobalData = async () => {
    if (!activeBrand?.id) return;
    setIsLoadingGlobal(true);
    try {
      const [notifRes, growthRes, intelRes] = await Promise.all([
        apiSafeFetch(`/api/customer/notifications?brandId=${activeBrand.id}`),
        apiSafeFetch(`/api/customer/growth/summary?brandId=${activeBrand.id}`),
        apiSafeFetch(`/api/customer/intelligence?brandId=${activeBrand.id}&limit=5`)
      ]);
      
      setNotifications(notifRes.data || []);
      setGrowth(growthRes.status === 'success' ? growthRes.data : growthRes);
      setIntelligence(intelRes.data || []);
    } catch (err) {
      console.error("[App] Global Data Fetch Failed:", err);
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, [activeBrand?.id]);

  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Capture Audit Data (Task 9 & AHA Funnel)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const website = params.get('website');
    const brandName = params.get('brand_name');
    
    if (isRegistering) {
      if (brandName && !companyName) {
        setCompanyName(brandName);
      } else if (website && !companyName) {
        const domain = website.replace(/^https?:\/\//, '').split('/')[0];
        const name = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
        setCompanyName(name);
      }
    }
  }, [location.search, isRegistering]);

  // Brand Creation State
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandIndustry, setNewBrandIndustry] = useState("");
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  
  // V1.1.1 FINAL Centralized Content State
  const [socialContent, setSocialContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [platformVariants, setPlatformVariants] = useState({});
  const [hashtags, setHashtags] = useState([]);
  const [imageMedia, setImageMedia] = useState(null);
  const [videoMedia, setVideoMedia] = useState(null);
  const [blogLink, setBlogLink] = useState(null);
  const [currentContentId, setCurrentContentId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [previewDraft, setPreviewDraft] = useState(null);
  const [blogUrlInput, setBlogUrlInput] = useState("");
  const [blogTitleInput, setBlogTitleInput] = useState("");
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaModalType, setMediaModalType] = useState("image"); // "image" or "video"
  const [isBlogLinkModalOpen, setIsBlogLinkModalOpen] = useState(false);
  const [isMultiView, setIsMultiView] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [activeInsight, setActiveInsight] = useState(null);
  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const [brandInsights, setBrandInsights] = useState([]);

  const [selectedAsset, setSelectedAsset] = useState(null);

  // FINAL LOCK: Reset logic for campaign selection
  useEffect(() => {
    setSelectedCampaignId(null);
  }, [activeTab]);
  const [socialSubTab, setSocialSubTab] = useState('compose');
  const [analyticsSubTab, setAnalyticsSubTab] = useState('overview');
  const [contentSubTab, setContentSubTab] = useState('draft-content');
  const [listVersion, setListVersion] = useState(0);
  const [articleTitle, setArticleTitle] = useState("");
  const [articleBody, setArticleBody] = useState("");
  const [currentArticle, setCurrentArticle] = useState(null);
  const [referralCode, setReferralCode] = useState("");

  // URL Referral Detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setReferralCode(ref);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Brand Switch Listener
  useEffect(() => {
    if (activeBrand?.id) {
      setListVersion(v => v + 1);
      setSocialContent("");
      setCurrentContentId(null);
      setPlatformVariants({});
      setHashtags([]);
      setImageMedia(null);
      setVideoMedia(null);
      setBlogLink(null);
    }
  }, [activeBrand?.id]);

  // Tab Switch Listener (Global Bridge)
  useEffect(() => {
    const handleSwitch = (e) => {
      if (e.detail) setActiveTab(e.detail);
    };
    const handleRefresh = () => {
      setListVersion(v => v + 1);
    };
    window.addEventListener('switch-tab', handleSwitch);
    window.addEventListener('refresh-data', handleRefresh);
    return () => {
      window.removeEventListener('switch-tab', handleSwitch);
      window.removeEventListener('refresh-data', handleRefresh);
    };
  }, []);

  // Scheduling State (V1.1.5 Hardened UI)
  const [isSchModalOpen, setIsSchModalOpen] = useState(false);
  const [schDate, setSchDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));

  // Freepik Search State (V1.1.4 Corrected)
  const [freepikSearch, setFreepikSearch] = useState("");
  const [freepikResults, setFreepikResults] = useState([]);
  const [isFreepikSearching, setIsFreepikSearching] = useState(false);

  const handleFreepikSearch = async (query) => {
    const searchQuery = query || freepikSearch || `${activeBrand?.industry || ''} ${extractKeywords(socialContent)}`.trim();
    if (!freepikSearch && !query) setFreepikSearch(searchQuery);
    
    setIsFreepikSearching(true);
    setTimeout(() => {
      const mockResults = [1,2,3,4,5,6,7,8].map(i => ({
        id: i,
        url: `https://picsum.photos/seed/${searchQuery.replace(/\s+/g, '')}${i}/800/600`,
        thumb: `https://picsum.photos/seed/${searchQuery.replace(/\s+/g, '')}${i}/300/300`
      }));
      setFreepikResults(mockResults);
      setIsFreepikSearching(false);
    }, 800);
  };

  const fileInputRef = React.useRef(null);
  const videoInputRef = React.useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const res = await apiRequest("/api/customer/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (res.token) {
        setAuthToken(res.token);
        navigate(res.user?.onboarding_complete || res.user?.company_name ? "/" : "/onboarding");
      } else {
        setLoginError("Invalid credentials");
      }
    } catch (err) {
      setLoginError(err.message || "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const searchParams = new URLSearchParams(location.search);
      const res = await apiRequest("/api/customer/register", {
        method: "POST",
        body: JSON.stringify({ 
          email: loginEmail, 
          password: loginPassword, 
          referral_code: referralCode,
          first_name: firstName,
          last_name: lastName,
          company: companyName,
          audit_id: searchParams.get('audit_id') || undefined,
          audit_website: searchParams.get('website') || undefined
        })
      });
      if (res.ok) {
        await handleLogin(e);
      } else {
        setLoginError(res.error || "Registration failed");
      }
    } catch (err) {
      setLoginError(err.message || "Registration failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSocialAuth = (platform) => {
    setLoginError(`${platform.charAt(0).toUpperCase() + platform.slice(1)} Sign-In is being set up. Please use email & password for now.`);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await apiRequest('/api/customer/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail })
      });
    } catch (_) { }
    setForgotSent(true);
    setForgotLoading(false);
  };

  /* ------------------------------------------------------------------
     CANVA DESIGN FLOW (PHASE 4 - LOCKED)
  ------------------------------------------------------------------ */

  const handleCanvaDesign = () => {
    if (!window.Canva || !window.Canva.DesignButton) {
      alert("Canva SDK is still loading. Please try again in a moment.");
      return;
    }

    const mapping = {
      instagram: 'InstagramPost',
      facebook: 'FacebookPost',
      linkedin: 'LinkedInPost',
      x: 'TwitterPost',
      pinterest: 'PinterestPin',
      tiktok: 'MobileVideo',
      youtube: 'YouTubeThumbnail'
    };

    const designType = mapping[selectedPlatforms[0]] || 'InstagramPost';

    window.Canva.DesignButton.initialize({
      apiKey: CANVA_CLIENT_ID 
    }).then((api) => {
      api.createDesign({
        type: designType,
        onDesignPublish: (exportData) => {
          if (exportData.exportUrl) {
            setImageMedia(exportData.exportUrl);
            alert("Canva design successfully attached to post! 🚀");
          } else {
            alert("Error: Canva design export failed. Please try again.");
          }
        }
      });
    }).catch(err => {
      console.error("CANVA: Editor launch failed", err);
      alert("Unable to open Canva. Try again.");
    });
  };

  const handleGenerateAndDesign = async () => {
    const data = await handleGenerateSocial({ 
      intention: socialContent || 'Generic engagement post', 
      cta: 'Check it out now' 
    });
    if (data) {
       setSocialContent(data.baseCaption);
       setPlatformVariants(data.platformVariants);
       handleCanvaDesign();
    }
  };


  const { data: summaryData, loading: summaryLoading, error: summaryError } = useApi(activeBrand?.id ? "/api/customer/dashboard/summary" : null, [activeBrand?.id]);
  const { data: campaignsApiData } = useApi(activeBrand?.id ? "/api/customer/campaigns" : null, [activeBrand?.id]);
  const campaignsList = campaignsApiData?.data || [];
  const [campaignStep, setCampaignStep] = useState(1);
  const [campaignData, setCampaignData] = useState({
    name: '',
    objective: '',
    startDate: '',
    endDate: '',
    platforms: [],
    contentTypes: [],
    kpis: []
  });

  const handleCreateBrand = async (e) => {
    e.preventDefault();
    setIsCreatingBrand(true);
    try {
      const data = await contextCreateBrand({ name: newBrandName, industry: newBrandIndustry });
      if (data) {
        setShowBrandModal(false);
        setNewBrandName("");
        setNewBrandIndustry("");
      }
    } catch (err) {
      console.error("Failed to create brand", err);
      alert("Failed to create brand: " + (err.message || "Unknown error"));
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const metrics = summaryData?.metrics || { totalContent: 0, scheduledPosts: 0, publishedPosts: 0, engagementRate: "0%" };
  const thisWeek = summaryData?.thisWeek || { scheduled: 0, published: 0 };

  const brandId = activeBrand?.id || null;

  const { data: intelData } = useApi(brandId ? "/api/customer/brand-intelligence" : null, [brandId, listVersion]);
  const _intelRaw = intelData || {};
  const intel = {
    brandHealth: _intelRaw.brandHealth || { score: 0, status: 'critical', summary: 'Loading...' },
    topAlerts: _intelRaw.topAlerts || [],
    recommendedActions: _intelRaw.recommendedActions || []
  };

  const { data: connectionsData } = useApi(brandId ? "/api/customer/integrations" : null, [brandId, listVersion]);
  const connectedPlatforms = (connectionsData?.integrations || []).map(i => i.platform);

  const { data: draftListData, loading: draftsLoading } = useApi(brandId ? "/api/customer/content/social/drafts" : null, [brandId, listVersion]);
  const socialDrafts = draftListData?.data || [];

  const { data: allContentData, loading: allContentLoading } = useApi(brandId ? "/api/customer/content" : null, [brandId, listVersion]);
  const allContent = allContentData?.data || allContentData?.content || [];

  const { data: scheduleListData } = useApi(brandId ? "/api/customer/content/social/scheduled" : null, [brandId, listVersion]);
  const socialSchedules = scheduleListData?.data || [];

  const { data: mediaListData } = useApi(brandId ? "/api/customer/media" : null, [brandId, listVersion]);
  const mediaItems = mediaListData?.data || [];

  const { data: seoData } = useApi(brandId ? "/api/customer/seo/analyze" : null, [brandId, listVersion]);
  const seoProfile = seoData || { metrics: { organicTraffic: '0', keywords: '0', health: '0%' }, keywords: [] };
  const seoMetrics = seoProfile?.metrics || { organicTraffic: '0', keywords: '0', health: '0%' };
  const seoKeywords = seoProfile?.keywords || [];

  const brandIntelligence = generateIntelligence({
    allContent,
    connectedPlatforms,
    seoMetrics,
    metrics,
    growth,
    auditData: null, // hydrated from URL params post-audit signup
    brandDna: { completionPct: 0 }, // TODO: wire to Brand DNA API
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageMedia(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoMedia(url);
    }
  };

  const handleAddBlog = () => {
    const url = window.prompt("Enter Blog/Website URL:");
    if (url) {
      if (!url.startsWith("http")) {
        alert("Please enter a valid URL (starting with http:// or https://)");
        return;
      }
      const title = window.prompt("Enter Article Title (optional):") || "Linked Article";
      setBlogLink({ url, title });
    }
  };

  const handleGenerateHashtags = async () => {
    if (!socialContent) {
      alert("Please enter some content first.");
      return;
    }
    try {
      const data = await apiRequest("/api/customer/ai/hashtags", {
        method: "POST",
        body: JSON.stringify({ text: socialContent, platform: "facebook" })
      });
      if (data.groups) {
        const tags = [...data.groups.trending, ...data.groups.niche];
        setHashtags(tags);
      }
    } catch (err) {
      console.error("Failed to generate hashtags", err);
    }
  };

  const handleMediaSource = (source) => {
    if (source === 'drive' || source === 'dropbox') {
      alert(`Connecting to ${source}... (OAuth popup would appear here)`);
      setTimeout(() => {
        setImageMedia("https://picsum.photos/seed/cloud/800/600");
        alert(`${source} file attached successfully!`);
      }, 1000);
    } else if (source === 'freepik') {
      setActiveTab('freepik');
      handleFreepikSearch();
    }
  };

  const insertHashtag = (tag) => {
    if (!hashtags.includes(tag)) {
       setHashtags(prev => [...prev, tag]);
    }
    setSocialContent(prev => prev + (prev.endsWith(' ') ? '' : ' ') + tag);
  };

  const removeHashtag = (tag) => {
    setHashtags(prev => prev.filter(t => t !== tag));
  };

  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev => {
      const lower = platform.toLowerCase();
      const next = prev.includes(lower) ? prev.filter(p => p !== lower) : [...prev, lower];
      return next;
    });
  };

  const handleGenerateSocial = async (formData) => {
    const USE_FAKE_AI = true;
    setIsGenerating(true);
    
    await new Promise(r => setTimeout(r, 1500));

    if (USE_FAKE_AI) {
      setIsGenerating(false);
      const baseCaption = `🚀 Excited to announce our latest brand update! ${formData.intention} is our top priority. ${formData.cta}! #marketing #growth`;
      return {
        content_id: crypto.randomUUID(),
        baseCaption,
        hashtags: ['#marketing', '#growth', '#brand', '#innovation'],
        platformVariants: {
          facebook: `[Facebook] ${baseCaption}`,
          instagram: `[Instagram] ${baseCaption}`,
          linkedin: `[LinkedIn] ${baseCaption}`,
          x: `[X] ${baseCaption}`,
          youtube: `[YouTube] ${baseCaption}`
        }
      };
    }

    try {
      const res = await apiRequest("/api/customer/ai/generate/social", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          brand_id: activeBrand?.id
        })
      });
      return res;
    } catch (err) {
      console.error("Social generation failed", err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  /* ------------------------------------------------------------------
     SECURITY: ONBOARDING REDIRECT (TASK 1)
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (summaryError?.status === 403 && summaryError?.code === "ONBOARDING_REQUIRED") {
      console.warn("Security: No brand context found. Redirecting to onboarding.");
      navigate("/onboarding");
    }
  }, [summaryError, navigate]);

  const handleAuditFix = (action) => {
    setAuditFixContext(action);
    setIsSocialModalOpen(true);
  };

  const handleGenerateBlog = async (formData) => {
    setIsGenerating(true);
    try {
      const res = await apiRequest("/api/customer/ai/generate/blog", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          brand_id: activeBrand?.id
        })
      });
      return res;
    } catch (err) {
      console.error("Blog generation failed", err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmSocial = (result, editedVariants) => {
    setCurrentContentId(result.content_id);
    setSocialContent(result.baseCaption || "");
    setPlatformVariants(editedVariants || result.platformVariants || {});
    setHashtags(result.hashtags || []);
    setIsSocialModalOpen(false);
  };

  const handleConfirmBlog = (result) => {
    setCurrentContentId(result.content_id);
    setArticleTitle(result.title || "");
    setArticleBody(result.body || "");
    setIsBlogModalOpen(false);
  };

  const handleSaveSocialDraft = async () => {
    if (!activeBrand?.id) {
      alert("No active brand selected.");
      return;
    }
    try {
      const res = await apiRequest("/api/customer/content/social", {
        method: "POST",
        body: JSON.stringify({
          content_id: currentContentId,
          text: socialContent,
          variants: platformVariants,
          hashtags: hashtags,
          media: {
            image: imageMedia,
            video: videoMedia
          },
          blogLink: blogLink,
          status: "draft"
        })
      });
      if (res.content_id) {
        setCurrentContentId(res.content_id);
      }
      setListVersion(v => v + 1);
      alert("Social draft saved successfully!");
    } catch (err) {
      console.error("Failed to save social draft", err);
      alert("Failed to save draft: " + (err.message || "Unknown error"));
    }
  };

  const handleSaveBlogDraft = async () => {
    if (!activeBrand?.id) return;
    try {
      await apiRequest("/api/customer/content/blog", {
        method: "POST",
        body: JSON.stringify({
          title: articleTitle,
          body: articleBody,
          content_id: currentContentId
        })
      });
      alert("Blog draft saved successfully!");
    } catch (err) {
      console.error("Failed to save blog draft", err);
      alert("Failed to save blog draft: " + (err.message || "Unknown error"));
    }
  };

  const updateStatus = async (id, status, comment = null) => {
    try {
      await apiRequest(`/api/customer/content/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, comment })
      });
      setListVersion(v => v + 1);
      if (previewDraft?.id === id) setPreviewDraft(prev => ({ ...prev, status }));
      
      const statusLabel = status === 'approval' ? 'Sent for review' : status.toUpperCase();
      alert(`Content status updated to: ${statusLabel}`);
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Status update failed");
    }
  };

  const handlePostSocialNow = async (draft) => {
    if (!connectedPlatforms.length) {
      alert("Please connect at least one social platform in Integrations first.");
      return;
    }
    if (!window.confirm("Publish this post to all connected platforms immediately?")) return;
    
    try {
      await apiRequest(`/api/customer/content/social/${draft.id}/post`, {
        method: "POST"
      });
      setListVersion(v => v + 1);
      alert("Published successfully! 🚀");
    } catch (err) {
      console.error("Post Now failed", err);
      alert("Failed to publish: " + (err.message || "Unknown error"));
    }
  };

  const handleRetry = async (draft) => {
    if (!window.confirm("Retry delivery for failed platforms?")) return;
    try {
      await apiRequest("/api/customer/delivery/retry", {
        method: "POST",
        body: JSON.stringify({ content_id: draft.id })
      });
      setListVersion(v => v + 1);
      alert("Retry triggered!");
    } catch (err) {
      console.error("Retry failed", err);
      alert("Failed to retry: " + (err.message || "Unknown error"));
    }
  };

  const handleReject = async (draft) => {
    const comment = window.prompt('Reason for requesting changes:');
    if (comment !== null) {
      await updateStatus(draft.id, 'draft', comment);
    }
  };

  const handleCreateSchedule = async () => {
    if (!currentContentId) {
      const confirmSave = window.confirm("Save draft before scheduling?");
      if (!confirmSave) return;

      const res = await handleSaveSocialDraft();
      if (!res?.content_id) return;
    }
    setIsSchModalOpen(true);
  };

  const submitSchedule = async () => {
    if (!schDate) {
      alert("Please select a valid date and time.");
      return;
    }
    
    if (selectedPlatforms.length === 0) {
      alert("Please select at least one platform to schedule.");
      return;
    }
    
    setIsSchModalOpen(false);
    try {
      await Promise.all(
        selectedPlatforms.map(platform => 
          apiRequest("/api/customer/schedule", {
            method: "POST",
            body: JSON.stringify({
              content_type: "social",
              content_id: currentContentId,
              platform: platform,
              scheduled_at: new Date(schDate).toISOString()
            })
          })
        )
      );
      setListVersion(v => v + 1);
      alert("Post scheduled successfully!");
    } catch (err) {
      console.error("Failed to schedule", err);
      alert("Failed to schedule: " + (err.message || "Unknown error"));
    }
  };

  const handleUpdateContentStatus = async (id, status) => {
    try {
      await apiRequest(`/api/customer/content/status`, {
        method: "POST",
        body: JSON.stringify({ id, status })
      });
      setListVersion(v => v + 1);
    } catch (err) {
      console.error("Failed to update status", err);
      setListVersion(v => v + 1);
    }
  };

  const handleBulkContentAction = async (action, ids) => {
    const status = action === 'approve' ? 'approved' : 'rejected';
    try {
      await Promise.all(ids.map(id => apiRequest(`/api/customer/content/status`, {
        method: "POST",
        body: JSON.stringify({ id, status })
      })));
      setListVersion(v => v + 1);
    } catch (err) {
      console.error("Bulk action failed", err);
      setListVersion(v => v + 1);
    }
  };

  const handleCreateCampaign = async (formData) => {
    if (!activeBrand?.id) return;
    try {
      await apiRequest("/api/customer/campaigns/create", {
        method: "POST",
        body: JSON.stringify({
          name: formData.campaignName,
          objective_type: formData.objective_type,
          objective_text: formData.objective_text,
          start_date: formData.start_date,
          end_date: formData.end_date
        })
      });
      alert("Campaign launched successfully!");
      setListVersion(v => v + 1);
    } catch (err) {
      alert("Failed to launch campaign: " + (err.message || "Unknown error"));
    }
  };


  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setSelectedCampaignId(null);
    if (tabId === 'content') setContentSubTab('draft-content');
  };


  const handleCreateContent = (campaignId) => {
    setSelectedCampaignId(campaignId);
    setActiveTab('social');
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const success = url.searchParams.get("success");
    const tokenParam = url.searchParams.get("token");
    const errorParam = url.searchParams.get("error");

    if (success) {
      alert(`Successfully connected ${success.charAt(0).toUpperCase() + success.slice(1)}!`);
      url.searchParams.delete("success");
      window.history.replaceState({}, document.title, url.pathname);
      setListVersion(v => v + 1);
    }

    if (tokenParam) {
      setAuthToken(tokenParam);
      url.searchParams.delete("token");
      window.history.replaceState({}, document.title, url.pathname);
    }

    if (errorParam) {
      setLoginError(decodeURIComponent(errorParam));
      url.searchParams.delete("error");
      window.history.replaceState({}, document.title, url.pathname);
    }

    const script = document.createElement("script");
    script.src = "https://sdk.canva.com/designbutton/v2/api.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  if (authLoading || brandLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-pilot mb-3 spinner-lg"></div>
          <h5 className="fw-bold text-muted">Synchronizing Workspace...</h5>
        </div>
      </div>
    );
  }

  if (!token && !DEV_BYPASS) {
    if (isRegistering) {
      return (
        <div className="auth-page-wrapper">
          <div className="signin-page">
            <div className="auth-container">
              <div className="signin-grid">
                <div className="stats-container d-none d-lg-flex">
                  <div className="auth-side-illustration" style={{ background: '#2563eb', borderRadius: '24px', width: '100%', height: '600px', display: 'flex', flexDirection: 'column', padding: '40px', color: 'white' }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', color: '#1a1a1a', marginBottom: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                        <div style={{ width: '32px', height: '32px', background: '#1877F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}><i className="fab fa-facebook-f" style={{ color: 'white', fontSize: '14px' }}></i></div>
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>Followers</span>
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700' }}>1.1K <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '500' }}><i className="fas fa-arrow-up"></i> 1.2%</span></div>
                    </div>

                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', color: '#1a1a1a', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', flex: 1 }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px' }}>Latest Followers</h4>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        {[1,2,3,4,5,6].map(i => (
                          <div key={i} style={{ width: '35px', height: '35px', background: '#f1f5f9', borderRadius: '50%', border: '2px solid white' }}></div>
                        ))}
                      </div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Followers Target</h4>
                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                        <div style={{ width: '90%', height: '100%', background: '#2563eb' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>90% target achieved</span>
                    </div>
                  </div>
                </div>

                <div className="register-container">
                  <div className="auth-logo-brand mb-4">
                    <img src="https://mypilotpost.com/images/myPilotPost-Logo.png" alt="myPilotPost" style={{ height: '40px' }} />
                  </div>
                  <h2 className="auth-title">Get Started</h2>
                  <p className="auth-subtitle">We'll check if you have an account, and help create one if you don't.</p>
                  
                  <form onSubmit={handleRegister}>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">First Name</label>
                        <input type="text" className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="John" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Last Name</label>
                        <input type="text" className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Doe" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Company Name</label>
                      <input type="text" className="form-input" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Acme Inc." />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input type="email" className="form-input" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required placeholder="john@example.com" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input type="password" className="form-input" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required placeholder="••••••••" />
                    </div>
                    <button type="submit" className="btn-auth-primary" disabled={isLoggingIn}>
                      {isLoggingIn ? "Creating Account..." : "Continue"}
                    </button>
                    
                    <div className="divider"><span>Or continue with</span></div>
                    
                    <button type="button" className="btn-auth-google" onClick={() => handleSocialAuth('google')}>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px' }} />
                      Sign in using Google
                    </button>
                    
                    <p className="auth-footer-link">
                      Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>Sign in now</a>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="auth-page-wrapper">
        <div className="signin-page">
          <div className="auth-container">
            <div className="signin-grid">
              <div className="stats-container d-none d-lg-flex">
                <div className="auth-side-illustration" style={{ background: '#2563eb', borderRadius: '24px', width: '100%', height: '600px', display: 'flex', flexDirection: 'column', padding: '40px', color: 'white' }}>
                  <div style={{ background: 'white', borderRadius: '12px', padding: '20px', color: '#1a1a1a', marginBottom: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                      <div style={{ width: '32px', height: '32px', background: '#1877F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fab fa-facebook-f" style={{ color: 'white', fontSize: '14px' }}></i></div>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>Followers</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>1.1K <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '500' }}><i className="fas fa-arrow-up"></i> 1.2%</span></div>
                  </div>

                  <div style={{ background: 'white', borderRadius: '12px', padding: '20px', color: '#1a1a1a', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', flex: 1 }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px' }}>Latest Followers</h4>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                      {[1,2,3,4,5,6].map(i => (
                        <div key={i} style={{ width: '35px', height: '35px', background: '#f1f5f9', borderRadius: '50%', border: '2px solid white' }}></div>
                      ))}
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Followers Target</h4>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                      <div style={{ width: '90%', height: '100%', background: '#2563eb' }}></div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>90% target achieved</span>
                  </div>
                </div>
              </div>

              <div className="signin-container">
                <div className="auth-logo-brand mb-4">
                  <img src="https://mypilotpost.com/images/myPilotPost-Logo.png" alt="myPilotPost" style={{ height: '40px' }} />
                </div>
                <h2 className="auth-title">Welcome Back</h2>
                <p className="auth-subtitle">Sign in to manage your brand fleet</p>
                
                {loginError && <div className="alert alert-danger mb-4 py-2 small">{loginError}</div>}
                
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-input" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required placeholder="john@example.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label d-flex justify-content-between">
                      Password
                      <span className="text-primary extra-small fw-bold cursor-pointer">Forgot?</span>
                    </label>
                    <input type="password" className="form-input" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required placeholder="••••••••" />
                  </div>
                  <button type="submit" className="btn-auth-primary" disabled={isLoggingIn}>
                    {isLoggingIn ? "Authenticating..." : "Sign In"}
                  </button>
                  
                  <div className="divider"><span>Or continue with</span></div>
                  
                  <button type="button" className="btn-auth-google" onClick={() => handleSocialAuth('google')}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px' }} />
                    Sign in using Google
                  </button>
                  
                  <p className="auth-footer-link">
                    Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate("/register"); }}>Sign up now</a>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeBrand && !onboardingLoading && !DEV_BYPASS) {
    return (
      <OnboardingLayout>
        {step === 1 && <WelcomeStep />}
        {step === 2 && <BrandStep />}
        {step === 3 && <MarketStep />}
        {step === 4 && <GoalsStep />}
        {step === 5 && <PlatformsStep />}
        {step === 6 && <GenerationStep />}
        {step === 7 && <ScheduleStep />}
        {step === 8 && <CompletionStep />}
        {step === 'mode' && <ModeStep />}
        {step === 'import' && <ImportStep />}
        {step === 'activation' && <ActivationStep />}
      </OnboardingLayout>
    );
  }

  return (
    <div id="root">
      <LayoutShell
        activeTab={activeTab}
        switchTab={setActiveTab}
        brands={brands}
        activeBrand={activeBrand}
        onSwitchBrand={switchBrand}
        user={user}
        logout={logout}
        onAssistantOpen={() => setAssistantOpen(true)}
        notifications={notifications}
        growth={growth}
        brandIntelligence={{ executive: intelligence.slice(0, 2), advisory: intelligence.slice(2, 5) }}
        onInsightClick={(insight) => {
          setActiveInsight(insight);
          setIsInsightModalOpen(true);
        }}
        stats={{
          socials: (allContent || []).filter(c => c.type === 'social').length,
          blogs: (allContent || []).filter(c => c.type === 'article').length,
          campaigns: campaignsList.length,
          engagement: metrics.engagementRate || "0%"
        }}
      >
        {/* Dashboard Tab */}
        <TabContent id="dashboard" activeTab={activeTab}>
          <DashboardOverview 
            activeBrand={activeBrand} 
            switchTab={setActiveTab} 
            user={user} 
            growth={growth}
            brandIntelligence={brandIntelligence}
            allContent={allContent}
            connectedPlatforms={connectedPlatforms}
            onInsightClick={(insight) => {
              setActiveInsight(insight);
              setIsInsightModalOpen(true);
            }}
          />
        </TabContent>

        <TabContent id="social" activeTab={activeTab}>
          <CreatePost 
            selectedCampaignId={selectedCampaignId} 
            setSelectedCampaignId={setSelectedCampaignId}
            switchTab={setActiveTab}
          />
        </TabContent>

        {/* Blog Tab */}
        <TabContent id="blog" activeTab={activeTab}>
          <ArticleComposer onOpenAssistant={() => setAssistantOpen(true)} />
        </TabContent>

        {/* Campaigns Tab */}
        <TabContent id="campaign" activeTab={activeTab}>
          <Campaigns 
            activeBrand={activeBrand}
            onCreateCampaign={() => setIsCampaignModalOpen(true)} 
            onCreateContent={handleCreateContent}
          />
        </TabContent>

        {/* Analytics Tab */}
        <TabContent id="analytics" activeTab={activeTab}>
          <Analytics activeBrand={activeBrand} />
        </TabContent>

        {/* SEO Tab */}
        <TabContent id="seo" activeTab={activeTab}>
          <SEOCentre activeBrand={activeBrand} />
        </TabContent>
        <TabContent id="teams" activeTab={activeTab}>
          <Teams brandId={activeBrand?.id} />
        </TabContent>
        <TabContent id="growth" activeTab={activeTab}>
          <Growth brandId={activeBrand?.id} />
        </TabContent>

        <TabContent id="reporting" activeTab={activeTab}>
          <Reporting activeBrand={activeBrand} />
        </TabContent>

        {/* Insights Tab */}
        <TabContent id="insights" activeTab={activeTab}>
          <DashboardInsights activeBrand={activeBrand} />
        </TabContent>

        {/* Content Opportunities Tab */}
        <TabContent id="content-opportunities" activeTab={activeTab}>
          <ContentOpportunities activeBrand={activeBrand} switchTab={setActiveTab} />
        </TabContent>

        {/* Brand DNA Tab */}
        <TabContent id="brand-dna" activeTab={activeTab}>
          <BrandDNA activeBrand={activeBrand} />
        </TabContent>

        {/* Canva Tab */}
        <TabContent id="canva" activeTab={activeTab}>
          <CanvaTab />
        </TabContent>

        {/* Media Library Tab */}
        <TabContent id="media" activeTab={activeTab}>
          <MediaLibrary 
            brandId={activeBrand?.id}
            onSelectAsset={(asset) => {
              setSelectedAsset(asset);
              setActiveTab('social');
            }} 
          />
        </TabContent>

        {/* Integrations Tab */}
        <TabContent id="integrations" activeTab={activeTab}>
          <Integrations />
        </TabContent>

        {/* PROTECTED: Content Management Tab */}
        <TabContent id="content" activeTab={activeTab}>
          <ContentManagement 
            allContent={allContent}
            onUpdateStatus={handleUpdateContentStatus}
            onBulkAction={handleBulkContentAction}
          />
        </TabContent>

        {/* Schedule Tab */}
        <TabContent id="schedule" activeTab={activeTab}>
          <CalendarSchedule
            activeBrand={activeBrand}
            onScheduleNew={() => setActiveTab('social')}
            onJobClick={(job) => setPreviewDraft(job)}
            listVersion={listVersion}
          />
        </TabContent>

        {/* Settings Tab */}
        <TabContent id="settings" activeTab={activeTab}>
          <Settings />
        </TabContent>

        {/* Billing Tab (Visual Only) */}
        <TabContent id="billing" activeTab={activeTab}>
          <BillingTab />
        </TabContent>

        {/* Notifications Tab (Visual Only) */}
        <TabContent id="notifications" activeTab={activeTab}>
          <NotificationsTab />
        </TabContent>
      </LayoutShell>

      <AssistantModal 
        isOpen={assistantOpen} 
        onClose={() => setAssistantOpen(false)} 
        brandName={activeBrand?.name}
      />

      <BrandDNAWizardModal isOpen={isDNAWizardOpen} onClose={() => setIsDNAWizardOpen(false)} />

      <CampaignBuilderModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        onConfirm={handleCreateCampaign}
      />

      {/* Persistence Modals */}
      <ContentPreviewModal
        isOpen={!!previewDraft}
        draft={previewDraft}
        brand={activeBrand}
        onClose={() => setPreviewDraft(null)}
        onApprove={(id) => updateStatus(id, 'approved')}
        onRequestChanges={(id, comment) => updateStatus(id, 'draft', comment)}
      />

      <InsightModal
        isOpen={isInsightModalOpen}
        onClose={() => setIsInsightModalOpen(false)}
        insight={activeInsight}
        onAction={(tab) => switchTab(tab)}
      />

    </div>
  );
}

export default App;
