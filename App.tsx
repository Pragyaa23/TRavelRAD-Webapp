
import React, { useState, useEffect, useRef } from 'react';
import { TripPreferences, ItineraryResponse, TravelMode, TravellerType } from './types';
import { generateTripItinerary } from './services/geminiService';

const INTEREST_OPTIONS = [
  { name: 'Nature', icon: 'eco' },
  { name: 'Culture', icon: 'museum' },
  { name: 'Foodie', icon: 'restaurant' },
  { name: 'Romance', icon: 'favorite' },
  { name: 'Nightlife', icon: 'nightlife' },
  { name: 'Adventure', icon: 'hiking' },
  { name: 'Relaxation', icon: 'spa' },
];

const BUDGET_OPTIONS = [
  { label: '₹20,000 – ₹40,000', value: '₹20,000 – ₹40,000' },
  { label: '₹40,001 – ₹70,000', value: '₹40,001 – ₹70,000' },
  { label: '₹70,001 – ₹1,00,000', value: '₹70,001 – ₹1,00,000' },
  { label: '₹1,00,001 – ₹1,50,000', value: '₹1,00,001 – ₹1,50,000' },
  { label: '₹1,50,001 – ₹2,00,000', value: '₹1,50,001 – ₹2,00,000' },
  { label: 'I am flexible', value: 'Flexible' },
];

const GROUP_SIZE_OPTIONS = ['3', '4', '5', '6', '7', '8', '9', '10', '10+'];

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 
  'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 
  'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 
  'Varanasi', 'Srinagar', 'Gurgaon', 'Manali', 'Goa', 'Udaipur', 'Kochi'
];

const Logo = ({ className = "", vertical = false }: { className?: string, vertical?: boolean }) => {
  return (
    <div className={`flex ${vertical ? 'flex-col' : 'items-center'} gap-3 ${className}`}>
      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
        {/* Concentric circles based on image */}
        <div className="absolute inset-0 border border-coral/40 rounded-full"></div>
        <div className="absolute inset-1 border border-coral/30 rounded-full scale-110 rotate-12"></div>
        <div className="absolute inset-2 border border-coral/20 rounded-full scale-125 -rotate-12"></div>
        <span className="material-symbols-outlined text-charcoal text-2xl z-10">public</span>
      </div>
      <span className="font-bold text-2xl tracking-tight text-charcoal">TravelRAD</span>
    </div>
  );
};

