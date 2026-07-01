"use client";

import React from "react";

export function BackgroundShaders() {
  return (
    <div aria-hidden="true" className="absolute inset-0 z-0 bg-white overflow-hidden select-none pointer-events-none">
      {/* Moving Gray and Zinc Liquid Orbs with SVG Refraction */}
      <div 
        className="absolute inset-0 opacity-35"
        style={{ filter: "blur(80px) url(#liquid-refract)" }}
      >
        {/* Dark slate shape moving on the right */}
        <div 
          className="absolute right-[-10%] top-[-15%] w-[60%] h-[75%] rounded-[40%] bg-zinc-950"
          style={{ animation: "float-one 22s infinite ease-in-out" }}
        />
        {/* Soft medium gray shape moving in the center */}
        <div 
          className="absolute left-[15%] bottom-[-10%] w-[55%] h-[70%] rounded-[50%] bg-zinc-600"
          style={{ animation: "float-two 28s infinite ease-in-out" }}
        />
        {/* Muted dark slate shape moving on the left */}
        <div 
          className="absolute left-[-15%] top-[15%] w-[50%] h-[65%] rounded-[30%] bg-zinc-800"
          style={{ animation: "float-three 20s infinite ease-in-out" }}
        />
      </div>

      {/* SVG liquid distortion filter */}
      <svg xmlns="http://www.w3.org/2000/svg" className="absolute w-0 h-0 pointer-events-none">
        <defs>
          <filter id="liquid-refract" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.004" numOctaves="3" result="noise" seed="3" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="140" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Noise / Paper Texture Shader Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.018] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='noiseFilter'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23noiseFilter)'/></svg>")`
        }}
      />
    </div>
  );
}
