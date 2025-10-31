// Body3.jsx
import { useState, useEffect, useRef } from "react";
import Faculty1 from "../assets/FacultyRoom.jpg";
import Faculty2 from "../assets/FacultyRoom2.jpg";
import Collab from "../assets/CollabRoom.jpg";
import Collab2 from "../assets/CollabRoom2.jpg";

// Import room images from 1st_Floor folder
import Discussion1 from "../assets/1st_Floor/Discussion/Discussion_Room_1.jpg";
import Discussion2 from "../assets/1st_Floor/Discussion/Discussion_Room_2.jpg";
import Discussion3 from "../assets/1st_Floor/Discussion/Discussion_Room_3.jpg";
import Graduate1 from "../assets/1st_Floor/Graduate/Graduate_Research_Hub_1.jpg";
import Graduate2 from "../assets/1st_Floor/Graduate/Graduate_Research_Hub_2.jpg";
import Graduate3 from "../assets/1st_Floor/Graduate/Graduate_Research_Hub_3.jpg";
import GroundFloor from "../assets/1st_Floor/Ground_Floor.jpg";

// Import 2nd Floor images
import SecondFloor1 from "../assets/2nd_Floor/2nd_Floor.2.jpg";
import SecondFloor2 from "../assets/2nd_Floor/2nd_Floor.jpg";
import Discussion1_1 from "../assets/2nd_Floor/Discussion/Discussion_Room_1.1.jpg";
import Discussion1_2 from "../assets/2nd_Floor/Discussion/Discussion_Room_1.jpg";
import Discussion2_1 from "../assets/2nd_Floor/Discussion/Discussion_Room_2.1.jpg";
import Discussion2_2 from "../assets/2nd_Floor/Discussion/Discussion_Room_2.jpg";
import Faculty1_1 from "../assets/2nd_Floor/Faculty/Faculty_Room_1.1.jpg";
import Faculty1_2 from "../assets/2nd_Floor/Faculty/Faculty_Room_1.jpg";

// Import floor background image
import Picture2 from "../assets/picture2.jpg";

const floors = [
  {
    name: "1st Floor",
    description: "Graduate Research Hubs and Discussion Rooms",
    color: "from-[#CC0000] to-[#990000]",
    accentColor: "[#CC0000]",
    background: GroundFloor,
    floorImage: GroundFloor,
    rooms: [
      { src: Graduate1, label: "Graduate Research Hub 1", description: "Dedicated space for graduate research and advanced studies" },
      { src: Graduate2, label: "Graduate Research Hub 2", description: "Advanced research environment for graduate students" },
      { src: Graduate3, label: "Graduate Research Hub 3", description: "Premium research facility for academic excellence" },
      { src: Discussion1, label: "Discussion Room 1", description: "Perfect for small group discussions and study sessions" },
      { src: Discussion2, label: "Discussion Room 2", description: "Comfortable space for collaborative learning and academic discussions" },
      { src: Discussion3, label: "Discussion Room 3", description: "Ideal for project meetings and group study sessions" },
    ]
  },
  {
    name: "2nd Floor",
    description: "Discussion Rooms and Faculty Spaces",
    color: "from-[#CC0000] to-[#990000]",
    accentColor: "[#CC0000]",
    background: SecondFloor1,
    floorImage: SecondFloor1,
    rooms: [
      { src: Discussion1_1, label: "2nd Floor Discussion Room 1.1", description: "Modern discussion space for academic collaboration" },
      // { src: Discussion1_2, label: "2nd Floor Discussion Room 1", description: "Spacious room for group meetings and study sessions" },
      { src: Discussion2_1, label: "2nd Floor Discussion Room 2.1", description: "Comfortable environment for team projects" },
      // { src: Discussion2_2, label: "2nd Floor Discussion Room 2", description: "Well-equipped space for academic discussions" },
      { src: Faculty1_1, label: "2nd Floor Faculty Room 1.1", description: "Professional workspace for faculty members" },
      // { src: Faculty1_2, label: "2nd Floor Faculty Room", description: "Modern faculty office with advanced amenities" },
    ]
  },
  {
    name: "4th Floor",
    description: "Collaboration Space and Faculty Room",
    color: "from-[#CC0000] to-[#990000]",
    accentColor: "[#CC0000]",
    background: Picture2,
    floorImage: Picture2,
    rooms: [
      { src: Collab, label: "Collaboration Room", description: "Interactive space for team projects and group work" },
      { src: Faculty1, label: "Faculty Room", description: "Spacious work area for faculty members" },
    ]
  },
  {
    name: "5th Floor",
    description: "Collaboration Space and Faculty Room",
    color: "from-[#CC0000] to-[#990000]",
    accentColor: "[#CC0000]",
    background: Picture2,
    floorImage: Picture2,
    rooms: [
      { src: Collab2, label: "Collaboration Room", description: "High-tech environment for collaborative learning and team projects" },
      { src: Faculty2, label: "Faculty Room", description: "Modern equipped workspace for educators and faculty members" },
    ]
  }
];

// Combine all slides for the carousel
const allSlides = floors.flatMap(floor => floor.rooms);

