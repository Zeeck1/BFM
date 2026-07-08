import bfmLogo from "../assets/images/BFM_logo.png";

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = "h-8 w-8" }: BrandLogoProps) {
  return (
    <img
      src={bfmLogo}
      alt="Buy For Me"
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
