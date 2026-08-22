import React from "react";
import logo from "../assets/EliteStocksTV.svg";

interface LogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export function Logo({ className, width, height }: LogoProps) {
  return (
    <img
      src={logo}
      alt="EliteStocks TV"
      className={className}
      width={width}
      height={height}
    />
  );
}
