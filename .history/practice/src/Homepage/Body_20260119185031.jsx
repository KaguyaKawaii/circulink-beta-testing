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
      <div className="relative z-10 h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-8">
        {/* Logo and Title Container */}
        <div className="flex flex-col items-center mb-4 sm:mb-6 md:mb-8 transform transition-all duration-700 w-full max-w-6xl mx-auto">
          {/* Logo Container - Stack on small screens, horizontal on medium+ */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-2 md:gap-4 lg:gap-6 xl:gap-8 mb-6 sm:mb-8 w-full">
            {/* Logo 1 */}
            <div className="relative group">
              <div className="absolute -inset-2 sm:-inset-3 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={Logo2} 
                alt="University of San Agustin Logo" 
                className="relative w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40 drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            
            {/* Divider 1 - Only show on medium+ screens */}
            <div className="hidden sm:block">
              <div className="h-20 sm:h-24 md:h-28 lg:h-32 xl:h-36 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent mx-1 sm:mx-2 md:mx-3 lg:mx-4"></div>
            </div>
            
            {/* Logo 2 */}
            <div className="relative group">
              <div className="absolute -inset-2 sm:-inset-3 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={lrc} 
                alt="Learning Resource Center Logo" 
                className="relative w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40 drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Divider 2 - Only show on medium+ screens */}
            <div className="hidden sm:block">
              <div className="h-20 sm:h-24 md:h-28 lg:h-32 xl:h-36 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent mx-1 sm:mx-2 md:mx-3 lg:mx-4"></div>
            </div>

            {/* Logo 3 */}
            <div className="relative group">
              <div className="absolute -inset-2 sm:-inset-3 bg-amber-400/20 rounded-md sm:rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={Logo3} 
                alt="Learning Resource Center Logo" 
                className="relative w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40 drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          
          {/* Title and Tagline */}
          <div className="text-center space-y-3 sm:space-y-4 w-full max-w-4xl mx-auto px-2">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white font-bold leading-tight mb-1 sm:mb-2 animate-fade-in">
              <span className="text-amber-400 drop-shadow-md">USA-FLD</span>{' '}
              <span className="text-white drop-shadow-md">CircuLink</span>
            </h1>
            
            <div className="w-32 xs:w-40 sm:w-48 md:w-56 lg:w-64 h-1 sm:h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-2 sm:mb-4 rounded-full"></div>
            
            <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 font-normal max-w-2xl sm:max-w-3xl mx-auto leading-relaxed sm:leading-snug px-4 sm:px-6">
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
            size={28}
            className="w-6 h-6 sm:w-8 sm:h-8 text-white group-hover:text-amber-300 transition-colors duration-300 cursor-pointer"
          />
        </button>
      </div>
    </main>
  );
}

export default Body;