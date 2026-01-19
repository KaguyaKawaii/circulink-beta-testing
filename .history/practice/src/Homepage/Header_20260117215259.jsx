import { useState, useEffect } from "react";
import { Menu, X, AlertTriangle } from "lucide-react";
import logo from "../../assets/logo.png";

// Note: Local asset paths and utility imports are replaced with placeholders 
// and mock logic for a self-contained, runnable component in this environment.
const MOCK_LOGO_URL = "https://via.placeholder.com/150/CC0000/FFFFFF?text=USA";

function Header({ onLoginClick, onSignUpClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Mock API check for maintenance mode
    const checkMaintenanceMode = async () => {
      try {
        // Simulating an API response check
        // In your local environment, you would use: await api.get('/system/maintenance-status')
        const mockData = { success: true, maintenanceMode: false, maintenanceMessage: "" };
        if (mockData.success) {
          setMaintenanceMode(mockData.maintenanceMode);
          setMaintenanceMessage(mockData.maintenanceMessage || "");
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
      }
    };

    checkMaintenanceMode();
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openMenu = () => {
    setIsOpen(true);
    setTimeout(() => setIsAnimating(true), 10);
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
    if (onLoginClick) onLoginClick();
  };

  const handleSignUpClick = () => {
    closeMenu();
    if (onSignUpClick) onSignUpClick();
  };

  return (
    <>
      {/* Maintenance Banner */}
      {maintenanceMode && (
        <div className="fixed top-0 left-0 w-full z-[60] bg-amber-500 text-black py-2 px-4 flex items-center justify-center gap-2 text-sm font-bold">
          <AlertTriangle size={18} />
          <span className="truncate">{maintenanceMessage || "System under maintenance"}</span>
        </div>
      )}

      {/* Main Header */}
      <header 
        className={`fixed left-0 w-full z-50 transition-all duration-300 ease-in-out ${
          maintenanceMode ? 'top-10' : 'top-0'
        } ${
          isScrolled 
            ? 'bg-[#171717]/95 backdrop-blur-md py-2 shadow-xl border-b border-white/5' 
            : 'bg-transparent py-4 sm:py-6'
        }`}
      >
        <nav className="max-w-[1440px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-10">
          
          {/* Logo + Title Section */}
          <div className="flex items-center gap-2 sm:gap-4 group cursor-pointer">
            <div className="relative flex items-center shrink-0">
              <div className="absolute -inset-2 bg-white/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <img
                className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 relative z-10 transition-transform duration-500 group-hover:rotate-[360deg] rounded-full"
                src={logo}
                alt="USA Logo"
              />
            </div>
            
            <div className="flex flex-col justify-center">
              <h1 className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-serif font-bold text-white tracking-tight leading-none whitespace-nowrap">
                University of San Agustin
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-[2px] w-4 bg-amber-400 rounded-full"></div>
                <span className="text-[10px] sm:text-xs md:text-sm text-amber-300 font-bold uppercase tracking-[0.15em]">
                  CircuLink
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            <button
              onClick={onLoginClick}
              className="px-6 py-2.5 text-sm lg:text-base font-medium text-white hover:text-amber-300 transition-colors duration-200"
            >
              Login
            </button>
            <button
              onClick={onSignUpClick}
              className="relative px-7 py-2.5 text-sm lg:text-base font-bold bg-white text-[#CC0000] rounded-full overflow-hidden shadow-lg hover:shadow-white/10 hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
            >
              <span className="relative z-10">Sign Up</span>
              <div className="absolute inset-0 bg-gray-100 translate-y-full hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={openMenu}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white active:bg-white/20 transition-all duration-200"
              aria-label="Open Menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </nav>

        {/* Full Screen Mobile Menu Overlay */}
        {isOpen && (
          <div className="md:hidden fixed inset-0 z-[70] flex justify-end">
            {/* Backdrop Blur */}
            <div 
              className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                isAnimating ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={closeMenu}
            />

            {/* Menu Drawer */}
            <div 
              className={`relative w-[85%] max-w-sm h-full bg-[#121212] shadow-2xl transition-transform duration-300 ease-out border-l border-white/5 flex flex-col ${
                isAnimating ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <img className="w-8 h-8 rounded-full" src={MOCK_LOGO_URL} alt="Logo" />
                  <span className="font-serif font-bold text-white text-lg">USA</span>
                </div>
                <button
                  onClick={closeMenu}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto py-8 px-6 space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-4">Account Access</p>
                  
                  <button
                    onClick={handleLoginClick}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group"
                  >
                    <span className="text-lg font-medium">Login to Account</span>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <div className="border-t-2 border-r-2 border-white w-2 h-2 rotate-45" />
                    </div>
                  </button>

                  <div className="h-4" />

                  <button
                    onClick={handleSignUpClick}
                    className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#CC0000] to-[#990000] text-white font-bold text-lg shadow-lg shadow-red-900/20 active:scale-[0.98] transition-all"
                  >
                    Create New Account
                  </button>
                </div>

                <div className="pt-8 space-y-4 border-t border-white/5">
                   <div className="flex items-center gap-3 text-white/50 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      System Status: Operational
                   </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-8 text-center bg-black/20">
                <p className="text-amber-400 font-bold text-sm tracking-widest uppercase">CircuLink</p>
                <p className="text-white/30 text-[10px] mt-2 italic">© 2024 University of San Agustin</p>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default Header;