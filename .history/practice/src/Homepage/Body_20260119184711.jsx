// Body.jsx
import Picture from '../assets/picture2.jpg';
import Logo2 from '../assets/logo.png';
import Logo3 from '../assets/logo3.png';
import lrc from '../assets/logo2.png';
import { ChevronDown, ArrowRight } from 'lucide-react';

function Body() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background with Enhanced Parallax Effect */}
      <div 
        className="absolute inset-0 bg-no-repeat bg-cover bg-center w-full h-full transition-all duration-1000 ease-out"
        style={{ 
          backgroundImage: `url(${Picture})`,
          transform: 'scale(1.1)'
        }}
      >
        {/* Multi-layered Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-0"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Logo and Title Container */}
        <div className="flex flex-col items-center mb-4 sm:mb-6 md:mb-8 transform transition-all duration-700 w-full max-w-6xl mx-auto px-2">
          {/* Logo Row - Stack on mobile, horizontal on sm+ */}
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-3 md:space-x-6 lg:space-x-8 xl:space-x-10 mb-6 sm:mb-8 w-full">
            {/* Logo 1 */}
            <div className="relative group w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36">
              <div className="absolute -inset-2 xs:-inset-2.5 sm:-inset-3 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={Logo2} 
                alt="University of San Agustin Logo" 
                className="relative w-full h-full drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500 object-contain"
              />
            </div>
            
            {/* Vertical Divider - Only show on sm+ */}
            <div className="hidden sm:block">
              <div className="h-20 sm:h-24 md:h-28 lg:h-32 xl:h-36 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent mx-1 sm:mx-2 md:mx-3 lg:mx-4"></div>
            </div>
            
            {/* Logo 2 */}
            <div className="relative group w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36">
              <div className="absolute -inset-2 xs:-inset-2.5 sm:-inset-3 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={lrc} 
                alt="Learning Resource Center Logo" 
                className="relative w-full h-full drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500 object-contain"
              />
            </div>

            {/* Vertical Divider - Only show on sm+ */}
            <div className="hidden sm:block">
              <div className="h-20 sm:h-24 md:h-28 lg:h-32 xl:h-36 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent mx-1 sm:mx-2 md:mx-3 lg:mx-4"></div>
            </div>

            {/* Logo 3 */}
            <div className="relative group w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36">
              <div className="absolute -inset-2 xs:-inset-2.5 sm:-inset-3 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={Logo3} 
                alt="Learning Resource Center Logo" 
                className="relative w-full h-full drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500 object-contain"
              />
            </div>
          </div>
          
          {/* Title and Description */}
          <div className="text-center space-y-3 sm:space-y-4 w-full max-w-4xl mx-auto px-2">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white font-bold leading-tight mb-1 sm:mb-2 animate-fade-in">
              <span className="text-amber-400 drop-shadow-md">USA-FLD</span>{' '}
              <span className="text-white drop-shadow-md">CircuLink</span>
            </h1>
            
            {/* Divider Line */}
            <div className="w-32 xs:w-40 sm:w-48 md:w-56 lg:w-64 xl:w-72 h-1 sm:h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-3 sm:mb-4 rounded-full"></div>
            
            {/* Subtitle */}
            <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-white/90 font-normal max-w-2xl sm:max-w-3xl mx-auto leading-relaxed sm:leading-snug py-2 px-3 sm:px-4 md:px-6 rounded-full bg-black/10 sm:bg-black/20 backdrop-blur-sm">
              Modern Web-Based Library Room Reservation System
            </p>
          </div>
        </div>

        {/* Optional: Add a CTA Button for larger screens */}
        <div className="hidden lg:block mt-6 lg:mt-8 xl:mt-10">
          <button 
            onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-full shadow-lg hover:shadow-amber-500/25 transition-all duration-300 flex items-center gap-2"
          >
            Get Started
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* Down Arrow - Always visible */}
      <div className="absolute bottom-4 xs:bottom-6 sm:bottom-8 md:bottom-10 left-0 right-0 z-10 flex justify-center">
        <button 
          onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
          className="p-1.5 xs:p-2 sm:p-2.5 md:p-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-amber-400/20 hover:border-amber-400/40 transition-all duration-300 group animate-bounce"
          aria-label="Scroll down"
        >
          <ChevronDown
            size={24}
            className="xs:size-28 sm:size-30 md:size-32 text-white group-hover:text-amber-300 transition-colors duration-300 cursor-pointer"
          />
        </button>
      </div>
    </main>
  );
}

export default Body;