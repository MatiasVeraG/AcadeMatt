import React, { useState } from 'react';
import ReviewsPanel from './ReviewsPanel';
import bgImage from '../../images/BG.png';

const Hero = ({ onStartConsultation }) => {
  const [showReviews, setShowReviews] = useState(false);

  return (
    <>
      <div className="bg-white relative w-full h-[800px] overflow-hidden">
        <div className="absolute bg-[#2148c0] h-[900px] left-0 overflow-hidden top-0 w-full">

          {/* Background blob image */}
          <div className="absolute left-0 top-[-1.5px] w-full h-[1352.622px]">
            <img alt="" className="absolute block w-full h-full object-cover object-center" src={bgImage} />
          </div>

          {/* Sign In button */}
          <button
            onClick={onStartConsultation}
            className="absolute bg-white flex items-start right-[42px] px-[18px] py-[9px] rounded-[40px] top-[26px] hover:bg-gray-100 transition-colors"
          >
            <span className="font-bold leading-[1.587] text-[#000347] text-[14px] text-right tracking-[-0.42px] whitespace-nowrap" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
              Sign In
            </span>
          </button>

          {/* Logo */}
          <div className="absolute flex items-center justify-center left-[38px] top-[27px]">
            <p className="font-bold leading-normal text-[36px] text-center text-white tracking-[-0.2927px] whitespace-nowrap" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              AcadeMatt
            </p>
          </div>

          {/* Headline */}
          <p className="absolute font-bold leading-[1.267] text-[66px] text-center text-white tracking-[-1.98px] w-[823px]"
            style={{
              fontFamily: "'Poppins', sans-serif",
              left: '50%',
              transform: 'translateX(-50%)',
              top: '273px',
            }}
          >
            Your academic success is just a chat away
          </p>

          {/* Subtitle */}
          <div
            className="absolute font-normal leading-[1.587] text-[20px] text-center text-white tracking-[-0.6px] w-[710px]"
            style={{
              fontFamily: "'Source Sans 3', sans-serif",
              left: '50%',
              transform: 'translateX(-50%)',
              top: '447px',
            }}
          >
            <p>Connect with academic experts in real time. Get personalized help for your projects, assignments, and academic questions.</p>
          </div>

          {/* CTA buttons */}
          <div
            className="absolute flex items-center gap-4"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              top: '557px',
            }}
          >
            <button
              onClick={onStartConsultation}
              className="bg-white flex items-start px-[19px] py-[11px] rounded-[40px] hover:bg-gray-100 transition-colors"
            >
              <span className="font-bold leading-[1.587] text-[#000347] text-[15px] tracking-[-0.45px] whitespace-nowrap" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                Get Help Now
              </span>
            </button>
            <button
              onClick={() => setShowReviews(true)}
              className="border-2 border-solid border-white flex items-start px-[19px] py-[11px] rounded-[40px] hover:bg-white/10 transition-colors"
            >
              <span className="font-bold leading-[1.587] text-[15px] text-white tracking-[-0.45px] whitespace-nowrap" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                Reviews
              </span>
            </button>
          </div>

        </div>
      </div>

      {showReviews && <ReviewsPanel onClose={() => setShowReviews(false)} />}
    </>
  );
};

export default Hero;

