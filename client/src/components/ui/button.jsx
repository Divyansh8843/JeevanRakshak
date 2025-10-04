import React from "react";

const variants = {
  default: "bg-green-600 text-white hover:bg-green-700",
  outline: "border border-gray-300 text-gray-800 bg-white hover:bg-gray-50",
  ghost: "text-gray-800 hover:bg-gray-100",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4",
  lg: "h-12 px-6 text-lg",
};

export function Button({
  className = "",
  variant = "default",
  size = "md",
  children,
  ...props
}) {
  const variantClass = variants[variant] || variants.default;
  const sizeClass = sizes[size] || sizes.md;
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 disabled:opacity-50 disabled:pointer-events-none ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
