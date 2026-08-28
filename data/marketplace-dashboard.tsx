import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  PlusCircle, 
  MessageSquare, 
  Bell, 
  User, 
  Menu, 
  X, 
  Heart, 
  Sparkles, 
  SlidersHorizontal, 
  Compass, 
  Camera, 
  Lock, 
  Truck, 
  CheckCircle,
  Briefcase,
  Layers,
  Phone,
  Store
} from 'lucide-react';

// ============================================================================
// TYPES & MOCK DATA (Grounded in our African Hub Seed Data)
// ============================================================================
interface Listing {
  id: number;
  title: string;
  price: number;
  priceType: 'fixed' | 'bidding' | 'free' | 'contact';
  location: string;
  category: string;
  imageUrl: string;
  condition: 'new' | 'used' | 'good_condition';
  isPro: boolean;
  isBoosted: boolean;
}

const mockListings: Listing[] = [
  {
    id: 1,
    title: "Toyota Rav4 2018 (Perfect Condition)",
    price: 18500000, // NGN
    priceType: 'fixed',
    location: "Lagos, Nigeria",
    category: "Cars",
    imageUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=600",
    condition: 'good_condition',
    isPro: true,
    isBoosted: true
  },
  {
    id: 2,
    title: "MacBook Pro M2 16-inch (16GB/512GB)",
    price: 95000, // KES
    priceType: 'bidding',
    location: "Nairobi, Kenya",
    category: "Computers & Software",
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600",
    condition: 'used',
    isPro: false,
    isBoosted: false
  },
  {
    id: 3,
    title: "Solid Mahogany 6-Seater Dining Table",
    price: 450000, // XOF
    priceType: 'fixed',
    location: "Abidjan, Côte d'Ivoire",
    category: "Home & Furniture",
    imageUrl: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&q=80&w=600",
    condition: 'good_condition',
    isPro: true,
    isBoosted: true
  },
  {
    id: 4,
    title: "Vintage Hardcover Novels Selection",
    price: 5000, // XOF
    priceType: 'free',
    location: "Dakar, Senegal",
    category: "Books",
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600",
    condition: 'used',
    isPro: false,
    isBoosted: false
  }
];

const categories = [
  { id: 1, name: "Cars", icon: "🚗", count: "10,000+ daily" },
  { id: 2, name: "Home & Furniture", icon: "🛋️", count: "4,200 ads" },
  { id: 3, name: "Computers & Software", icon: "💻", count: "2,150 ads" },
  { id: 4, name: "Women's Clothing", icon: "👗", count: "8,900 ads" },
  { id: 5, name: "Books", icon: "📚", count: "1,500 ads" },
  { id: 6, name: "DIY & Renovation", icon: "🛠️", count: "920 ads" },
  { id: 7, name: "Services & Trades", icon: "🔧", count: "650 pros" },
  { id: 8, name: "Jobs", icon: "💼", count: "1,100 listings" },
  { id: 9, name: "Real Estate", icon: "🏠", count: "3,400 properties" }
];

