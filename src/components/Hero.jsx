import React, { useState } from 'react';
import ReviewsPanel from './ReviewsPanel';
import ExploreCoursesComingSoon from './ExploreCoursesComingSoon';
import bgImage from '../../images/BG.png';

const Hero = ({ onStartConsultation }) => {
  const [showReviews, setShowReviews] = useState(false);
  const [showExploreCourses, setShowExploreCourses] = useState(false);

  if (showExploreCourses) {
    return <ExploreCoursesComingSoon onBack={() => setShowExploreCourses(false)} />;
  }

  return (
    <>
      <div className="relative w-full h-screen overflow-hidden bg-[#2148c0]">

        {/* Background blob image */}
        <div className="absolute inset-0 w-full h-full">
          <img alt="" className="absolute block w-full h-full object-cover object-center" src={bgImage} />
        </div>

        {/* Nav bar */}
        <div className="relative z-10 flex items-center justify-between px-[38px] pt-[26px]">
          <p className="font-bold leading-normal text-[36px] text-white tracking-[-0.2927px] whitespace-nowrap" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            AcadeMatt
          </p>
          <button
            onClick={onStartConsultation}
            className="bg-white px-[18px] py-[9px] rounded-[40px] hover:bg-gray-100 transition-colors"
          >
            <span className="font-bold leading-[1.587] text-[#000347] text-[14px] tracking-[-0.42px] whitespace-nowrap" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
              Sign In
            </span>
          </button>
        </div>

        {/* Centered content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-[calc(100%-80px)] gap-6 px-4">

          {/* Headline */}
          <p
            className="font-bold leading-[1.267] text-[66px] text-center text-white tracking-[-1.98px] max-w-[823px]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Back to Basics.
          </p>

          {/* Subtitle */}
          <p
            className="font-normal leading-[1.587] text-[20px] text-center text-white tracking-[-0.6px] max-w-[710px]"
            style={{ fontFamily: "'Source Sans 3', sans-serif" }}
          >
            Making the toughest subjects easy to understand.
          </p>

          {/* CTA buttons */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={onStartConsultation}
              className="bg-white px-[19px] py-[11px] rounded-[40px] hover:bg-gray-100 transition-colors"
            >
              <span className="font-bold leading-[1.587] text-[#000347] text-[15px] tracking-[-0.45px] whitespace-nowrap" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                Book Your First Session
              </span>
            </button>
            <button
              onClick={() => setShowReviews(true)}
              className="border-2 border-solid border-white px-[19px] py-[11px] rounded-[40px] hover:bg-white/10 transition-colors"
            >
              <span className="font-bold leading-[1.587] text-[15px] text-white tracking-[-0.45px] whitespace-nowrap" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                Reviews
              </span>
            </button>
            <button
              onClick={() => setShowExploreCourses(true)}
              className="border-2 border-solid border-white px-[19px] py-[11px] rounded-[40px] hover:bg-white/10 transition-colors"
            >
              <span className="font-bold leading-[1.587] text-[15px] text-white tracking-[-0.45px] whitespace-nowrap" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                Explore Course
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


