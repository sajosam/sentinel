import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface InfoBadgeProps {
  title: string;
  description: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export const InfoBadge: React.FC<InfoBadgeProps> = ({
  title,
  description,
  align = 'left',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPinned) {
      setIsPinned(false);
      setIsOpen(false);
    } else {
      setIsPinned(true);
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsPinned(false);
    setIsOpen(false);
  };

  return (
    <span
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Info: ${title}`}
        className={`w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[9px] font-bold font-mono transition-all ml-1.5 focus:outline-none flex-shrink-0 cursor-pointer ${
          isOpen || isPinned
            ? 'bg-[#8B7CFF] text-white shadow-sm ring-2 ring-[#8B7CFF]/40'
            : 'bg-[#8B7CFF]/15 text-[#8B7CFF] hover:bg-[#8B7CFF] hover:text-white border border-[#8B7CFF]/30'
        }`}
        title={`${title}: ${description}`}
      >
        i
      </button>

      {isOpen && (
        <>
          {isPinned && (
            <span
              className="fixed inset-0 z-40 bg-transparent cursor-default"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
            />
          )}
          <span
            className={`absolute ${
              align === 'right'
                ? 'right-0'
                : align === 'center'
                ? 'left-1/2 -translate-x-1/2'
                : 'left-0'
            } top-full mt-1.5 z-50 w-72 sm:w-80 p-3 rounded-xl bg-[#0B1020] border border-[#8B7CFF]/60 text-xs text-[#E8ECF5] shadow-2xl normal-case font-normal pointer-events-auto block animate-in fade-in zoom-in-95 duration-150`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex items-center justify-between pb-1.5 border-b border-[#283149] mb-1.5 font-semibold text-[#8B7CFF] text-[11px] tracking-wide">
              <span>{title}</span>
              <button
                type="button"
                onClick={handleClose}
                className="text-[#9AA6BF] hover:text-white p-0.5 rounded transition-colors"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
            <span className="text-[11px] text-[#9AA6BF] leading-relaxed block font-normal text-left">
              {description}
            </span>
          </span>
        </>
      )}
    </span>
  );
};

