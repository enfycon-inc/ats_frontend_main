"use client";

import React from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface EnfyconLogoProps {
  className?: string;
  variant?: "auto" | "light" | "dark";
  width?: number;
  height?: number;
  showBadge?: boolean;
}

export const EnfyconLogo: React.FC<EnfyconLogoProps> = ({
  className,
  variant = "auto",
  width = 180,
  height = 40,
}) => {
  const { theme } = useTheme();
  
  const isDark = variant === "dark" || (variant === "auto" && theme === "dark");

  return (
    <div className={cn("inline-flex items-center group transition-transform duration-200 hover:scale-[1.02]", className)}>
      <Image
        src={isDark ? "/images/logo/logo-white.svg" : "/images/logo/logo.svg"}
        alt="Enfycon ATS Logo"
        width={width}
        height={height}
        className="w-auto h-9 object-contain"
        priority
      />
    </div>
  );
};

export default EnfyconLogo;
