import { RefreshCw, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import yelan from "../assets/yelanpicture.png";

function MaintenanceScreen({ message, setView }) 
{  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };
  const handleAdminLogin = () => {
    setView("adminLogin");  // Use setView instead of navigate
  };


  return (
    
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6">

        {/* <div className="absolute top-40 right-0 flex">
          <img
            className="w-[40rem] h-[50rem]"
            src={yelan}
            alt="University of San Agustin Logo"
          />
        </div> */}



        

      <div className="max-w-lg w-full text-center space-y-8">
        {/* Animated SVG Icon */}
  

        {/* Main Content */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            System Maintenance in Progress
          </h1>
          
          <div className="text-gray-600 space-y-3 text-lg leading-relaxed">
            <p>
              {message || 
                "We are currently performing essential maintenance to improve your experience. Our technical team is working diligently to complete these updates."}
            </p>
            <p className="text-sm text-gray-500">
              This scheduled maintenance includes security enhancements, performance optimizations, and new feature deployments to serve you better.
            </p>
          </div>
        </div>


        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#CC0000] text-white font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer"
          >
            <RefreshCw size={18} />
            Refresh Status
          </button>

          {/* <button
            onClick={handleAdminLogin}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 cursor-pointer"
          >
            <LogIn size={18} />
            Administrator Access
          </button> */}
        </div>

        {/* Detailed Information */}
        <div className="text-xs text-gray-500 space-y-2 pt-6 border-t border-gray-200">
          
          <p>
            <strong>Impact:</strong> All user-facing services are temporarily unavailable
          </p>
          <p>
            <strong>Administrator note:</strong> System access restricted to authorized personnel only during maintenance window
          </p>
          <p className="pt-2">
            Thank you for your patience and understanding during this necessary maintenance period.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MaintenanceScreen;