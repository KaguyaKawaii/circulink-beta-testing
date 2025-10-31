// src/Homepage/Links/Developers.jsx
import { useState } from "react";
import { Github, Mail, ExternalLink, Code, Palette, FileText, Users, X, Star, Award, Zap, Calendar, MapPin, BookOpen, Heart } from "lucide-react";

// Import images
import PatrickImage from "../../assets/Profile/image1.png";
import SuheilaImage from "../../assets/Profile/image2.png";
import LouisImage from "../../assets/Profile/image3.png";
import StephenImage from "../../assets/Profile/image4.png";

function Developers() {
  const [activeMember, setActiveMember] = useState(null);

  const teamMembers = [
    {
      id: 1,
      name: "Stephen Madero Jr.",
      role: "Lead Developer",
      icon: Code,
      image: StephenImage,
      description: "I'm an aspiring Full-stack Developer currently learning React and Node.js. I'm passionate about building clean, responsive, and user-friendly applications.",
      bio: "Stephen is an aspiring web developer currently learning how to build modern, scalable applications using React and Node.js. He enjoys exploring new technologies and improving his coding skills.",
      skills: ["React", "Node.js", "MongoDB", "Express", "TypeScript", "JavaScript"],
      github: "https://github.com/KaguyaKawaii",
      email: "mailto:stephenpatingomadero@gmail.com",
      portfolio: "https://portfolio-kaguya-kawaii.vercel.app/",
      joinDate: "2021",
      location: "secret po",
    },
    {
      id: 2,
      name: "Louis Miguel Parenno",
      role: "UI/UX Designer",
      icon: Palette,
      image: LouisImage,
      description: "Creative designer focused on user experience and interface design. Ensures the application is intuitive and visually appealing.",
      bio: "Louis brings designs to life with a user-centered approach, having worked on multiple digital products across various industries.",
      skills: ["Figma", "UI/UX Design", "Prototyping", "User Research", "Wireframing"],
      github: "#",
      email: "#",
      portfolio: "",
      joinDate: "No Record*",
      location: "No Record*",
    },
    {
      id: 3,
      name: "Suheila Belle Morales",
      role: "Documentation Specialist",
      icon: FileText,
      image: SuheilaImage,
      description: "Technical writer and documentation expert. Creates comprehensive user guides and system documentation.",
      bio: "Suheila transforms complex technical concepts into clear, accessible documentation that empowers users and developers alike.",
      skills: ["Technical Writing", "Documentation", "User Manuals", "API Docs", "Markdown"],
      github: "",
      email: "",
      portfolio: "",
      joinDate: "No Record*",
      location: "No Record*",
    },
    {
      id: 4,
      name: "Patrick Miguel Andrade",
      role: "Project Manager",
      icon: Users,
      image: PatrickImage,
      description: "Project coordinator ensuring timely delivery and team collaboration. Manages project timelines and stakeholder communication.",
      bio: "Patrick excels at bringing order to complex projects and ensuring teams work together efficiently.",
      skills: ["Agile Methodology", "Project Planning", "Team Coordination", "Risk Management", "Scrum"],
      github: "",
      email: "",
      portfolio: "",
      joinDate: "No Record*",
      location: "No Record*",
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-4 sm:py-6 md:py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 sm:mb-10 md:mb-12 lg:mb-16 text-center">
          <div className="inline-flex items-center gap-1 sm:gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 mb-4 sm:mb-6 border border-red-900/50">
            <Award className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-red-500" />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
              BSIT 4A - Group 4
            </span>
            <Star className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-red-500" />
          </div>
          
          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 px-2">
            Meet Our <span className="text-red-500">Team</span>
          </h1>
          <p className="text-sm xs:text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed px-4">
            The passionate developers behind <span className="font-semibold text-red-500">CircuLink</span> - 
            creating innovative solutions for the Augustinian community.
          </p>
        </div>

        {/* Team Grid - Fully Responsive */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-8 sm:mb-10 md:mb-12 lg:mb-16">
          {teamMembers.map((member) => {
            const IconComponent = member.icon;
            return (
              <div
                key={member.id}
                className="group bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 sm:hover:-translate-y-2 cursor-pointer border border-gray-700/50 hover:border-red-500/30 overflow-hidden"
                onClick={() => setActiveMember(member)}
              >
                {/* Profile Image */}
                <div className="relative h-[10rem] xs:h-[11rem] sm:h-[12rem] md:h-[13rem] lg:h-[14rem] xl:h-[15rem] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="w-16 h-16 xs:w-18 xs:h-18 sm:w-20 sm:h-20 md:w-22 md:h-22 lg:w-24 lg:h-24 rounded-full bg-gradient-to-r from-red-500 to-red-700 p-0.5 sm:p-1 shadow-2xl transform group-hover:scale-105 sm:group-hover:scale-110 transition-transform duration-300">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full rounded-full object-cover border border-gray-900"
                    />
                  </div>
                  <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 md:bottom-4 md:right-4 bg-gray-900 rounded-full p-1.5 sm:p-2 shadow-lg border border-gray-700">
                    <div className="bg-red-500/20 rounded-full p-1 sm:p-1.5">
                      <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-red-400" />
                    </div>
                  </div>
                </div>
                
                {/* Profile Content */}
                <div className="p-3 sm:p-4 md:p-5 lg:p-6 text-center">
                  <h3 className="font-bold text-white text-base sm:text-lg md:text-xl mb-1 sm:mb-2 line-clamp-1">
                    {member.name}
                  </h3>
                  <p className="text-red-400 font-semibold text-xs sm:text-sm mb-2 sm:mb-3 bg-red-500/10 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full inline-block border border-red-500/20">
                    {member.role}
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed line-clamp-2 xs:line-clamp-3 mb-3 sm:mb-4">
                    {member.description}
                  </p>
                  
                  {/* Skills */}
                  <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
                    {member.skills.slice(0, 2).map((skill, index) => (
                      <span
                        key={index}
                        className="bg-gray-700/50 text-gray-300 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 border border-gray-600/50"
                      >
                        {skill}
                      </span>
                    ))}
                    {member.skills.length > 2 && (
                      <span className="bg-gray-700/50 text-gray-400 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium border border-gray-600/50">
                        +{member.skills.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mission Section - Responsive */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8 mb-6 sm:mb-8 md:mb-10 lg:mb-12 border border-gray-700/50">
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-red-500/20 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-5 lg:mb-6 border border-red-500/30">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-red-400" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-3 sm:mb-4 px-2">
              Our Mission at <span className="text-red-500">CircuLink</span>
            </h2>
            <p className="text-gray-400 leading-relaxed mb-4 sm:mb-5 md:mb-6 lg:mb-8 text-xs sm:text-sm md:text-base px-2">
              As fourth-year BS Information Technology students from the prestigious University of San Agustin, 
              we are committed to solving real-world challenges through innovative technology. CircuLink represents 
              our dedication to enhancing the library experience for the Augustinian community.
            </p>
            
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
              {[
                { icon: Code, title: "Innovation", description: "Cutting-edge solutions" },
                { icon: Users, title: "Collaboration", description: "Teamwork driven" },
                { icon: Award, title: "Excellence", description: "Quality focused" }
              ].map((item, index) => (
                <div key={index} className="text-center bg-gray-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 border border-gray-700/50 hover:border-red-500/30 transition-colors duration-300">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 bg-red-500/20 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4 border border-red-500/30">
                    <item.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 lg:w-6 lg:h-6 text-red-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm sm:text-base md:text-lg mb-1 sm:mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Responsive Modal */}
        {activeMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 xs:p-3 sm:p-4">
            {/* Background Overlay */}
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setActiveMember(null)}
            />
            
            {/* Modal Content - Fully Responsive */}
            <div className="relative bg-gray-900 rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl w-full max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl border border-gray-700 mx-auto my-auto max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setActiveMember(null)}
                className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 z-10 bg-gray-800 hover:bg-red-500 text-gray-400 hover:text-white rounded-lg sm:rounded-xl p-1.5 sm:p-2 transition-all duration-200 shadow-lg border border-gray-700"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                {/* Responsive Profile Image */}
                <div className="flex flex-col items-center mb-4 sm:mb-5 md:mb-6">
                  <div className="w-28 h-28 xs:w-32 xs:h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-44 lg:h-44 xl:w-48 xl:h-48 rounded-full bg-gradient-to-r from-red-500 to-red-700 p-2 sm:p-2.5 md:p-3 shadow-2xl mb-4 sm:mb-5 md:mb-6">
                    <img
                      src={activeMember.image}
                      alt={activeMember.name}
                      className="w-full h-full rounded-full object-cover border-2 sm:border-3 md:border-4 border-gray-900"
                    />
                  </div>
                  
                  <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-1 sm:mb-2 px-2">
                    {activeMember.name}
                  </h2>
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <activeMember.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-400" />
                    <span className="font-semibold text-red-400 text-lg sm:text-xl md:text-2xl">
                      {activeMember.role}
                    </span>
                  </div>
                </div>

                {/* Simple Details - Responsive */}
                <div className="space-y-2 sm:space-y-3 md:space-y-4 mb-4 sm:mb-5 md:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 text-gray-300 text-sm sm:text-base">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />
                    <span className="break-words">{activeMember.location}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-gray-300 text-sm sm:text-base">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />
                    <span>Member since {activeMember.joinDate}</span>
                  </div>
                </div>

                {/* Bio - Responsive */}
                <div className="mb-4 sm:mb-5 md:mb-6">
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                    About
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                    {activeMember.bio}
                  </p>
                </div>

                {/* Responsive Skills */}
                <div className="mb-4 sm:mb-5 md:mb-6">
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {activeMember.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-red-500/20 text-red-300 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm border border-red-500/30"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Responsive Contact */}
                <div className="flex justify-center space-x-2 sm:space-x-3 md:space-x-4 pt-3 sm:pt-4 border-t border-gray-700">
                  {[
                    { icon: Github, href: activeMember.github, label: "GitHub" },
                    { icon: Mail, href: `mailto:${activeMember.email}`, label: "Email" },
                    { icon: ExternalLink, href: activeMember.portfolio, label: "Portfolio" }
                  ].map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-800 hover:bg-red-500 text-gray-400 hover:text-white rounded-lg sm:rounded-xl p-2 sm:p-3 transition-all duration-200 shadow-lg border border-gray-700 hover:border-red-500 flex items-center justify-center"
                      title={social.label}
                    >
                      <social.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Developers;