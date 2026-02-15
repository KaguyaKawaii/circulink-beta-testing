// Body4.jsx
import { useState } from "react";
import { BookOpen, Calendar, Phone, ArrowRight, ExternalLink } from "lucide-react";

function Body4() {
  const [activeSection, setActiveSection] = useState(0);

  const sections = [
    {
      icon: BookOpen,
      title: "Getting Started",
      color: "from-[#CC0000] to-[#990000]",
      questions: [
        {
          question: "How do I create an account?",
          answer: "Simply click the Sign Up button and use your university email to register."
        },
        {
          question: "Who can use CircuLink?",
          answer: "All enrolled University of San Agustin students and faculty members with valid university credentials."
        }
      ]
    },
    {
      icon: Calendar,
      title: "Making a Reservation",
      color: "from-[#CC0000] to-[#990000]",
      questions: [
        {
          question: "How often am I allowed to reserve a room each week?",
          answer: "Rooms can be reserved up to 7 days in advance. Users may reserve rooms only twice per week."
        },
        {
          question: "Can I modify or cancel my booking?",
          answer: "Yes, you can modify or cancel your reservation up to 2 hours before your scheduled time through your dashboard."
        }
      ]
    },
    {
      icon: Phone,
      title: "Contact",
      color: "from-[#CC0000] to-[#990000]",
      questions: [
        {
          question: "Need immediate assistance?",
          answer: "Visit the Library Help Desk on the 1st floor or call +63 (33) 337-4841 Local 1414 during operating hours."
        },
        {
          question: "Technical support issues?",
          answer: "Email circuLink@usa.edu.ph for system-related problems. Include your student ID and a description of the issue."
        }
      ]
    }
  ];

  const scrollToAuth = () => {
    const authSection = document.getElementById('auth-section');
    if (authSection) {
      authSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
      {/* Background Elements - Same as original design */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/5 via-transparent to-transparent"></div>
      <div className="absolute top-0 left-0 w-64 h-64 sm:w-80 sm:h-80 bg-[#CC0000]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-amber-400/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-0.5 bg-amber-400 rounded-full"></div>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Quick Help</span>
            <div className="w-6 h-0.5 bg-amber-400 rounded-full"></div>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Frequently Asked
            <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent"> Questions</span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Find quick answers to common questions about using CircuLink for your library room reservations.
          </p>
          
          <div className="w-20 h-1 bg-gradient-to-r from-amber-400 to-amber-600 mx-auto rounded-full mb-8"></div>
        </div>

        {/* Section Navigation - Mobile */}
        <div className="lg:hidden mb-8">
          <div className="flex overflow-x-auto pb-4 space-x-2 scrollbar-hide">
            {sections.map((section, index) => (
              <button
                key={section.title}
                onClick={() => setActiveSection(index)}
                className={`flex-shrink-0 px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm border ${
                  activeSection === index
                    ? `bg-gradient-to-r ${section.color} text-white shadow-lg border-transparent`
                    : "bg-white/5 text-gray-300 shadow-md hover:shadow-lg border-white/10"
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {sections.map((section, sectionIndex) => (
            <div
              key={section.title}
              className={`bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/10 ${
                activeSection !== sectionIndex ? 'lg:block hidden' : 'block'
              }`}
            >
              {/* Section Header */}
              <div className={`bg-gradient-to-r ${section.color} rounded-t-2xl p-6 text-white`}>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <section.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{section.title}</h3>
                    <p className="text-white/80 text-sm mt-1">
                      {section.questions.length} key points
                    </p>
                  </div>
                </div>
              </div>

              {/* Questions & Answers */}
              <div className="p-6 space-y-6">
                {section.questions.map((item, questionIndex) => (
                  <div
                    key={questionIndex}
                    className="group"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${section.color} mt-2 flex-shrink-0`}></div>
                      <div>
                        <h4 className="font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors duration-300">
                          {item.question}
                        </h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                    {questionIndex < section.questions.length - 1 && (
                      <div className="w-full h-px bg-white/10 mt-6"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Section Navigation - Desktop */}
        

        {/* Call to Action */}
        

        {/* Additional Help Link */}
       
      </div>
    </section>
  );
}

export default Body4;