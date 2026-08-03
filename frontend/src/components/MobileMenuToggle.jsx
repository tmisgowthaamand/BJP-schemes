import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

/**
 * Mobile Menu Toggle Component
 * Provides a floating action button to toggle sidebar on mobile/tablet devices
 * Automatically hidden on desktop screens via CSS
 */
const MobileMenuToggle = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Toggle menu state
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu when clicking overlay
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Add/remove body class for styling
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('mobile-menu-active');
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('mobile-menu-active');
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('mobile-menu-active');
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Close menu on ESC key
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isMenuOpen) {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isMenuOpen]);

  // Close menu when screen size increases (user rotates device or resizes)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMenuOpen) {
        closeMenu();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen]);

  return (
    <>
      {/* Floating Menu Toggle Button */}
      <button
        className="mobile-menu-toggle"
        onClick={toggleMenu}
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
        style={{
          display: 'flex',
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 999,
          background: 'var(--theme-accent-gradient)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px var(--theme-accent-glow)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay - click to close menu */}
      {isMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={closeMenu}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 998,
            opacity: 1,
            transition: 'opacity 0.3s ease',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}
    </>
  );
};

export default MobileMenuToggle;
