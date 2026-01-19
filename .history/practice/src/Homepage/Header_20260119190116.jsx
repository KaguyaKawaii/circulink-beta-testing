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
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  };

  const closeMenu = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsOpen(false);
      document.body.style.overflow = 'unset'; // Re-enable scrolling
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
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-[#171717] shadow-2xl' 
          : 'bg-transparent shadow-lg'
      }`}>
        <nav className="w-full max-w-8xl mx-auto flex items-center justify-between px-4 sm:px-7 py-4">
          {/* Logo + Title - Horizontal Layout */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative flex items-center">
              <div className="absolute -inset-3 bg-white/10 rounded-full transform scale-0 transition-transform duration-300 group-hover:scale-100"></div>
              <img
                className="w-10 h-10 sm:w-12 sm:h-12 relative z-10 transition-transform duration-300 hover:scale-110"
                src={Logo}
                alt="University of San Agustin Logo"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <h1 className="text-lg sm:text-xl md:text-2xl font-serif font-semibold text-white tracking-wide leading-tight">
                University of San Agustin
              </h1>
              <span className="hidden sm:block text-white/80 text-sm">|</span>
              <span className="text-amber-300 text-sm sm:text-base font-medium">CircuLink</span>
            </div>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex gap-3">
            <button
              onClick={onLoginClick}
              className="group relative text-sm md:text-base font-medium px-5 py-2.5 rounded-lg border transition-all duration-300
                         shadow-sm overflow-hidden cursor-pointer
                         text-white border-white/40 hover:bg-white/15 hover:border-white/80 hover:shadow-md"
              title="Login to your account"
            >
              <span className="relative z-10">Login</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
            <button
              onClick={onSignUpClick}
              className="group relative text-sm md:text-base font-medium px-5 py-2.5 rounded-lg border transition-all duration-300 transform
                         shadow-md overflow-hidden cursor-pointer
                         text-[#CC0000] bg-white border-white hover:bg-gray-50 hover:shadow-lg hover:-translate-y-0.5"
              title="Create new account"
            >
              <span className="relative z-10">Sign Up</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={openMenu}
              className="text-white focus:outline-none hover:text-gray-200 p-2 transition-all duration-300"
              title="Toggle menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </nav>

        {/* Compact Full Screen Mobile Menu with Right-to-Left Slide Animation */}
        {isOpen && (
          <div className="md:hidden fixed inset-0 z-50 overflow-hidden">
            {/* Full Screen Slide Panel */}
            <div 
              className={`absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 transition-transform duration-300 ease-out ${
                isAnimating ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Close Button */}
              <div className="absolute top-4 right-4 z-60">
                <button
                  onClick={closeMenu}
                  className="text-white p-2 hover:bg-white/10 rounded-lg transition-all duration-300"
                  title="Close menu"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Menu Content - Centered */}
              <div className="flex flex-col items-center justify-center h-full px-6">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-12">
                  <img
                    className="w-16 h-16 mb-3"
                    src={Logo}
                    alt="University of San Agustin Logo"
                  />
                  <h2 className="text-xl font-bold text-white text-center mb-1">
                    University of San Agustin
                  </h2>
                  <p className="text-amber-400 text-base font-semibold text-center">
                    CircuLink
                  </p>
                  <p className="text-white/60 text-xs text-center mt-1">
                    Library Reservation
                  </p>
                </div>

                {/* Buttons Section */}
                <div className="flex flex-col gap-4 w-full max-w-xs">
                  <button
                    onClick={handleLoginClick}
                    className="w-full text-center group relative text-base font-semibold px-6 py-4 rounded-xl border transition-all duration-300
                               shadow-lg overflow-hidden cursor-pointer
                               text-white border-white/40 hover:bg-white/15 hover:border-white/80 hover:shadow-xl"
                  >
                    <span className="relative z-10">Login</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </button>
                  
                  <button
                    onClick={handleSignUpClick}
                    className="w-full text-center group relative text-base font-semibold px-6 py-4 rounded-xl border transition-all duration-300 transform
                               shadow-lg overflow-hidden cursor-pointer
                               text-[#CC0000] bg-white border-white hover:bg-gray-50 hover:shadow-xl"
                  >
                    <span className="relative z-10">Sign Up</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </button>
                </div>

                {/* Footer Text */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center">
                  <p className="text-white/40 text-xs">
                    Modern Web-Based System
                  </p>
                </div>
              </div>

              {/* Subtle Background Elements */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-[#CC0000]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full translate-x-1/2 translate-y-1/2 blur-2xl"></div>
              
              {/* Subtle Grid Pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default Header;