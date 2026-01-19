// Header.jsx
import { useState, useEffect } from "react";
import { Menu, X, AlertTriangle } from "lucide-react";
import Logo from "../assets/logo.png";
import api from "../utils/api";

function Header({ onLoginClick, onSignUpClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    checkMaintenanceMode();
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > window.innerHeight * 0.8);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const checkMaintenanceMode = async () => {
    try {
      const response = await api.get('/system/maintenance-status');
      if (response.data.success) {
        setMaintenanceMode(response.data.maintenanceMode);
        setMaintenanceMessage(response.data.maintenanceMessage || "");
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    }
  };

  const openMenu = () => {
    setIsOpen(true);
    setIsAnimating(true);
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsOpen(false);
      document.body.style.overflow = 'unset';
    }, 300);
  };

  const handleLoginClick = () => {
    closeMenu();
    onLoginClick();
  };

  const handleSignUpClick = () => {
    closeMenu();
    onSignUpClick();
  };

  return (
    <>
      {/* Main Header */}
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${isScrolled 
        ? 'bg-gradient-to-b from-black/95 to-gray-900/95 backdrop-blur-xl shadow-2xl border-b border-white/10' 
        : 'bg-transparent shadow-lg backdrop-blur-none'
      }`}>
        <nav className="w-full max-w-8xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Logo + Title - Horizontal Layout */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative group flex items-center">
              <div className="absolute -inset-2 sm:-inset-3 bg-amber-400/10 rounded-full transform scale-0 transition-transform duration-300 group-hover:scale-100"></div>
              <img
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 relative z-10 transition-all duration-300 hover:scale-110 hover:rotate-3"
                src={Logo}
                alt="University of San Agustin Logo"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <h1 className="text-base sm:text-lg md:text-xl font-serif font-semibold text-white tracking-wide leading-tight">
                University of San Agustin
              </h1>
              <span className="hidden sm:block text-white/50 text-sm mx-1">•</span>
              <span className="text-amber-300 text-sm sm:text-base md:text-lg font-medium bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
                CircuLink
              </span>
            </div>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {/* Maintenance Warning */}
            {maintenanceMode && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle size={16} className="text-amber-400" />
                <span className="text-xs text-amber-300 font-medium">Maintenance</span>
              </div>
            )}
            
            <button
              onClick={onLoginClick}
              className="group relative text-sm font-medium px-5 py-2.5 rounded-lg transition-all duration-300
                         overflow-hidden cursor-pointer border border-white/20
                         text-white bg-white/5 hover:bg-white/10 hover:border-white/40 hover:shadow-lg"
              title="Login to your account"
            >
              <span className="relative z-10 flex items-center gap-2">
                Login
                <div className="w-1 h-4 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
            <button
              onClick={onSignUpClick}
              className="group relative text-sm font-medium px-5 py-2.5 rounded-lg transition-all duration-300 transform
                         overflow-hidden cursor-pointer bg-gradient-to-r from-[#CC0000] to-[#FF3333]
                         text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:shadow-red-500/25"
              title="Create new account"
            >
              <span className="relative z-10">Sign Up</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
          </div>

          {/* Mobile Menu Button with Logo */}
          <div className="md:hidden flex items-center gap-2">
            {/* Maintenance Indicator */}
            {maintenanceMode && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle size={14} className="text-amber-400" />
              </div>
            )}
            
            <button
              onClick={openMenu}
              className="flex items-center gap-2 text-white focus:outline-none hover:text-gray-200 p-2 transition-all duration-300 group"
              title="Open menu"
            >
              {/* Mini Logo */}
              <div className="relative">
                <div className="absolute -inset-1 bg-amber-400/10 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <img
                  className="w-6 h-6 relative z-10 rounded-full"
                  src={Logo}
                  alt="Menu Logo"
                />
              </div>
              
              {/* Menu Icon */}
              <div className="relative">
                <div className="absolute -inset-2 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Menu size={20} className="relative z-10" />
              </div>
            </button>
          </div>
        </nav>
      </header>

      {/* Enhanced Mobile Menu with Logo Header */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Overlay */}
          <div 
            className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
              isAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeMenu}
          />
          
          {/* Slide Panel */}
          <div 
            className={`absolute right-0 top-0 h-full w-full max-w-sm bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl transition-transform duration-300 ease-out ${
              isAnimating ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Enhanced Header with Logo */}
            <div className="relative bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute -inset-3 bg-amber-400/10 rounded-full blur-md"></div>
                    <img
                      className="w-10 h-10 relative z-10"
                      src={Logo}
                      alt="University of San Agustin Logo"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      USA CircuLink
                    </h2>
                    <p className="text-amber-400 text-xs font-medium">
                      Library Reservation
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={closeMenu}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all duration-300 group"
                  title="Close menu"
                >
                  <X size={24} className="text-white group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
              
              {/* Maintenance Alert */}
              {maintenanceMode && (
                <div className="mt-4 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-amber-300 text-sm font-semibold">System Maintenance</p>
                      {maintenanceMessage && (
                        <p className="text-amber-400/80 text-xs mt-1">{maintenanceMessage}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Menu Content */}
            <div className="p-6 overflow-y-auto h-[calc(100vh-140px)]">
              <div className="space-y-6">
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-white/5 to-transparent p-4 rounded-xl border border-white/10">
                  <h3 className="text-white/80 text-sm font-medium mb-1">Welcome to</h3>
                  <h2 className="text-xl font-bold text-white mb-2">USA-FLD CircuLink</h2>
                  <p className="text-white/60 text-xs">
                    Modern Web-Based Library Room Reservation System
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  <button
                    onClick={handleLoginClick}
                    className="w-full group relative text-base font-semibold px-6 py-4 rounded-xl transition-all duration-300
                               overflow-hidden cursor-pointer border border-white/20
                               text-white bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 hover:shadow-lg"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Login
                      <div className="w-0.5 h-5 bg-gradient-to-b from-transparent via-white to-transparent"></div>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </button>
                  
                  <button
                    onClick={handleSignUpClick}
                    className="w-full group relative text-base font-semibold px-6 py-4 rounded-xl transition-all duration-300 transform
                               overflow-hidden cursor-pointer bg-gradient-to-r from-[#CC0000] to-[#FF3333]
                               text-white shadow-lg hover:shadow-xl hover:shadow-red-500/25 hover:-translate-y-0.5"
                  >
                    <span className="relative z-10">Create Account</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </button>
                </div>

                {/* Info Section */}
                <div className="pt-6 border-t border-white/10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                      <p className="text-white/70 text-sm">Secure & Encrypted</p>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <p className="text-white/70 text-sm">24/7 Availability</p>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <p className="text-white/70 text-sm">Easy Room Booking</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent border-t border-white/10">
              <div className="text-center">
                <p className="text-white/40 text-xs mb-1">© 2024 University of San Agustin</p>
                <p className="text-white/30 text-xs">All rights reserved</p>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-1/3 -left-8 w-32 h-32 bg-[#CC0000]/5 rounded-full blur-2xl"></div>
            <div className="absolute bottom-1/4 -right-8 w-40 h-40 bg-amber-400/5 rounded-full blur-2xl"></div>
            
            {/* Subtle Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]"></div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;