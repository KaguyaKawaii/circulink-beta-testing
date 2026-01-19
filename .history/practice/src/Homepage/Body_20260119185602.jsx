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
      <div className="relative z-10 h-screen flex flex-col items-center justify-center text-center px-3 xs:px-4 sm:px-6 lg:px-8 py-8">
        {/* Logo and Title Container */}
        <div className="flex flex-col items-center mb-4 sm:mb-6 md:mb-8 transform transition-all duration-700 w-full max-w-6xl mx-auto">
          {/* Logo Container - Always horizontal, no scroll */}
          <div className="flex justify-center items-center gap-1 xs:gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-6 sm:mb-8 w-full">
            {/* Logo 1 */}
            <div className="relative group">
              <div className="absolute -inset-1 xs:-inset-2 sm:-inset-3 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={Logo2} 
                alt="University of San Agustin Logo" 
                className="relative w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            
            {/* Divider 1 */}
            <div className="h-14 xs:h-16 sm:h-20 md:h-24 lg:h-28 xl:h-32 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent mx-0.5 xs:mx-1 sm:mx-1.5 md:mx-2 lg:mx-3 shrink-0"></div>
            
            {/* Logo 2 */}
            <div className="relative group">
              <div className="absolute -inset-1 xs:-inset-2 sm:-inset-3 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={lrc} 
                alt="Learning Resource Center Logo" 
                className="relative w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Divider 2 */}
            <div className="h-14 xs:h-16 sm:h-20 md:h-24 lg:h-28 xl:h-32 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent mx-0.5 xs:mx-1 sm:mx-1.5 md:mx-2 lg:mx-3 shrink-0"></div>

            {/* Logo 3 */}
            <div className="relative group">
              <div className="absolute -inset-1 xs:-inset-2 sm:-inset-3 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={Logo3} 
                alt="Learning Resource Center Logo" 
                className="relative w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          
          {/* Title and Tagline */}
          <div className="text-center space-y-3 sm:space-y-4 w-full max-w-4xl mx-auto">
            <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-white font-bold leading-tight mb-1 sm:mb-2 animate-fade-in">
              <span className="text-amber-400 drop-shadow-md">USA-FLD</span>{' '}
              <span className="text-white drop-shadow-md">CircuLink</span>
            </h1>
            
            <div className="w-28 xs:w-32 sm:w-40 md:w-48 lg:w-56 h-0.5 xs:h-1 sm:h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-2 sm:mb-4 rounded-full"></div>
            
            <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 font-normal max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto leading-relaxed sm:leading-snug px-2">
              Modern Web-Based Library Room Reservation System
            </p>
          </div>
        </div>
      </div>

      {/* Down Arrow */}
      <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 lg:bottom-10 left-0 right-0 z-10 flex justify-center">
        <button 
          onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
          className="p-2 sm:p-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-amber-400/20 hover:border-amber-400/40 transition-all duration-300 group"
          aria-label="Scroll down"
        >
          <ChevronDown
            size={24}
            className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 text-white group-hover:text-amber-300 transition-colors duration-300 cursor-pointer"
          />
        </button>
      </div>
    </main>
  );
}

export default Body;