const LoadingScreen = () => {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = [
    "Analyzing your preferences...",
    "Scanning destinations for gems...",
    "Optimizing travel routes...",
    "Curating local experiences...",
    "Finalizing your RAD itinerary..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-off-white flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="mb-12 animate-bounce transition-all duration-1000">
        <Logo vertical />
      </div>
      <div className="text-center h-24 max-w-xs">
        <h2 className="text-2xl font-bold text-charcoal tracking-tight mb-2">TravelRAD is thinking</h2>
        <div className="h-10 overflow-hidden">
          <p key={msgIdx} className="text-muted-grey font-medium italic animate-in slide-in-from-bottom-2 fade-in duration-500">
            {messages[msgIdx]}
          </p>
        </div>
      </div>
      <div className="mt-8 w-64 h-[2px] bg-warm-grey rounded-full overflow-hidden">
        <div className="h-full bg-primary-blue loading-shimmer w-full"></div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'landing' | 'results'>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  
  const [prefs, setPrefs] = useState<TripPreferences>({
    fullName: '',
    email: '',
    origin: '',
    destination: '',
    startDate: '',
    endDate: '',
    travelMode: 'Flight',
    returnTransport: false,
    budget: '',
    travellerType: '' as any,
    groupSize: '',
    interests: [],
    pace: 2
  });

  const [citySuggestions, setCitySuggestions] = useState<{field: 'origin' | 'destination', list: string[]} | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setCitySuggestions(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateEmail = (email: string) => {
    return String(email).toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  };

  const isEmailValid = prefs.email === '' || validateEmail(prefs.email);

  const handleCityInput = (field: 'origin' | 'destination', value: string) => {
    setPrefs({ ...prefs, [field]: value });
    if (value.length > 0) {
      const filtered = INDIAN_CITIES.filter(c => c.toLowerCase().startsWith(value.toLowerCase())).slice(0, 5);
      setCitySuggestions({ field, list: filtered });
    } else {
      setCitySuggestions(null);
    }
  };

  const selectCity = (city: string) => {
    if (citySuggestions) {
      setPrefs({ ...prefs, [citySuggestions.field]: city });
      setCitySuggestions(null);
    }
  };

  const toggleInterest = (interest: string) => {
    setPrefs(prev => ({
      ...prev,
      interests: prev.interests.includes(interest) 
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const getTravelModeIcon = (mode: TravelMode) => {
    switch (mode) {
      case 'Flight': return 'flight';
      case 'Train': return 'train';
      case 'Bus': return 'directions_bus';
      default: return 'flight';
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setEmailTouched(true);
    
    if (!prefs.fullName.trim()) return setError("Full Name is mandatory.");
    if (!prefs.email.trim()) return setError("Email Address is mandatory.");
    if (!validateEmail(prefs.email)) return setError("Please provide a valid email address format.");
    if (!prefs.origin.trim()) return setError("Origin city is mandatory.");
    if (!prefs.destination.trim()) return setError("Destination city is mandatory.");
    if (!prefs.startDate) return setError("Start Date is mandatory.");
    if (!prefs.endDate) return setError("End Date is mandatory.");
    if (!prefs.travelMode) return setError("Travel Mode is mandatory.");
    if (!prefs.budget) return setError("Total Budget selection is mandatory.");
    if (!prefs.travellerType) return setError("Traveller Type is mandatory.");
    
    if (prefs.travellerType === 'group' && !prefs.groupSize) {
      return setError("Please specify the number of travellers for your group.");
    }

    if (prefs.interests.length === 0) return setError("Please select at least one interest.");
    if (!termsAgreed) return setError("You must agree to the processing terms.");

    setLoading(true);
    try {
      const result = await generateTripItinerary(prefs);
      setItinerary(result);
      setView('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || "Failed to generate itinerary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-off-white/80 backdrop-blur-md z-50 border-b border-warm-grey px-6 py-4 flex items-center justify-between no-print">
        <div className="cursor-pointer" onClick={() => setView('landing')}>
          <Logo />
        </div>
        <button className="w-10 h-10 rounded-full bg-white border border-warm-grey flex items-center justify-center hover:bg-primary-blue hover:text-white transition-all">
          <span className="material-symbols-outlined text-charcoal hover:text-inherit">account_circle</span>
        </button>
      </nav>

      {view === 'landing' ? (
        <main className="flex-1">
          {/* Hero */}
          <section className="hero-gradient pt-32 pb-24 px-6 text-center">
            <div className="max-w-3xl mx-auto flex flex-col items-center">
              <div className="inline-block px-4 py-1.5 bg-powder text-primary-blue text-[10px] font-bold rounded-full mb-8 tracking-[0.1em] uppercase border border-primary-blue/10">
                AI Travel Radar
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-charcoal mb-6 leading-[1.1] tracking-tight">
                Your Journey,<br />Reimagined.
              </h1>
              <p className="text-muted-grey text-lg md:text-xl mb-10 max-w-lg mx-auto font-medium opacity-80">
                Plan, optimize, and book your next adventure with AI precision.
              </p>
              <button 
                onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="cta-button px-12 py-5 rounded-xl text-lg shadow-accent-glow"
              >
                RAD my Trip
              </button>
            </div>
          </section>

          {/* Features */}
          <section className="py-24 px-6 bg-mint/30 border-y border-warm-grey">
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-[10px] font-bold text-muted-grey tracking-[0.2em] uppercase">The TravelRAD Way</span>
                <h2 className="text-4xl font-bold text-charcoal mt-2 tracking-tight">Plan Smarter</h2>
              </div>
              
              <div className="space-y-12">
                {[
                  { title: "Enter Details", desc: "Input your destination and travel style.", icon: "edit_note" },
                  { title: "AI Radar Search", desc: "Our engine scans thousands of data points.", icon: "radar" },
                  { title: "Review & Book", desc: "Approve your custom itinerary instantly.", icon: "verified" }
                ].map((step, i) => (
                  <div key={i} className="flex gap-8 items-start relative group">
                    {i < 2 && <div className="absolute left-7 top-14 w-[2px] h-12 bg-coral/20 group-hover:bg-primary-blue/20 transition-colors"></div>}
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shrink-0 border border-warm-grey group-hover:border-primary-blue group-hover:bg-primary-blue group-hover:scale-110 group-hover:shadow-primary-glow transition-all duration-300">
                      <span className="material-symbols-outlined text-charcoal text-2xl group-hover:text-white transition-colors">{step.icon}</span>
                    </div>
                    <div className="pt-2">
                      <h3 className="font-bold text-xl text-charcoal mb-1 group-hover:text-primary-blue transition-colors">{step.title}</h3>
                      <p className="text-muted-grey text-base font-medium opacity-70">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Form */}
          <section ref={formRef} className="py-24 px-6 bg-sand">
            <div className="max-w-2xl mx-auto">
              <div className="mb-12">
                <h2 className="text-4xl font-bold text-charcoal mb-3 tracking-tight">Start Planning</h2>
                <p className="text-muted-grey font-medium text-base opacity-60">Complete the RAD radar with your travel preferences.</p>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 md:p-14 shadow-sm space-y-10 border border-warm-grey/50">
                {error && (
                  <div className="p-5 bg-blush text-charcoal rounded-2xl text-sm font-bold border border-coral/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                    <span className="material-symbols-outlined text-primary-blue">error</span>
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold mb-3 text-charcoal/80">Full Name <span className="text-primary-blue">*</span></label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-hint">person</span>
                    <input 
                      type="text" 
                      placeholder="Enter your name"
                      className="w-full pl-14 pr-4 py-5 rounded-2xl bg-warm-grey/30 border border-warm-grey focus:ring-4 focus:ring-primary-blue/5 focus:border-primary-blue transition-all font-medium placeholder:text-hint"
                      value={prefs.fullName}
                      onChange={e => setPrefs({...prefs, fullName: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3 text-charcoal/80">Email Address <span className="text-primary-blue">*</span></label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-hint">mail</span>
                    <input 
                      type="email" 
                      placeholder="your@email.com"
                      required
                      className={`w-full pl-14 pr-4 py-5 rounded-2xl bg-warm-grey/30 border transition-all font-medium placeholder:text-hint focus:ring-4 ${emailTouched && !isEmailValid ? 'border-coral ring-coral/5 focus:border-coral' : 'border-warm-grey focus:ring-primary-blue/5 focus:border-primary-blue'}`}
                      value={prefs.email}
                      onBlur={() => setEmailTouched(true)}
                      onChange={e => setPrefs({...prefs, email: e.target.value})}
                    />
                    {emailTouched && !isEmailValid && (
                      <p className="mt-2 text-xs text-charcoal/60 font-medium px-2 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        Please enter a valid email format (e.g., name@domain.com)
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="relative">
                    <label className="block text-sm font-bold mb-3 text-charcoal/80">Origin <span className="text-primary-blue">*</span></label>
                    <input 
                      type="text" 
                      placeholder="Manali"
                      className="w-full px-6 py-5 rounded-2xl bg-warm-grey/30 border border-warm-grey focus:ring-4 focus:ring-primary-blue/5 focus:border-primary-blue transition-all font-medium placeholder:text-hint"
                      value={prefs.origin}
                      onChange={e => handleCityInput('origin', e.target.value)}
                    />
                    {citySuggestions?.field === 'origin' && citySuggestions.list.length > 0 && (
                      <div ref={suggestionRef} className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-warm-grey rounded-2xl shadow-2xl overflow-hidden">
                        {citySuggestions.list.map(city => (
                          <button key={city} onClick={() => selectCity(city)} className="w-full text-left px-6 py-4 hover:bg-primary-blue hover:text-white text-charcoal font-medium border-b last:border-0 border-warm-grey text-sm transition-colors">{city}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-bold mb-3 text-charcoal/80">Destination <span className="text-primary-blue">*</span></label>
                    <input 
                      type="text" 
                      placeholder="Delhi"
                      className="w-full px-6 py-5 rounded-2xl bg-warm-grey/30 border border-warm-grey focus:ring-4 focus:ring-primary-blue/5 focus:border-primary-blue transition-all font-medium placeholder:text-hint"
                      value={prefs.destination}
                      onChange={e => handleCityInput('destination', e.target.value)}
                    />
                    {citySuggestions?.field === 'destination' && citySuggestions.list.length > 0 && (
                      <div ref={suggestionRef} className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-warm-grey rounded-2xl shadow-2xl overflow-hidden">
                        {citySuggestions.list.map(city => (
                          <button key={city} onClick={() => selectCity(city)} className="w-full text-left px-6 py-4 hover:bg-primary-blue hover:text-white text-charcoal font-medium border-b last:border-0 border-warm-grey text-sm transition-colors">{city}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-bold mb-3 text-charcoal/80">Start Date <span className="text-primary-blue">*</span></label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-hint pointer-events-none">calendar_today</span>
                      <input 
                        type="date" 
                        min={today}
                        className="w-full pl-14 pr-4 py-5 rounded-2xl bg-warm-grey/30 border border-warm-grey focus:ring-4 focus:ring-primary-blue/5 focus:border-primary-blue transition-all font-medium"
                        value={prefs.startDate}
                        onChange={e => setPrefs({...prefs, startDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-3 text-charcoal/80">End Date <span className="text-primary-blue">*</span></label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-hint pointer-events-none">event</span>
                      <input 
                        type="date" 
                        min={prefs.startDate || today}
                        className="w-full pl-14 pr-4 py-5 rounded-2xl bg-warm-grey/30 border border-warm-grey focus:ring-4 focus:ring-primary-blue/5 focus:border-primary-blue transition-all font-medium"
                        value={prefs.endDate}
                        onChange={e => setPrefs({...prefs, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3 text-charcoal/80">Travel Mode <span className="text-primary-blue">*</span></label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-hint">
                      {getTravelModeIcon(prefs.travelMode)}
                    </span>
                    <select 
                      className="w-full pl-14 pr-12 py-5 rounded-2xl bg-warm-grey/30 border border-warm-grey focus:ring-4 focus:ring-primary-blue/5 focus:border-primary-blue appearance-none font-medium text-charcoal"
                      value={prefs.travelMode}
                      onChange={e => setPrefs({...prefs, travelMode: e.target.value as TravelMode})}
                    >
                      <option value="Flight">Flight</option>
                      <option value="Train">Train</option>
                      <option value="Bus">Bus</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-hint pointer-events-none">expand_more</span>
                  </div>
                </div>

                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${prefs.returnTransport ? 'bg-primary-blue border-primary-blue' : 'bg-white border-warm-grey group-hover:border-primary-blue'}`}>
                    {prefs.returnTransport && <span className="material-symbols-outlined text-white text-base">check</span>}
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={prefs.returnTransport}
                      onChange={() => setPrefs({...prefs, returnTransport: !prefs.returnTransport})}
                    />
                  </div>
                  <span className="text-sm font-semibold text-muted-grey group-hover:text-primary-blue transition-colors">I will need return transportation as well</span>
                </label>

                <div>
                  <label className="block text-sm font-bold mb-3 text-charcoal/80">Total Budget (INR) <span className="text-primary-blue">*</span></label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-hint">payments</span>
                    <select 
                      className="w-full pl-14 pr-12 py-5 rounded-2xl bg-warm-grey/30 border border-warm-grey focus:ring-4 focus:ring-primary-blue/5 focus:border-primary-blue appearance-none font-medium"
                      value={prefs.budget}
                      onChange={e => setPrefs({...prefs, budget: e.target.value})}
                    >
                      <option value="">Select range</option>
                      {BUDGET_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-hint pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-1 gap-8">
                  <div>
                    <label className="block text-sm font-bold mb-3 text-charcoal/80">Traveller Type <span className="text-primary-blue">*</span></label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-hint">groups</span>
                      <select 
                        className="w-full pl-14 pr-12 py-5 rounded-2xl bg-warm-grey/30 border border-warm-grey focus:ring-4 focus:ring-primary-blue/5 focus:border-primary-blue appearance-none font-medium"
                        value={prefs.travellerType}
                        onChange={e => setPrefs({...prefs, travellerType: e.target.value as TravellerType, groupSize: ''})}
                      >
                        <option value="">Select Type</option>
                        <option value="solo">Solo</option>
                        <option value="couple">Couple</option>
                        <option value="group">Group</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-hint pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  {prefs.travellerType === 'group' && (
                    <div className="animate-in slide-in-from-top-4 fade-in duration-500">
                      <label className="block text-sm font-bold mb-3 text-charcoal/80">Number of Travellers <span className="text-primary-blue">*</span></label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-hint">diversity_3</span>
                        <select 
                          className="w-full pl-14 pr-12 py-5 rounded-2xl bg-warm-grey/30 border border-warm-grey focus:ring-4 focus:ring-primary-blue/5 focus:border-primary-blue appearance-none font-medium"
                          value={prefs.groupSize}
                          onChange={e => setPrefs({...prefs, groupSize: e.target.value})}
                        >
                          <option value="">Select count</option>
                          {GROUP_SIZE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-hint pointer-events-none">expand_more</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold mb-5 text-charcoal/80">Interests <span className="text-primary-blue">*</span></label>
                  <div className="flex flex-wrap gap-3">
                    {INTEREST_OPTIONS.map(interest => (
                      <button
                        key={interest.name}
                        onClick={() => toggleInterest(interest.name)}
                        className={`px-7 py-3 rounded-2xl text-[13px] font-bold transition-all border ${prefs.interests.includes(interest.name) ? 'bg-primary-blue border-primary-blue text-white shadow-lg' : 'bg-warm-grey/50 border-warm-grey text-charcoal hover:bg-primary-blue hover:text-white'}`}
                      >
                        {interest.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-8 text-charcoal/80">Pace</label>
                  <div className="relative px-2">
                    <input 
                      type="range" 
                      min="1" max="3" step="1" 
                      className="w-full"
                      value={prefs.pace}
                      onChange={e => setPrefs({...prefs, pace: parseInt(e.target.value)})}
                    />
                    <div className="flex justify-between mt-6 text-[10px] font-bold text-hint uppercase tracking-[0.2em]">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${prefs.pace >= 1 ? 'bg-primary-blue' : 'bg-warm-grey'}`}></div>
                        <span>Slow</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${prefs.pace >= 2 ? 'bg-primary-blue' : 'bg-warm-grey'}`}></div>
                        <span>Moderate</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${prefs.pace >= 3 ? 'bg-primary-blue' : 'bg-warm-grey'}`}></div>
                        <span>Fast</span>
                      </div>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-5 cursor-pointer group mt-16">
                   <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${termsAgreed ? 'bg-primary-blue border-primary-blue' : 'bg-white border-warm-grey group-hover:border-primary-blue'}`}>
                    {termsAgreed && <span className="material-symbols-outlined text-white text-lg">check</span>}
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={termsAgreed}
                      onChange={() => setTermsAgreed(!termsAgreed)}
                    />
                  </div>
                  <span className="text-[12px] font-medium text-muted-grey leading-relaxed group-hover:text-primary-blue transition-colors">
                    I agree to allow TravelRAD to process my data to generate high-precision, AI-optimized travel itineraries based on my profile.
                  </span>
                </label>

                <button 
                  onClick={handleSubmit}
                  className="cta-button w-full py-6 rounded-2xl text-xl shadow-accent-glow flex items-center justify-center gap-4"
                >
                  <span className="material-symbols-outlined text-2xl font-bold">auto_awesome</span>
                  RAD my Trip
                </button>
              </div>

              {/* Form Footer */}
              <div className="mt-32 text-center pb-12">
                <p className="text-[11px] font-bold text-hint uppercase tracking-[0.4em] mb-6">© 2024 TRAVELRAD. PRECISION AI PLANNING.</p>
                <div className="flex justify-center gap-10 text-[11px] font-bold text-muted-grey uppercase tracking-[0.2em]">
                  <button className="hover:text-primary-blue transition-colors">Privacy</button>
                  <button className="hover:text-primary-blue transition-colors">Terms</button>
                  <button className="hover:text-primary-blue transition-colors">Support</button>
                </div>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-8 duration-1000 bg-powder/20">
          {itinerary && (
            <div className="max-w-6xl mx-auto px-6 pt-32 pb-24">
              {/* Navigation Bar */}
              <div className="mb-12 flex flex-wrap items-center justify-between gap-6 no-print">
                <button 
                  onClick={() => setView('landing')}
                  className="group flex items-center gap-3 text-charcoal font-bold text-sm bg-white border border-warm-grey px-6 py-3 rounded-xl shadow-sm hover:bg-primary-blue hover:text-white transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">west</span>
                  Back to Radar
                </button>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-3 bg-white text-charcoal font-bold text-sm px-8 py-3 rounded-xl shadow-md border border-warm-grey hover:bg-primary-blue hover:text-white transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined">print</span>
                    Export PDF
                  </button>
                  <button className="cta-button flex items-center gap-3 font-bold text-sm px-8 py-3 rounded-xl shadow-accent-glow">
                    <span className="material-symbols-outlined">share</span>
                    Share Trip
                  </button>
                </div>
              </div>

              {/* Result Header - Blueprint Style */}
              <div className="bg-white rounded-[3rem] p-10 md:p-16 text-charcoal shadow-2xl shadow-charcoal/5 border border-warm-grey relative overflow-hidden mb-20">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-blue/5 rounded-full -mr-72 -mt-72 blur-[100px] opacity-30"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-coral/20 border border-coral text-charcoal">
                       <span className="material-symbols-outlined font-bold">rocket_launch</span>
                    </span>
                    <span className="text-[12px] uppercase font-bold tracking-[0.3em] text-muted-grey">AI Itinerary Locked</span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-bold mb-10 tracking-tight leading-[1.05] max-w-4xl">{itinerary.tripTitle}</h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-12 border-t border-warm-grey pt-10">
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-muted-grey">Primary Hub</div>
                      <div className="font-bold text-2xl tracking-tight">{itinerary.destination}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-muted-grey">Est. Budget</div>
                      <div className="font-bold text-2xl tracking-tight">{itinerary.totalEstimatedCost}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-muted-grey">Travellers</div>
                      <div className="font-bold text-2xl tracking-tight capitalize">
                        {prefs.travellerType} {prefs.travellerType === 'group' && `(${prefs.groupSize})`}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-muted-grey">Verification</div>
                      <div className="flex items-center gap-2 font-bold text-2xl tracking-tight text-primary-blue">
                        <span className="material-symbols-outlined text-2xl">verified</span>
                        Verified
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Roadmap */}
              <div className="space-y-24 relative pb-20">
                <div className="absolute left-[31px] md:left-[39px] top-10 bottom-10 w-[2px] bg-coral/10 hidden md:block"></div>

                {itinerary.itinerary.map((day, dIdx) => (
                  <div key={dIdx} className="relative">
                    <div className="flex flex-col md:flex-row gap-12">
                      <div className="md:w-20 shrink-0 z-10 flex md:block items-center gap-6">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-charcoal text-white rounded-[1.75rem] flex flex-col items-center justify-center shadow-xl">
                          <span className="text-[10px] uppercase font-bold opacity-40 mb-1">Day</span>
                          <span className="text-3xl font-bold leading-none">{day.day}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-charcoal md:hidden flex-1">{day.title}</h3>
                      </div>

                      <div className="flex-1">
                        <h3 className="hidden md:block text-4xl font-bold text-charcoal tracking-tight mb-10">{day.title}</h3>
                        <div className="space-y-8">
                          {day.activities.map((act, aIdx) => (
                            <div key={aIdx} className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-warm-grey shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-10">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-4 mb-6">
                                    <span className="px-4 py-1.5 bg-soft-sky text-primary-blue text-[11px] font-bold rounded-xl uppercase tracking-widest border border-primary-blue/5">
                                      {act.time}
                                    </span>
                                    <div className="flex items-center gap-2 text-muted-grey text-[13px] font-bold uppercase tracking-wider bg-sand px-4 py-1.5 rounded-lg border border-warm-grey/50">
                                      <span className="material-symbols-outlined text-base">explore</span>
                                      {act.location}
                                    </div>
                                  </div>
                                  <h4 className="text-2xl font-bold text-charcoal mb-4 tracking-tight">{act.activity}</h4>
                                  <p className="text-muted-grey text-base leading-relaxed mb-6 font-medium opacity-80">{act.description}</p>
                                </div>
                                {act.estimatedCost && (
                                  <div className="shrink-0 bg-coral/10 border border-coral/20 px-6 py-4 rounded-2xl text-charcoal shadow-sm">
                                    <div className="text-[10px] uppercase font-bold text-muted-grey/50 mb-1">Activity Cost</div>
                                    <div className="font-bold text-base tracking-tight">{act.estimatedCost}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Section - Tips */}
              <div className="mt-32 p-12 md:p-20 bg-charcoal rounded-[3.5rem] text-white shadow-2xl shadow-charcoal/20 relative overflow-hidden no-print">
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-blue/20 rounded-full -mr-48 -mb-48 blur-[100px]"></div>
                <div className="relative z-10">
                  <h3 className="text-4xl font-bold mb-12 tracking-tight flex items-center gap-5">
                    <span className="material-symbols-outlined text-coral text-5xl">auto_awesome</span>
                    RAD Smart Recommendations
                  </h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    {itinerary.travelTips.map((tip, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] text-base font-medium leading-relaxed hover:bg-white/10 transition-all flex items-start gap-5">
                        <span className="w-2 h-2 rounded-full bg-coral mt-2 shrink-0"></span>
                        <p className="opacity-90">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Brand Footer */}
              <div className="mt-32 text-center no-print">
                <Logo className="justify-center scale-125 mb-8" />
                <p className="text-[12px] font-bold text-hint uppercase tracking-[0.5em] mb-12">Travel Smarter. Plan with RAD AI.</p>
                <div className="max-w-xs mx-auto flex justify-between text-[11px] font-bold text-primary-blue/40 uppercase tracking-widest">
                  <button className="hover:text-primary-blue transition-all">Support</button>
                  <button className="hover:text-primary-blue transition-all">Legal</button>
                  <button className="hover:text-primary-blue transition-all">Privacy</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
