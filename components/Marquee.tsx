import React from 'react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#050505]">
      {/* Subtle spotlight effects */}
      <div className="absolute top-[-10%] left-[20%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[150px]"></div>
      <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[150px]"></div>
      
      {/* Noise overlay for texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay"></div>
    </div>
  );
};