// ============================================================================
// MAIN SYSTEM CONTAINER (With Interactive Mobile/Desktop Frame Toggle)
// ============================================================================
export default function MarketplaceDashboard() {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [searchTerm, setSearchTerm] = useState('');
  const [postcode, setPostcode] = useState('');
  const [range, setRange] = useState('15');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Modals & Interactivity States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);

  // AI Listing Helper States
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const toggleFavorite = (id: number) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const handleAiMockListing = () => {
    setIsAiProcessing(true);
    setUploadedImage("https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=600");
    
    setTimeout(() => {
      setIsAiProcessing(false);
      setAiResult({
        title: "Apple iPhone 13 Pro Max - 128GB (Alpine Green)",
        category: "Computers & Software",
        categorySlug: "computers-software",
        condition: "good_condition",
        tags: ["smartphone", "apple", "iphone 13", "alpine green", "unlocked"],
        description: "An authentic, gently used iPhone 13 Pro Max in gorgeous Alpine Green. Fully verified hardware components, battery health at 89%. Zero scratches on screen.",
        suggestedPriceRange: { min: "480,000 XOF", max: "530,000 XOF" }
      });
    }, 1800);
  };

  const filteredListings = mockListings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? listing.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* ============================================================================
          TOP LEVEL METAFRAME CONTROLLER (Allows testing mobile and desktop live)
          ============================================================================ */}
      <div className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center border-b border-slate-800 z-50">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Prototype Viewer: Pan-African Marketplace Engine (SokoCoin / LokoTrade)
          </p>
        </div>
        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
          <button 
            onClick={() => { setViewMode('desktop'); setIsMobileMenuOpen(false); }}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${viewMode === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Desktop View
          </button>
          <button 
            onClick={() => setViewMode('mobile')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${viewMode === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Mobile Responsive View
          </button>
        </div>
      </div>

      {/* ============================================================================
          VIEWPORT RENDERER
          ============================================================================ */}
      <div className={`flex-1 flex justify-center ${viewMode === 'mobile' ? 'bg-slate-200 py-6' : 'bg-slate-50'}`}>
        
        <div className={`w-full flex flex-col bg-white shadow-xl transition-all duration-300 ${
          viewMode === 'mobile' 
            ? 'max-w-[412px] h-[844px] rounded-[40px] border-[12px] border-slate-900 overflow-y-auto relative scrollbar-thin' 
            : 'max-w-7xl min-h-screen'
        }`}>

          {/* ============================================================================
              HEADER NAVIGATION PANEL (Adapts dynamically to mobile viewport)
              ============================================================================ */}
          <header className="sticky top-0 bg-white border-b border-slate-100 z-40 shadow-sm">
            {/* Top Toolbar (Desktop Only) */}
            {viewMode === 'desktop' && (
              <div className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100 py-1.5 px-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <a href="#" className="hover:text-indigo-600 font-medium transition">Help Center</a>
                  <a href="#" className="hover:text-indigo-600 font-medium transition">Safety Center</a>
                  <a href="#" className="hover:text-indigo-600 font-medium transition">Terms of Service</a>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    <CheckCircle size={12} /> Escrow Protection Verified
                  </span>
                  <span className="text-slate-300">|</span>
                  <a href="#" className="hover:text-indigo-600 font-medium transition">Français</a>
                </div>
              </div>
            )}

            {/* Main Header Row */}
            <div className="px-4 py-3 flex justify-between items-center">
              {/* Brand Logo */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-200">
                  S
                </div>
                <div>
                  <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">SokoCoin</h1>
                  <p className="text-[9px] font-bold text-indigo-600 tracking-wider uppercase leading-none mt-1">LokoTrade Hub</p>
                </div>
              </div>

              {/* Utility Nav (Desktop Only) */}
              {viewMode === 'desktop' ? (
                <div className="flex items-center gap-6">
                  <button className="text-slate-500 hover:text-indigo-600 font-medium text-sm flex items-center gap-1.5 transition">
                    <MessageSquare size={18} /> Messages
                  </button>
                  <button className="text-slate-500 hover:text-indigo-600 font-medium text-sm flex items-center gap-1.5 transition relative">
                    <Bell size={18} /> Notifications
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
                  </button>
                  <button className="text-slate-500 hover:text-indigo-600 font-medium text-sm flex items-center gap-1.5 transition">
                    <User size={18} /> My Account
                  </button>
                  <button 
                    onClick={() => setIsAiModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-150 flex items-center gap-2 transition transform active:scale-95"
                  >
                    <PlusCircle size={18} /> Place Free Ad
                  </button>
                </div>
              ) : (
                /* Mobile Navigation Trigger */
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsAiModalOpen(true)}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition"
                    title="AI listing helper"
                  >
                    <Sparkles size={20} />
                  </button>
                  <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Nav Drawer */}
            {isMobileMenuOpen && viewMode === 'mobile' && (
              <div className="absolute top-[61px] left-0 right-0 bg-white border-b border-slate-200 shadow-xl z-50 p-4 flex flex-col gap-3 animate-slideDown">
                <button className="flex items-center gap-3 py-2.5 px-3 hover:bg-slate-50 rounded-xl transition font-medium text-sm">
                  <MessageSquare size={18} className="text-slate-500" /> In-Chat Messages
                </button>
                <button className="flex items-center gap-3 py-2.5 px-3 hover:bg-slate-50 rounded-xl transition font-medium text-sm">
                  <Bell size={18} className="text-slate-500" /> Notifications
                </button>
                <button className="flex items-center gap-3 py-2.5 px-3 hover:bg-slate-50 rounded-xl transition font-medium text-sm">
                  <User size={18} className="text-slate-500" /> My Profile / Ad Wallet
                </button>
                <div className="border-t border-slate-100 pt-3">
                  <button 
                    onClick={() => { setIsMobileMenuOpen(false); setIsAiModalOpen(true); }}
                    className="w-full bg-indigo-600 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    <PlusCircle size={18} /> Place Free Ad
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================================
                CORE SEARCH INTERFACE WITH POSTGIS GEOLOCATION & PROXIMITY FILTERS
                ============================================================================ */}
            <div className="bg-slate-900 text-white p-4">
              <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row gap-2">
                  
                  {/* Keyword search bar */}
                  <div className="flex-1 bg-white rounded-xl flex items-center px-3.5 shadow-md">
                    <Search className="text-slate-400 mr-2" size={18} />
                    <input 
                      type="text" 
                      placeholder="What are you looking for?"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full py-2.5 text-sm text-slate-800 bg-transparent border-none outline-none focus:ring-0 placeholder-slate-400"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Geolocation PostGIS distance search ("Kijk in je Wijk") */}
                  <div className="flex gap-2">
                    <div className="w-32 bg-white rounded-xl flex items-center px-3 shadow-md">
                      <MapPin className="text-slate-400 mr-1.5" size={16} />
                      <input 
                        type="text" 
                        placeholder="Postcode"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                        className="w-full py-2.5 text-sm text-slate-800 bg-transparent border-none outline-none focus:ring-0 placeholder-slate-400"
                      />
                    </div>
                    <div className="bg-white rounded-xl flex items-center px-2.5 shadow-md">
                      <select 
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="bg-transparent border-none outline-none text-slate-700 text-xs font-semibold py-2.5 focus:ring-0 cursor-pointer"
                      >
                        <option value="5">Within 5 km</option>
                        <option value="15">Within 15 km</option>
                        <option value="50">Within 50 km</option>
                        <option value="0">All Distances</option>
                      </select>
                    </div>
                  </div>

                  <button className="bg-indigo-600 hover:bg-indigo-500 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-950 transition transform active:scale-95 text-sm flex items-center justify-center gap-1.5">
                    Search
                  </button>
                </div>

                {/* Desktop Mini Filtering Pills */}
                {viewMode === 'desktop' && (
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-slate-300 font-semibold flex items-center gap-1 mr-2">
                      <SlidersHorizontal size={12} /> Fast Filters:
                    </span>
                    <button 
                      onClick={() => setSelectedCategory(null)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition ${!selectedCategory ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      All Listings
                    </button>
                    {categories.slice(0, 5).map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${selectedCategory === cat.name ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ============================================================================
              HOMEPAGE CONTENT LAYOUT (Three columns on desktop, flat stream on mobile)
              ============================================================================ */}
          <main className="flex-1 p-4 bg-slate-50">
            <div className="max-w-7xl mx-auto flex flex-col gap-6">

              {/* Promo Banner: Integrated smart lock logistics & Budbee-style pricing */}
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-850 rounded-2xl p-4 text-white shadow-lg shadow-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                    <Truck className="text-indigo-300" size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold tracking-tight">Smart Locker Delivery - Live Across Africa!</h4>
                    <p className="text-[11px] text-indigo-200 mt-0.5">Drop at a local secure locker. Payment is escrowed & auto-released upon collection.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAiModalOpen(true)}
                  className="bg-white hover:bg-slate-100 text-indigo-900 font-extrabold text-xs px-4 py-2.5 rounded-xl transition whitespace-nowrap"
                >
                  Post with AI Protection
                </button>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">

                {/* ------------------------------------------------------------------
                    LEFT SIDEBAR: Categories & Trust Highlights (Desktop Only)
                    ------------------------------------------------------------------ */}
                {viewMode === 'desktop' && (
                  <aside className="w-64 shrink-0 flex flex-col gap-4">
                    {/* Trust Pillar Links */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Security & Trust</h3>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Lock size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold">Secure Trade Escrow</p>
                            <p className="text-[10px] text-slate-400 leading-tight">Funds held securely in escrow.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Truck size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold">Locker Integration</p>
                            <p className="text-[10px] text-slate-400 leading-tight">Track physical locker transfers.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Taxonomy Menu */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">All Directories</h3>
                      <div className="flex flex-col gap-1.5">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                            className={`w-full flex items-center justify-between text-left px-2.5 py-2 rounded-xl transition text-xs font-medium ${
                              selectedCategory === cat.name 
                                ? 'bg-indigo-50 text-indigo-600 font-bold' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{cat.icon}</span>
                              <span>{cat.name}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">{cat.count}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>
                )}

                {/* ------------------------------------------------------------------
                    CENTER COLUMN: Active Listings Feed Grid
                    ------------------------------------------------------------------ */}
                <section className="flex-1">
                  
                  {/* Interactive Status Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Compass size={18} className="text-indigo-600" />
                      <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                        {selectedCategory ? `${selectedCategory} Directory` : "Discover Local Goods"}
                      </h2>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      Showing {filteredListings.length} active ads
                    </span>
                  </div>

                  {/* Grid Layout (Adapts beautifully to mobile column sizes) */}
                  <div className={`grid gap-4 ${viewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'}`}>
                    {filteredListings.length > 0 ? (
                      filteredListings.map((listing) => (
                        <article 
                          key={listing.id}
                          className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 relative group flex flex-col"
                        >
                          {/* Image Container with Dynamic Badges */}
                          <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                            <img 
                              src={listing.imageUrl} 
                              alt={listing.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            {/* Escrow Badge */}
                            <span className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1 backdrop-blur-sm bg-opacity-90">
                              <Lock size={10} /> Escrow Protected
                            </span>
                            
                            {/* Pro Seller Tag */}
                            {listing.isPro && (
                              <span className="absolute bottom-2.5 left-2.5 bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                                <Store size={10} /> PRO Seller
                              </span>
                            )}

                            {/* Favorite Button */}
                            <button 
                              onClick={() => toggleFavorite(listing.id)}
                              className="absolute top-2.5 right-2.5 p-1.5 bg-white bg-opacity-80 hover:bg-white rounded-full text-slate-500 hover:text-rose-500 transition shadow-sm"
                            >
                              <Heart size={14} fill={favorites.includes(listing.id) ? "currentColor" : "none"} className={favorites.includes(listing.id) ? "text-rose-500" : ""} />
                            </button>
                          </div>

                          {/* Listing Metadata */}
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                <span>{listing.category}</span>
                                <span className={`px-1.5 py-0.5 rounded ${listing.condition === 'new' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {listing.condition === 'new' ? 'New' : 'Used'}
                                </span>
                              </div>
                              <h3 className="text-xs font-bold text-slate-900 hover:text-indigo-600 line-clamp-2 transition leading-tight mb-2 cursor-pointer">
                                {listing.title}
                              </h3>
                            </div>

                            <div>
                              <div className="flex items-baseline justify-between pt-2 border-t border-slate-50">
                                <div>
                                  {listing.priceType === 'free' ? (
                                    <span className="text-emerald-600 font-extrabold text-xs uppercase tracking-wide">Free</span>
                                  ) : (
                                    <p className="text-xs font-black text-indigo-600">
                                      {listing.price.toLocaleString()} <span className="text-[10px] font-bold">XOF/KES</span>
                                    </p>
                                  )}
                                  <p className="text-[9px] font-bold text-slate-400 tracking-wide mt-0.5">{listing.priceType === 'fixed' ? 'Fixed Price' : 'Open to Bidding'}</p>
                                </div>
                                <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                                  <MapPin size={10} /> {listing.location.split(',')[0]}
                                </span>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center">
                        <p className="text-xs text-slate-400 font-medium">No listings match your search criteria. Try removing filters!</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* ------------------------------------------------------------------
                    RIGHT COLUMN: Promoted Boosted Spotlights (Desktop Only)
                    ------------------------------------------------------------------ */}
                {viewMode === 'desktop' && (
                  <aside className="w-64 shrink-0 flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                      <div className="absolute -top-3 -right-3 w-12 h-12 bg-amber-500/10 rounded-full blur-xl"></div>
                      <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-1">
                        <Sparkles size={14} /> Boost Spotlight ("Opvallen")
                      </h3>
                      
                      <div className="flex flex-col gap-4">
                        <div className="bg-white border border-amber-100 rounded-xl p-2.5 relative">
                          <span className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[8px] font-extrabold px-1 py-0.5 rounded">Spotlight</span>
                          <img 
                            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400" 
                            className="w-full h-20 object-cover rounded-lg mb-2" 
                          />
                          <h4 className="text-[11px] font-bold text-slate-800 leading-tight truncate">Nike Zoom Vaporfly Sneakers (Size 43)</h4>
                          <p className="text-xs font-black text-indigo-600 mt-1">45,000 XOF</p>
                        </div>
                      </div>
                    </div>
                  </aside>
                )}

              </div>
            </div>
          </main>

          {/* ============================================================================
              MOBILE BOTTOM NAVIGATION BAR (Sticky toolbar for real app feeling)
              ============================================================================ */}
          {viewMode === 'mobile' && (
            <footer className="sticky bottom-0 bg-white border-t border-slate-150 z-40 px-4 py-2 flex justify-between items-center text-slate-400">
              <button className="flex flex-col items-center gap-0.5 text-indigo-600">
                <Compass size={18} />
                <span className="text-[9px] font-bold">Browse</span>
              </button>
              <button 
                onClick={() => setIsAiModalOpen(true)}
                className="flex flex-col items-center gap-0.5 hover:text-slate-700"
              >
                <PlusCircle size={18} />
                <span className="text-[9px] font-bold">Sell</span>
              </button>
              <button className="flex flex-col items-center gap-0.5 hover:text-slate-700 relative">
                <MessageSquare size={18} />
                <span className="text-[9px] font-bold">Inbox</span>
                <span className="absolute top-0 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              </button>
              <button className="flex flex-col items-center gap-0.5 hover:text-slate-700">
                <User size={18} />
                <span className="text-[9px] font-bold">My Hub</span>
              </button>
            </footer>
          )}

          {/* ============================================================================
              AI-FIRST ZERO-FRICTION LISTING MODAL
              ============================================================================ */}
          {isAiModalOpen && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleUp max-h-[90%] flex flex-col">
                
                {/* Modal Header */}
                <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-400" size={18} />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider">AI Zero-Friction Ad Helper</h3>
                      <p className="text-[10px] text-indigo-200">Upload one photo to auto-list</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setIsAiModalOpen(false); setAiResult(null); setUploadedImage(null); }}
                    className="p-1 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
                  {!uploadedImage ? (
                    <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                        <Camera size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Tap to Upload Photo of Your Item</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG up to 10MB</p>
                      </div>
                      <button 
                        onClick={handleAiMockListing}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs px-4 py-2 rounded-xl transition mt-1"
                      >
                        Try with Demo Image
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Image Preview */}
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                        <img src={uploadedImage} className="w-full h-full object-cover" />
                        {isAiProcessing && (
                          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                            <Sparkles className="text-amber-400 animate-spin mb-2" size={24} />
                            <p className="text-xs font-bold">AI Analyzing & Copywriting...</p>
                          </div>
                        )}
                      </div>

                      {/* AI Generated Form Results */}
                      {aiResult && (
                        <div className="flex flex-col gap-3 text-xs animate-slideDown">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Suggested Title</label>
                              <p className="font-bold text-slate-900">{aiResult.title}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Category Match</label>
                                <p className="font-semibold text-indigo-600">{aiResult.category}</p>
                              </div>
                              <div>
                                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Assessed Condition</label>
                                <p className="font-semibold text-amber-600 uppercase text-[10px] tracking-wide">{aiResult.condition.replace('_', ' ')}</p>
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Auto AI Description</label>
                              <p className="text-slate-600 text-[11px] leading-relaxed">{aiResult.description}</p>
                            </div>
                            <div className="border-t border-slate-150 pt-2 flex justify-between items-center">
                              <div>
                                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Market Pricing Advice</label>
                                <p className="font-black text-emerald-600 text-[11px]">{aiResult.suggestedPriceRange.min} - {aiResult.suggestedPriceRange.max}</p>
                              </div>
                              <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded">High Sell Rate</span>
                            </div>
                          </div>
                          
                          {/* Tag Chips */}
                          <div className="flex flex-wrap gap-1">
                            {aiResult.tags.map((tag: string, i: number) => (
                              <span key={i} className="bg-indigo-50 text-indigo-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
                  <button 
                    onClick={() => { setIsAiModalOpen(false); setAiResult(null); setUploadedImage(null); }}
                    className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl transition text-xs text-center"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!aiResult}
                    onClick={() => { setIsAiModalOpen(false); alert("Success! Your AI ad has been listed."); }}
                    className={`flex-1 font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1 shadow-lg shadow-indigo-100 ${
                      aiResult 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <CheckCircle size={14} /> Publish Ad Now
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
