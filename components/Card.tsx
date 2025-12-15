import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = "", hoverEffect = true }) => {
  return (
    <div className={`bg-custom-card border border-custom-border rounded-xl p-6 transition-all duration-300 ${hoverEffect ? 'hover:border-custom-accent/50 hover:bg-zinc-800' : ''} ${className}`}>
      {children}
    </div>
  );
};

export default Card;