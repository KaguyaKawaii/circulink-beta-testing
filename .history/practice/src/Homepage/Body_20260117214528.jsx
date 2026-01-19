// Body.jsx
import { ChevronDown } from 'lucide-react';

/**
 * Note: Asset imports (picture2.jpg) were removed to prevent resolution errors.
 * Using a high-quality placeholder URL and CSS fallbacks to ensure the 
 * component remains functional and responsive in the preview environment.
 */

function Body() {
  const backgroundImage = "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=2000";

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Responsive Background */}
      <div 
        className="absolute inset-0 bg-no-repeat bg-cover bg-center transition-transform duration-1000 scale-105"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80 z-0"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-12 sm:mt-0">
        <div className="animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white font-black tracking-tight leading-none mb-6">
            <span className="text-amber-400 block sm:inline">USA-FLD</span>{' '}
            <span className="block sm:inline">CircuLink</span>
          </h1>
          
          <div className="w-24 sm:w-32 md:w-48 h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-8 rounded-full"></div>
          
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 font-medium max-w-4xl mx-auto leading-relaxed px-2">
            Modern Web-Based Library Room Reservation System
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button className="w-full sm:w-auto px-8 py-4 bg-[#CC0000] text-white rounded-full font-bold text-lg hover:bg-amber-400 hover:text-white transition-all transform hover:scale-105 shadow-xl">
              Book a Room
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-md text-white border-2 border-white/30 rounded-full font-bold text-lg hover:bg-white/20 transition-all">
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Down Arrow - Hidden on very small screens to save space */}
      <div className="absolute bottom-10 left-0 right-0 hidden sm:flex justify-center z-10 animate-bounce">
        <button 
          onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
          className="p-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-white hover:bg-amber-400 hover:border-amber-400 transition-all"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>
    </main>
  );
}

export default Body;