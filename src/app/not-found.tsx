"use client"
import Link from "next/link";
export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white">
      <div className="max-w-md w-full text-center space-y-6">
        
        {/* Animated/Styled Icon Container */}
        <div className="relative w-28 h-28 mx-auto bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100 shadow-inner">
          <svg 
            className="w-12 h-12 text-orange-500 animate-pulse" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
            404
          </span>
        </div>

        {/* Heading & Description */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Oops! Page Not Found
          </h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            It looks like you are looking for a recipe or page that is not on the plate or has been removed.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition-all duration-200"
          >
            Back to Home
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all duration-200"
          >
            Go Back
          </button>
        </div>

      </div>
    </div>
  );
}