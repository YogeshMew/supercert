import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHome, FaShieldAlt } from 'react-icons/fa';
import logo from '../../components/home/assets/Final.png';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const isGuest = location.pathname.startsWith('/guest');
  const isVerifier = location.pathname.startsWith('/verifier');

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <nav className={`navbar navbar-expand-lg p-3 ${scrolled ? 'shadow-md bg-white' : ''}`} 
           style={{ 
             transition: 'all 0.3s ease',
             backgroundColor: scrolled ? 'white' : 'var(--background-light)'
           }}>
        <div className="container">
          <motion.a 
            className="navbar-brand d-flex align-items-center" 
            href="/"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <img src={logo} alt="SuperCert Logo" className="me-2" style={{ width: '40px', height: 'auto' }} />
            <span className="fw-bold fs-4 text-primary">SUPERCERT</span>
          </motion.a>
          
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <motion.a 
                  className="nav-link d-flex align-items-center" 
                  aria-current="page" 
                  href="/"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaHome className="me-1" /> Home
                </motion.a>
              </li>
              <li className="nav-item">
                <motion.a 
                  className="nav-link d-flex align-items-center" 
                  href={isGuest ? "/guest/document-verification" : "/verifier/document-verification"}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaShieldAlt className="me-1" /> Document Verification
                </motion.a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </motion.div>
  );
};

export default Header;

