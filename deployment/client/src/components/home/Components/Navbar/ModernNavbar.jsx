import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Link as ScrollLink } from 'react-scroll';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserGraduate, FaUniversity, FaSearch, FaUserTie, FaBars, FaTimes, FaChevronDown } from 'react-icons/fa';
import Logo from '../../assets/Final.png';
import './ModernNavbar.css';

const ModernNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Check for scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 10);
    };

    // Initial check
    handleScroll();

    // Add event listener
    window.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.navbar-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);
  
  const navbarVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  
  const linkVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } }
  };
  
  const mobileMenuVariants = {
    closed: { opacity: 0, x: "100%" },
    open: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
  };

  const navItems = [
    { title: "Home", path: "home", icon: null, scroll: true },
    { title: "About", path: "about", icon: null, scroll: true },
    { title: "Contact", path: "contact", icon: null, scroll: true },
    { title: "Verify Certificate", path: "/verify", icon: <FaSearch />, scroll: false },
    { title: "Student Login", path: "/student/login", icon: <FaUserGraduate />, scroll: false },
    { title: "Institution Login", path: "/login", icon: <FaUniversity />, scroll: false },
    { title: "Verifier Login", path: "/verifier-login", icon: <FaUserTie />, scroll: false }
  ];

  return (
    <motion.nav 
      className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}
      initial="hidden"
      animate="visible"
      variants={navbarVariants}
    >
      <div className="container navbar-container">
        <div className="navbar-brand">
          <Link to="/">
            <motion.img 
              src={Logo} 
              alt="SuperCert Logo" 
              className="navbar-logo"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            />
          </Link>
        </div>
        
        <div className="navbar-desktop">
          {navItems.slice(0, 4).map((item, index) => (
            item.scroll ? (
              <motion.div 
                key={index} 
                className="navbar-item"
                whileHover="hover"
                variants={linkVariants}
              >
                <ScrollLink 
                  to={item.path} 
                  smooth={true} 
                  duration={500} 
                  offset={-70}
                  className="navbar-link"
                >
                  {item.icon && <span className="nav-icon">{item.icon}</span>}
                  {item.title}
                </ScrollLink>
              </motion.div>
            ) : (
        <motion.div 
                key={index} 
                className="navbar-item"
                whileHover="hover"
                variants={linkVariants}
              >
                <Link to={item.path} className="navbar-link">
                  {item.icon && <span className="nav-icon">{item.icon}</span>}
                  {item.title}
                </Link>
              </motion.div>
            )
          ))}
          
          <div className="navbar-dropdown">
            <motion.button 
              className="dropdown-toggle"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              Login <FaChevronDown className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`} />
            </motion.button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div 
                  className="dropdown-menu show"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link to="/login" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <span className="nav-icon"><FaUniversity /></span>
                    Admin Login
                  </Link>
                  <Link to="/verifier-login" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <span className="nav-icon"><FaUserTie /></span>
                    Verifier Login
                  </Link>
        </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <motion.div 
          className="navbar-mobile-toggle"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </motion.div>
        
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              className="navbar-mobile"
              initial="closed"
              animate="open"
              exit="closed"
              variants={mobileMenuVariants}
            >
              {navItems.map((item, index) => (
                item.scroll ? (
                  <motion.div 
                    key={index}
                    className="navbar-mobile-item"
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
            <ScrollLink 
                      to={item.path} 
              smooth={true} 
              duration={500} 
                      offset={-70}
                      className="navbar-mobile-link"
            >
                      {item.icon && <span className="nav-icon">{item.icon}</span>}
                      {item.title}
            </ScrollLink>
                  </motion.div>
                ) : (
                  <motion.div 
                    key={index}
                    className="navbar-mobile-item"
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to={item.path} className="navbar-mobile-link">
                      {item.icon && <span className="nav-icon">{item.icon}</span>}
                      {item.title}
                    </Link>
                  </motion.div>
                )
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default ModernNavbar;