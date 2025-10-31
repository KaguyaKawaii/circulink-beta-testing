// Body5.jsx
import { useState } from "react";
import { Clock, Calendar, Sun, Moon, Coffee } from "lucide-react";

function Body5() {
  const [activeTerm, setActiveTerm] = useState(0);

  const serviceHours = [
    {
      icon: Sun,
      title: "Regular Semester",
      color: "from-[#CC0000] to-[#990000]",
      period: "During regular academic semesters",
      hours: [
        { days: "Monday to Friday", time: "7:30 AM to 7:00 PM" },
        { days: "Saturday", time: "7:30 AM to 5:00 PM" },
        { days: "Sunday", time: "Closed" }
      ]
    },
    {
      icon: Coffee,
      title: "Summer Term",
      color: "from-[#CC0000] to-[#990000]",
      period: "Summer and special terms",
      hours: [
        { days: "Monday to Friday", time: "7:30 AM to 6:30 PM" },
        { days: "Saturday", time: "7:30 AM to 5:00 PM" },
        { days: "Sunday", time: "Closed" }
      ]
    },
    {
      icon: Moon,
      title: "Semestral Break",
      color: "from-[#CC0000] to-[#990000]",
      period: "Between academic semesters",
      hours: [
        { days: "Monday to Friday", time: "7:30 AM to 11:30 AM & 1:30 PM to 5:00 PM" },
        { days: "Saturday", time: "7:30 AM to 12:00 PM" },
        { days: "Sunday", time: "Closed" }
      ]
    }
  ];

  return (
    <section className="relative bg-gradient-to-br from-white via-[#fefefe] to-[#f5f5f5] min-h-screen text-gray-800 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-60 lg:h-60 bg-[#CC0000]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 sm:w-64 sm:h-64 lg:w-80 lg:h-80 bg-amber-400/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
      
      <div className="max-w-6xl mx-auto space-y-16 sm:space-y-20 lg:space-y-24 relative z-10">
        {/* Header Section */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-0.5 bg-[#CC0000] rounded-full"></div>
            <span className="text-xs font-semibold text-[#CC0000] uppercase tracking-wider">Service Hours</span>
            <div className="w-6 h-0.5 bg-[#CC0000] rounded-full"></div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            LRC <span className="text-[#CC0000]">Service Hours</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Plan your visits with our comprehensive schedule of operating hours throughout the academic year.
          </p>
          
          <div className="w-24 h-1 bg-gradient-to-r from-[#CC0000] to-amber-400 mx-auto rounded-full mb-8"></div>
        </div>

        {/* Term Navigation - Mobile & Tablet Only */}
        <div className="lg:hidden mb-8">
          <div className="flex overflow-x-auto pb-4 space-x-3 scrollbar-hide">
            {serviceHours.map((term, index) => (
              <button
                key={term.title}
                onClick={() => setActiveTerm(index)}
                className={`flex-shrink-0 px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm border ${
                  activeTerm === index
                    ? `bg-gradient-to-r ${term.color} text-white shadow-lg border-transparent`
                    : "bg-white/80 text-gray-700 shadow-md hover:shadow-lg border-gray-200"
                }`}
              >
                {term.title}
              </button>
            ))}
          </div>
        </div>

        {/* Service Hours Grid */}
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {serviceHours.map((term, termIndex) => (
            <div
              key={term.title}
              className={`group relative bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 lg:hover:-translate-y-2 border border-gray-100 ${
                activeTerm !== termIndex ? 'lg:block hidden' : 'block'
              }`}
            >
              
              
              <div className="h-1 w-12 sm:w-16 bg-gradient-to-r from-[#CC0000] to-amber-400 mb-4 sm:mb-6 rounded-full"></div>

              {/* Service Hours List */}
              <div className="space-y-4 sm:space-y-5">
                {term.hours.map((schedule, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 group/item"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#CC0000] mt-2 flex-shrink-0 group-hover/item:bg-amber-400 transition-colors duration-300"></div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                        {schedule.days}
                      </h3>
                      <p className="text-gray-600 text-sm sm:text-base mt-1">
                        {schedule.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Gradient Line */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#CC0000]/20 to-transparent group-hover:via-[#CC0000]/40 transition-all duration-500"></div>
            </div>
          ))}
        </div>

        {/* Term Navigation - Desktop (Hidden) */}
        <div className="hidden">
          <div className="flex justify-center space-x-4">
            {serviceHours.map((term, index) => (
              <button
                key={term.title}
                onClick={() => setActiveTerm(index)}
                className={`px-8 py-4 rounded-2xl font-semibold transition-all duration-300 backdrop-blur-sm border-2 ${
                  activeTerm === index
                    ? `bg-gradient-to-r ${term.color} text-white shadow-xl border-transparent transform scale-105`
                    : "bg-white/80 text-gray-700 shadow-lg hover:shadow-xl border-gray-200 hover:border-[#CC0000]/30 hover:scale-105"
                }`}
              >
                {term.title}
              </button>
            ))}
          </div>
        </div>

        {/* Additional Information */}
        <div className="text-center max-w-4xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 sm:p-8 shadow-lg">
            <div className="flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-amber-600 mr-3" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                Important Reminders
              </h3>
            </div>
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
              Service hours may vary during holidays, university events, or unforeseen circumstances. 
              Please check our official announcements for any schedule changes. 
              Last entry is 30 minutes before closing time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Body5;