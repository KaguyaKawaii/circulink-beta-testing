// Footer.jsx
import { useState, useEffect } from "react";
import { MapPin, Phone, Mail, ExternalLink, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo2 from '../assets/logo2.png';
import logo3 from '../assets/logo3.png';
import logo from '../assets/logo.png';
import HowToUseModal from './Modals/HowToUseModal';
import DataPrivacyModal from './Modals/DataPrivacyModal';
import TermsConditionsModal from './Modals/TermsConditionsModal';

function Footer() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickLinkClick = (linkName) => {
    switch (linkName) {
      case "How to Use the System":
        setActiveModal('howToUse');
        break;
      case "Data Privacy Notice":
        setActiveModal('dataPrivacy');
        break;
      case "Terms & Conditions":
        setActiveModal('termsConditions');
        break;
      default:
        break;
    }
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <>
      <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/5 via-transparent to-transparent"></div>
        <div className="absolute top-0 left-0 w-64 h-64 sm:w-80 sm:h-80 bg-[#CC0000]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-amber-400/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 mb-12 sm:mb-16 lg:mb-20">
            {/* Brand Section */}
            <div className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-4">
                {/* Logo Container */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
                    <img 
                      src={logo} 
                      alt="CircuLink Logo" 
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                    />
                    <img 
                      src={logo2} 
                      alt="University Logo" 
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                    />
                    <img 
                      src={logo3} 
                      alt="Additional Logo" 
                      className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                    CircuLink
                  </h3>
                  <p className="text-amber-400 text-sm sm:text-base font-medium">
                    University of San Agustin
                  </p>
                </div>
              </div>
              
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-md">
                Modern web-based library room reservation system designed to enhance your academic experience 
                with seamless booking and state-of-the-art facilities.
              </p>
              
             
            </div>

            {/* Contact & Links Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
              {/* Contact Info */}
              <div className="space-y-6 sm:space-y-8">
                <h4 className="text-lg sm:text-xl font-bold text-white border-l-4 border-amber-400 pl-3 sm:pl-4">
                  Get In Touch
                </h4>
                
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-start gap-3 sm:gap-4 group cursor-pointer">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-center group-hover:bg-amber-400/20 transition-all duration-300">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-sm sm:text-base leading-relaxed group-hover:text-white transition-colors duration-300">
                        University of San Agustin<br />
                        General Luna Street, Iloilo City<br />
                        5000 Iloilo, Philippines
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 sm:gap-4 group cursor-pointer">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-center group-hover:bg-amber-400/20 transition-all duration-300">
                      <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-sm sm:text-base leading-relaxed group-hover:text-white transition-colors duration-300">
                        09196518691 / 337-4841 to<br />
                        Local Number (1040)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 sm:gap-4 group cursor-pointer">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-center group-hover:bg-amber-400/20 transition-all duration-300">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-sm sm:text-base leading-relaxed group-hover:text-white transition-colors duration-300">
                        usa.edu.ph<br />
                        lrc@usa.edu.ph
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-6 sm:space-y-8">
                <h4 className="text-lg sm:text-xl font-bold text-white border-l-4 border-[#CC0000] pl-3 sm:pl-4">
                  Quick Links
                </h4>
                
                <div className="space-y-3 sm:space-y-4">
                  {[
                    { name: "How to Use the System", href: "#" },
                    { name: "Data Privacy Notice", href: "#" },
                    { name: "Terms & Conditions", href: "#" }
                  ].map((link, index) => (
                    <div
                      key={index}
                      onClick={() => handleQuickLinkClick(link.name)}
                      className="flex items-center gap-2 text-gray-300 hover:text-amber-400 transition-all duration-300 group cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="text-sm sm:text-base">{link.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 sm:pt-12 border-t border-white/10">
            <div className="flex flex-col items-center gap-4 sm:gap-6">
              <div className="text-center">
                <p className="text-gray-400 text-sm sm:text-base">
                  © 2026 University of San Agustin - CircuLink. All rights reserved.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center">
                <p className="text-gray-400 text-sm sm:text-base">
                  Designed with ♥ for the Augustinian community
                </p>
                <div className="hidden sm:block w-px h-4 bg-gray-600"></div>
                <a
  href="/developers"
  target="_blank"
  rel="noopener noreferrer"
  className="text-gray-400 text-sm sm:text-base hover:text-amber-400 transition-colors duration-300 cursor-pointer"
>
  Developed by <span className="text-amber-400 font-medium hover:underline">BSIT 4A - Group 4</span>
</a>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 hover:shadow-3xl group"
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 transform group-hover:-translate-y-1 transition-transform duration-300" />
          </button>
        )}
      </footer>

      {/* Modals */}
      <HowToUseModal 
        isOpen={activeModal === 'howToUse'} 
        onClose={closeModal} 
      />
      
      <DataPrivacyModal 
        isOpen={activeModal === 'dataPrivacy'} 
        onClose={closeModal} 
      />
      
      <TermsConditionsModal 
        isOpen={activeModal === 'termsConditions'} 
        onClose={closeModal} 
      />
    </>
  );
}

export default Footer;