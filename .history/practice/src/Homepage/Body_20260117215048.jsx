// Body.jsx
import Picture from '../assets/picture2.jpg';
import Logo2 from '../assets/logo.png';
import Logo3 from '../assets/logo3.png';
import lrc from '../assets/logo2.png';
import { ChevronDown } from 'lucide-react';

function Body() {
  return (
    <main className="relative min-h-[100svh] w-full overflow-hidden flex flex-col items-center justify-center">
      {/* Background with Enhanced Parallax Effect */}
      <div 
        className="absolute inset-0 bg-no-repeat bg-cover bg-center w-full h-full transition-all duration-1000 ease-out z-0"
        style={{ 
          backgroundImage: `url(${Picture})`,
          transform: 'scale(1.1)'
        }}
      >
        {/* Multi-layered Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20 z-0"></div>

        {/* Subtle animated particles */}
        <div className="absolute inset-0 opacity-20 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div 
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${Math.random() * 3 + 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center text-center flex-grow">
        
        {/* Logos Section */}
        <div className="flex flex-row items-center justify-center gap-3 sm:gap-6 md:gap-10 lg:gap-14 mb-6 sm:mb-10 w-full animate-fade-in-up">
          {/* Logo 1 */}
          <div className="relative group">
            <div className="absolute -inset-2 sm:-inset-4 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
            <img 
              src={Logo2} 
              alt="USA Logo" 
              className="relative w-14 h-14 sm:w-24 sm:h-24 md:w-32 lg:w-40 drop-shadow-2xl transition-transform duration-500 hover:scale-110 object-contain"
            />
          </div>
          
          {/* Separator 1 */}
          <div className="h-10 sm:h-20 md:h-28 w-[1px] bg-gradient-to-b from-transparent via-white/40 to-transparent"></div>
          
          {/* Logo 2 */}
          <div className="relative group">
            <div className="absolute -inset-2 sm:-inset-4 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
            <img 
              src={lrc} 
              alt="LRC Logo" 
              className="relative w-14 h-14 sm:w-24 sm:h-24 md:w-32 lg:w-40 drop-shadow-2xl transition-transform duration-500 hover:scale-110 object-contain"
            />
          </div>

          {/* Separator 2 */}
          <div className="h-10 sm:h-20 md:h-28 w-[1px] bg-gradient-to-b from-transparent via-white/40 to-transparent"></div>

          {/* Logo 3 */}
          <div className="relative group">
            <div className="absolute -inset-2 sm:-inset-4 bg-amber-400/20 rounded-full blur-md group-hover:bg-amber-400/30 transition-all duration-500"></div>
            <img 
              src={Logo3} 
              alt="Logo 3" 
              className="relative w-14 h-14 sm:w-24 sm:h-24 md:w-32 lg:w-40 drop-shadow-2xl transition-transform duration-500 hover:scale-110 object-contain"
            />
          </div>
        </div>

        {/* Text Section */}
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black tracking-tight text-white leading-[1.1] drop-shadow-2xl">
            <span className="text-amber-400 block sm:inline-block">USA-FLD</span>{' '}
            <span className="text-white block sm:inline-block">CircuLink</span>
          </h1>
          
          <div className="w-24 sm:w-48 md:w-64 h-1 sm:h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto rounded-full"></div>
          
          <p className="text-sm sm:text-lg md:text-xl lg:text-3xl text-white/90 font-medium max-w-2xl mx-auto leading-relaxed px-2">
            Modern Web-Based Library Room Reservation System
          </p>
        </div>
      </div>

      {/* Down Arrow / Scroll Indicator */}
      <div className="relative z-20 pb-8 sm:pb-12">
        <button 
          onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
          className="p-3 sm:p-4 bg-white/5 backdrop-blur-md rounded-full border border-white/10 hover:bg-amber-400/20 hover:border-amber-400/40 transition-all duration-300 group animate-bounce shadow-2xl"
          aria-label="Scroll down"
        >
          <ChevronDown
            size={24}
            className="text-white group-hover:text-amber-300 transition-colors duration-300 sm:w-8 sm:h-8"
          />
        </button>
      </div>
    </main>
  );
}

export default Body;