function Body3() {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [isFloorImageFullscreen, setIsFloorImageFullscreen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const timer = useRef(null);
  const carouselRef = useRef(null);
  const floorImageRef = useRef(null);

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileLayout(window.innerWidth < 1024); // lg breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const next = () => setIndex((i) => (i + 1) % allSlides.length);
  const prev = () => setIndex((i) => (i - 1 + allSlides.length) % allSlides.length);

  useEffect(() => {
    if (isPlaying) {
      timer.current = setInterval(next, 5000);
    } else {
      clearInterval(timer.current);
    }
    return () => clearInterval(timer.current);
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const goToSlide = (i) => setIndex(i);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      carouselRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleFloorImageFullscreen = () => {
    if (!document.fullscreenElement) {
      floorImageRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFloorImageFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFloorImageFullscreen(false);
    }
  };

  // Find which floor the current slide belongs to
  const getCurrentSlideFloor = () => {
    let cumulativeIndex = 0;
    for (let i = 0; i < floors.length; i++) {
      if (index < cumulativeIndex + floors[i].rooms.length) {
        return i;
      }
      cumulativeIndex += floors[i].rooms.length;
    }
    return 0;
  };

  const currentFloorIndex = getCurrentSlideFloor();

  // Mobile-optimized floor navigation
  const MobileFloorNav = () => (
    <div className="lg:hidden w-full mb-8">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Select Floor</h3>
        <div className="flex flex-col space-y-3">
          {floors.map((floor, floorIndex) => (
            <button
              key={floor.name}
              onClick={() => {
                setActiveFloorIndex(floorIndex);
                let startIndex = 0;
                for (let i = 0; i < floorIndex; i++) {
                  startIndex += floors[i].rooms.length;
                }
                setIndex(startIndex);
              }}
              className={`p-4 rounded-xl transition-all duration-300 ${
                activeFloorIndex === floorIndex
                  ? `bg-gradient-to-r ${floor.color} text-white shadow-md`
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{floor.name}</span>
                <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                  {floor.rooms.length} room{floor.rooms.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm mt-1 text-left opacity-90">
                {floor.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Desktop floor navigation
  const DesktopFloorNav = () => (
    <div className="hidden lg:block w-full max-w-6xl mx-auto mb-12 px-4">
      <div className="flex flex-col sm:flex-row justify-center items-stretch gap-4 sm:gap-6 lg:gap-8">
        {floors.map((floor, floorIndex) => (
          <button
            key={floor.name}
            onClick={() => {
              setActiveFloorIndex(floorIndex);
              let startIndex = 0;
              for (let i = 0; i < floorIndex; i++) {
                startIndex += floors[i].rooms.length;
              }
              setIndex(startIndex);
            }}
            className={`group relative p-6 rounded-2xl transition-all duration-500 transform hover:scale-105 flex-1 min-w-0 border-2 ${
              activeFloorIndex === floorIndex
                ? `bg-gradient-to-br ${floor.color} shadow-lg scale-105 text-white border-transparent`
                : "bg-white/90 backdrop-blur-lg border-gray-200/60 shadow-md hover:shadow-lg text-gray-700 hover:border-[#CC0000]/20"
            }`}
          >
            <div className="text-center relative z-10">
              <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-all duration-500 ${
                activeFloorIndex === floorIndex 
                  ? "bg-white/20 text-white" 
                  : "bg-[#CC0000]/10 text-[#CC0000]"
              }`}>
                <span className="text-lg font-bold">{floorIndex + 1}</span>
              </div>
              
              <h3 className={`text-lg font-bold mb-2 transition-colors duration-300 ${
                activeFloorIndex === floorIndex ? "text-white" : "text-gray-900"
              }`}>
                {floor.name}
              </h3>
              
              <p className={`text-xs transition-colors duration-300 ${
                activeFloorIndex === floorIndex ? "text-white/90" : "text-gray-600"
              }`}>
                {floor.rooms.length} Room{floor.rooms.length !== 1 ? 's' : ''}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-gray-800 py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8 overflow-hidden flex flex-col items-center">
      {/* Simplified decorative elements for mobile */}
      <div className="absolute top-0 right-0 w-48 h-48 sm:w-72 sm:h-72 bg-[#CC0000]/3 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-72 sm:h-72 bg-[#CC0000]/3 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl -z-10"></div>
      
      {/* Floor Header Section - Mobile Optimized */}
      <div className="w-full max-w-6xl mx-auto mb-8 sm:mb-12 lg:mb-16 px-2">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-0.5 bg-[#CC0000] rounded-full"></div>
            <span className="text-xs font-semibold text-[#CC0000] uppercase tracking-wider">Explore Our Spaces</span>
            <div className="w-6 h-0.5 bg-[#CC0000] rounded-full"></div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            {floors[activeFloorIndex].name}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {floors[activeFloorIndex].description}
          </p>
        </div>

        {/* Mobile-optimized Floor Overview Image */}
        <div 
          ref={floorImageRef}
          className="relative w-full h-48 sm:h-64 lg:h-80 xl:h-96 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group cursor-zoom-in mb-8"
          onClick={toggleFloorImageFullscreen}
        >
          <img
            src={floors[activeFloorIndex].floorImage}
            alt={`${floors[activeFloorIndex].name} Overview`}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-70 group-hover:opacity-50 transition-opacity duration-300"></div>
          
          {/* Simplified Overlay Content */}
          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 transform transition-transform duration-300">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 drop-shadow-lg">
              Floor Overview
            </h3>
            <div className="w-12 h-1 bg-[#CC0000] rounded-full mb-2"></div>
            <p className="text-white/90 text-xs sm:text-sm drop-shadow-lg">
              Tap to view fullscreen
            </p>
          </div>

          {/* Mobile-friendly Fullscreen Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFloorImageFullscreen();
            }}
            className="absolute top-3 right-3 z-20 p-2 bg-black/50 backdrop-blur-sm rounded-xl text-white hover:text-[#CC0000] transition-all duration-300 shadow-lg"
            aria-label="View floor overview in fullscreen"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Floor Navigation */}
      <MobileFloorNav />

      {/* Enhanced Our Facilities Heading - Mobile Optimized */}
      <div className="text-center mb-8 sm:mb-12 lg:mb-16 max-w-4xl mx-auto px-2">
        <div className="inline-flex items-center justify-center space-x-2 mb-4">
          <div className="w-8 h-0.5 bg-gray-300 rounded-full"></div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Discover</span>
          <div className="w-8 h-0.5 bg-gray-300 rounded-full"></div>
        </div>

        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
          Our <span className="text-[#CC0000] relative">
            Facilities
            <div className="absolute bottom-1 left-0 w-full h-2 bg-[#CC0000]/10 -z-10 transform rotate-[-1deg]"></div>
          </span>
        </h2>
        
        <div className="w-16 sm:w-20 lg:w-24 h-1 bg-gradient-to-r from-[#CC0000] to-[#CC0000] mx-auto rounded-full mb-4"></div>
        
        <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Immerse yourself in our carefully crafted environments designed to inspire innovation and collaboration
        </p>
      </div>

      {/* Desktop Floor Navigation */}
      <DesktopFloorNav />

      {/* Enhanced Carousel Container - Mobile Optimized */}
      <div className="w-full max-w-6xl mx-auto px-2">
        {/* Enhanced Carousel */}
        <div
          ref={carouselRef}
          className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 xl:h-[500px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl group transition-all duration-300 border border-white/20"
          onMouseEnter={() => setIsPlaying(false)}
          onMouseLeave={() => setIsPlaying(true)}
        >
          {/* Slides */}
          {allSlides.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
                i === index 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-105"
              }`}
            >
              <img
                src={slide.src}
                alt={slide.label}
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              
              {/* Simplified Floor Badge */}
              <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20">
                <div className="bg-gradient-to-r from-[#CC0000] to-[#990000] text-white px-3 py-1 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-lg backdrop-blur-sm">
                  {floors[currentFloorIndex].name}
                </div>
              </div>
            </div>
          ))}

          {/* Simplified Slide Counter */}
          <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-xl text-xs sm:text-sm font-medium shadow-lg">
            {index + 1} / {allSlides.length}
          </div>

          {/* Mobile-optimized Slide Info */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-4 sm:px-6 pb-4 sm:pb-6 pt-12">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-2 sm:mb-3 drop-shadow-lg leading-tight">
                {allSlides[index]?.label}
              </h3>
              <p className="text-xs sm:text-sm lg:text-base text-gray-200 mb-3 sm:mb-4 drop-shadow-lg max-w-2xl leading-relaxed">
                {allSlides[index]?.description}
              </p>
              <div className="flex space-x-1 sm:space-x-2">
                {allSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                      i === index 
                        ? "w-6 sm:w-8 bg-[#CC0000] shadow-md" 
                        : "w-3 sm:w-4 bg-white/50 hover:bg-white/70"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Simplified Control Bar */}
          <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex items-center space-x-2 bg-black/50 backdrop-blur-sm rounded-xl px-3 py-1 z-20 transition-all duration-300 shadow-lg">
            <button
              onClick={togglePlay}
              className="p-1 sm:p-1.5 text-white hover:text-[#CC0000] transition-all duration-300"
              aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
            >
              {isPlaying ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-1 sm:p-1.5 text-white hover:text-[#CC0000] transition-all duration-300"
              aria-label="Enter fullscreen"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>

          {/* Mobile-friendly Navigation Arrows */}
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 backdrop-blur-sm rounded-xl text-white hover:text-[#CC0000] transition-all duration-300 shadow-lg lg:opacity-0 lg:group-hover:opacity-100"
            aria-label="Previous slide"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 backdrop-blur-sm rounded-xl text-white hover:text-[#CC0000] transition-all duration-300 shadow-lg lg:opacity-0 lg:group-hover:opacity-100"
            aria-label="Next slide"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile-friendly bottom spacing */}
      <div className="h-8 sm:h-12 lg:h-16"></div>
    </section>
  );
}

export default Body3;