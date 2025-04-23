import React from 'react';
import { motion } from 'framer-motion';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import logo from '../../components/home/assets/Final.png';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <motion.footer 
      className="bg-dark text-white py-4 mt-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-4 mb-3 mb-md-0">
            <motion.div 
              className="d-flex align-items-center justify-content-center justify-content-md-start"
              whileHover={{ scale: 1.05 }}
            >
              <img src={logo} alt="SuperCert Logo" className="me-2" style={{ width: '30px', height: 'auto' }} />
              <span className="fw-bold fs-5">SUPERCERT</span>
            </motion.div>
          </div>
          
          <div className="col-md-4 mb-3 mb-md-0 text-center">
            <p className="mb-0">&copy; {currentYear} SuperCert. All rights reserved.</p>
          </div>
          
          <div className="col-md-4">
            <div className="d-flex justify-content-center justify-content-md-end">
              <motion.a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white me-3"
                whileHover={{ scale: 1.2, color: '#3a86ff' }}
              >
                <FaGithub size={24} />
              </motion.a>
              <motion.a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white"
                whileHover={{ scale: 1.2, color: '#3a86ff' }}
              >
                <FaLinkedin size={24} />
              </motion.a>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;