import React from 'react';
import { ArrowLeft } from 'lucide-react';
import bgImage from '../../images/BG.png';

const ExploreCoursesComingSoon = ({ onBack }) => {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#2148c0]">
      <div className="absolute inset-0 w-full h-full">
        <img alt="" className="absolute block w-full h-full object-cover object-center" src={bgImage} />
      </div>

      <div className="relative z-10 flex items-center justify-between px-[38px] pt-[26px]">
        <p
          className="font-bold leading-normal text-[36px] text-white tracking-[-0.2927px] whitespace-nowrap"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          AcadeMatt
        </p>
        <button
          onClick={onBack}
          className="bg-white px-[18px] py-[9px] rounded-[40px] hover:bg-gray-100 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 text-[#000347]" />
          <span
            className="font-bold leading-[1.587] text-[#000347] text-[14px] tracking-[-0.42px] whitespace-nowrap"
            style={{ fontFamily: "'Source Sans 3', sans-serif" }}
          >
            Back
          </span>
        </button>
      </div>

      <div className="relative z-10 h-[calc(100%-90px)] flex items-center justify-center px-4">
        <div className="text-center">
          <h1
            className="font-bold leading-[1.2] text-[64px] text-white tracking-[-1.5px]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Coming Soon...
          </h1>
          <p
            className="mt-4 text-white/90 text-[20px]"
            style={{ fontFamily: "'Source Sans 3', sans-serif" }}
          >
            We are preparing this feature for you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExploreCoursesComingSoon;
