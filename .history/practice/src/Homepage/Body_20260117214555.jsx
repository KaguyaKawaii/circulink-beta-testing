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

        
        {/* Subtle animated particles */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(15)].map((_, i) => (
            <div 
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                width: `${Math.random() * 10 + 2}px`,
                height: `${Math.random() * 10 + 2}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${Math.random() * 3 + 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8">
        {/* Logo and Title Container */}
        <div className="flex flex-col items-center mb-8 transform transition-all duration-700 w-full max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-6 sm:space-y-0 sm:space-x-4 md:space-x-8 lg:space-x-12 mb-8 w-full">
            <div className="relative group">
              <div className="absolute -inset-3 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={Logo2} 
                alt="University of San Agustin Logo" 
                className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            
            <div className="hidden sm:block">
              <div className="h-24 sm:h-28 md:h-32 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent mx-2 md:mx-4"></div>
            </div>
            
            <div className="relative group">
              <div className="absolute -inset-3 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={lrc} 
                alt="Learning Resource Center Logo" 
                className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <div className="hidden sm:block">
              <div className="h-24 sm:h-28 md:h-32 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent mx-2 md:mx-4"></div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-3 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
              <img 
                src={Logo3} 
                alt="Learning Resource Center Logo" 
                className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 drop-shadow-lg transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          
          <div className="text-center space-y-4 w-full max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white font-bold leading-tight mb-2 animate-fade-in">
              <span className="text-amber-400 drop-shadow-md">USA-FLD</span>{' '}
              <span className="text-white drop-shadow-md">CircuLink</span>
            </h1>
            
            <div className="w-48 sm:w-56 md:w-64 h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-4 rounded-full"></div>
            
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 font-normal max-w-3xl mx-auto leading-snug py-2 px-4 sm:px-6 rounded-full">
              Modern Web-Based Library Room Reservation System
            </p>
          </div>
        </div>

      
      </div>

      {/* Down Arrow */}
      <div className="absolute bottom-6 sm:bottom-10 left-0 right-0 z-10 flex justify-center">
        <button 
          onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
          className="p-2 sm:p-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-amber-400/20 hover:border-amber-400/40 transition-all duration-300 group animate-bounce"
          aria-label="Scroll down"
        >
          <ChevronDown
            size={32}
            className="text-white group-hover:text-amber-300 transition-colors duration-300 cursor-pointer"
          />
        </button>
      </div>
    </main>
  );
}

export default Body;