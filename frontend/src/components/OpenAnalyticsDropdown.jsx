import React, { useState, useEffect, useRef } from 'react';
import './open_analytics_dropdown.css'; // Assuming you have a CSS file for styling
export default function OpenAnalyticsDropdown({
  buttonLabel = 'Open Analytics',
  buttonClassName = '',
  onSelect,
  menuItems = [
    { label: 'Bar Chart', path: '/dashboard/analytics/barchart', icon: '📊' },
    { label: 'Pie Chart', path: '/dashboard/analytics/piechart', icon: '🥧' },
    { label: 'Linear Regression', path: '/dashboard/analytics/regression', icon: '📈' },
  ],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const firstItemRef = useRef(null);
  const lastItemRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    const handleKeyDown = (event) => {
      if (!isOpen) {
        if (event.key === 'ArrowDown' || event.key === 'Enter') {
          event.preventDefault();
          setIsOpen(true);
          setTimeout(() => firstItemRef.current?.focus(), 0);
        }
        return;
      }

      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (activeIndex < menuItems.length - 1) {
          setActiveIndex(prev => prev + 1);
        } else {
          setActiveIndex(0);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (activeIndex > 0) {
          setActiveIndex(prev => prev - 1);
        } else {
          setActiveIndex(menuItems.length - 1);
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (activeIndex >= 0) {
          const item = menuItems[activeIndex];
          if (item.onClick) item.onClick(item);
          else if (item.path) onSelect?.(item.path, item);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, activeIndex, menuItems]);

  // Focus management when menu opens
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(-1);
      setTimeout(() => firstItemRef.current?.focus(), 0);
    }
  }, [isOpen]);

  return (
    <div className="dropdown-container relative">
      <button
        ref={triggerRef}
        type="button"
        className={`dropdown-trigger ${buttonClassName}`.trim()}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {buttonLabel}
        <span className={`arrow ${isOpen ? 'rotated' : ''}`}>▼</span>
      </button>

      <ul
        ref={menuRef}
        className={`dropdown-menu ${isOpen ? 'visible' : 'hidden'}`}
        role="menu"
        aria-label={buttonLabel}
      >
        {menuItems.map((item, index) => (
          <li
            key={index}
            className={`dropdown-item 
              ${activeIndex === index ? 'active' : ''} 
              ${item.path ? 'clickable' : ''}`}
            role="menuitem"
            tabIndex={activeIndex === index ? 0 : -1}
            onClick={() => {
              if (item.onClick) item.onClick(item);
              else if (item.path) onSelect?.(item.path, item);
              setIsOpen(false);
              setActiveIndex(-1);
            }}
            onMouseEnter={() => setActiveIndex(index)}
            ref={index === 0 ? firstItemRef : index === menuItems.length - 1 ? lastItemRef : null}
          >
            {item.icon && <span className="icon">{item.icon}</span>}
            <span className="label">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
