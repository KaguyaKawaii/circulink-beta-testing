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
      setIsScrolled(scrollPosition > 50); // Improved trigger point
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
      {/* Maintenance Banner */}
      {maintenanceMode && (
        <div className="fixed top-0 left-0 w-full z-[60] bg-amber-500 text-black py-2 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold">
          <AlertTriangle size={16} />
          <span className="truncate">{maintenanceMessage || "System under maintenance"}</span>
        </div>
      )}

      <header className={`fixed left-0 w-full z-50 transition-all duration-500 ${
        maintenanceMode ? 'top-[36px]' : 'top-0'
      } ${
        isScrolled 
          ? 'bg-[#171717]/95 backdrop-blur-md shadow-2xl py-2' 
          : 'bg-transparent py-4'
      }`}>
        <nav className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo + Title Section */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-1 mr-2">
            <div className="relative flex-shrink-0">
              <img
                className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 object-contain transition-transform duration-300 hover:rotate-3"
                src={Logo}
                alt="USA Logo"
              />
            </div>
            <div className="flex flex-col leading-tight">
              {/* Hidden on very small screens to prevent overlap */}
              <h1 className="hidden min-[380px]:block text-sm sm:text-lg md:text-xl lg:text-2xl font-serif font-semibold text-white tracking-wide truncate max-w-[150px] sm:max-w-none">
                University of San Agustin
              </h1>
              <div className="flex items-center gap-2">
                <span className="hidden md:block text-white/40 text-sm">|</span>
                <span className="text-amber-300 text-xs sm:text-sm md:text-base font-bold tracking-wider uppercase">
                  CircuLink
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={onLoginClick}
              className="text-sm lg:text-base font-medium px-6 py-2 rounded-lg border border-white/30 text-white hover:bg-white/10 transition-all active:scale-95"
            >
              Login
            </button>
            <button
              onClick={onSignUpClick}
              className="text-sm lg:text-base font-medium px-6 py-2 rounded-lg bg-white text-[#CC0000] hover:bg-gray-100 transition-all shadow-lg active:scale-95"
            >
              Sign Up
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={openMenu}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="Open Menu"
            >
              <Menu size={28} />
            </button>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        {isOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            {/* Background Backdrop */}
            <div 
              className={`absolute inset-0 bg-gray-900 transition-transform duration-300 ease-in-out ${
                isAnimating ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Close Button Header */}
              <div className="flex justify-end p-6">
                <button
                  onClick={closeMenu}
                  className="p-2 text-white/70 hover:text-white border border-white/20 rounded-xl"
                >
                  <X size={32} />
                </button>
              </div>

              {/* Mobile Menu Content */}
              <div className="flex flex-col items-center justify-between h-[calc(100%-100px)] px-6 pb-12 overflow-y-auto">
                
                <div className="flex flex-col items-center text-center mt-8">
                  <img className="w-20 h-20 mb-6 drop-shadow-2xl" src={Logo} alt="Logo" />
                  <h2 className="text-2xl font-bold text-white mb-2 font-serif">
                    University of San Agustin
                  </h2>
                  <p className="text-amber-400 text-lg font-bold tracking-[0.2em] uppercase">
                    CircuLink
                  </p>
                </div>

                <div className="w-full max-w-sm space-y-4 mb-auto mt-12">
                  <button
                    onClick={handleLoginClick}
                    className="w-full py-4 rounded-2xl border-2 border-white/20 text-white text-lg font-semibold hover:bg-white/10 active:scale-[0.98] transition-all"
                  >
                    Login to Account
                  </button>
                  <button
                    onClick={handleSignUpClick}
                    className="w-full py-4 rounded-2xl bg-white text-[#CC0000] text-lg font-bold shadow-xl active:scale-[0.98] transition-all"
                  >
                    Create New Account
                  </button>
                </div>

                <div className="text-center pt-8">
                  <p className="text-white/30 text-xs uppercase tracking-widest">
                    Library Reservation System &bull; v1.0
                  </p>
                </div>
              </div>

              {/* Decorative Gradients */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-[80px] -z-10"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/10 blur-[80px] -z-10"></div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default Header;