import Image from "next/image";
import React from "react";

interface LogoProps {
  /** Height of the logo in pixels (default: 40) */
  height?: number;
  /** Font size for the letters (default: 32) */
  fontSize?: number;
  /** Icon size for the lightning (default: 20) */
  iconSize?: number;
  /** Additional className for the wrapper div */
  className?: string;
}

export const LogoLongform: React.FC<LogoProps> = ({
  height = 40,
  fontSize = 32,
  iconSize = 20,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-1 ${className}`} style={{ height }}>
      {"C".split("").map((letter, index) => (
        <h1
          key={`connect-letter-${index}`}
          className={
            "border-2 border-black bg-white px-1 font-bold text-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          }
          style={{ fontSize }}
        >
          {"Connect"}
        </h1>
      ))}
      {/* <h1
        className="border-2 border-black bg-white px-1 font-bold text-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        style={{ fontSize }}
      >
        C
      </h1>      */}
      <h1
        className="border-2 border-black bg-white px-1 font-bold text-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        style={{ fontSize }}
      >
        <Image
          src="/lightning.svg"
          alt="Lightning"
          width={iconSize}
          height={iconSize}
          className="inline-block"
        />
      </h1>
      {"S".split("").map((letter, index) => (
        <h1
          key={`connect-letter-${index}`}
          className={
            "border-2 border-black bg-white px-1 font-bold text-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          }
          style={{ fontSize }}
        >
          {"Signull"}
        </h1>
      ))}
    </div>
  );
};
