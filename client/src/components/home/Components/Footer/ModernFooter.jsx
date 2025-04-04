import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Link as ScrollLink } from 'react-scroll';
import { FaLinkedin, FaTwitter, FaGithub, FaFacebook, FaEnvelope, FaPhoneAlt, FaMapMarkerAlt } from 'react-icons/fa';
import Logo from '../../assets/Final.png';
import './ModernFooter.css';

const ModernFooter = () => {
  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { scale: 1, opacity: 1 },
    hover: { scale: 1.2, transition: { duration: 0.2 } }
  };

  const navLinks = [
    { name: "Home", path: "home", isScroll: true },
    { name: "About Us", path: "about", isScroll: true },
    { name: "Contact", path: "contact", isScroll: true },
    { name: "Verify Certificate", path: "/verify", isScroll: false }
  ];

  const accountLinks = [
    { name: "Student Login", path: "/student/login" },
    { name: "Institution Login", path: "/admin/login" },
    { name: "Verifier Login", path: "/verifier/login" }
  ];

  const socialLinks = [
    { icon: <FaFacebook />, url: "https://facebook.com" },
    { icon: <FaTwitter />, url: "https://twitter.com" },
    { icon: <FaLinkedin />, url: "https://linkedin.com" },
    { icon: <FaGithub />, url: "https://github.com" }
  ];

  const contactInfo = [
    { icon: <FaEnvelope />, text: "contact@supercert.edu", url: "mailto:contact@supercert.edu" },
    { icon: <FaPhoneAlt />, text: "+1 (555) 123-4567", url: "tel:+15551234567" },
    { icon: <FaMapMarkerAlt />, text: "123 Blockchain Ave, Digital City", url: "#" }
  ];

  const currentYear = new Date().getFullYear();

  return (
    <motion.footer 
      className="footer"
      id="footer"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={footerVariants}
    >
      <div className="container footer-container">
        <motion.div className="footer-section" variants={itemVariants}>
          <div className="footer-brand">
            <motion.img 
              src={Logo} 
              alt="SuperCert Logo" 
            className="footer-logo"
            whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            />
            <h3 className="footer-title">SuperCert</h3>
          </div>
          <p className="footer-description">
            Secure and verified educational certificates powered by blockchain technology.
            Revolutionizing credential verification for institutions, students, and employers.
          </p>
          <div className="footer-social">
            {socialLinks.map((social, index) => (
              <motion.a 
                key={index} 
                href={social.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-icon"
                variants={iconVariants}
                whileHover="hover"
                whileTap={{ scale: 0.9 }}
              >
                {social.icon}
              </motion.a>
            ))}
            </div>
        </motion.div>

        <motion.div className="footer-section" variants={itemVariants}>
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-links">
            {navLinks.map((link, index) => (
              <li key={index}>
                {link.isScroll ? (
                  <ScrollLink 
                    to={link.path} 
                    smooth={true} 
                    duration={500} 
                    offset={-70}
                    className="footer-link"
                  >
                    {link.name}
                  </ScrollLink>
                ) : (
                  <Link to={link.path} className="footer-link">
                    {link.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          </motion.div>
        
        <motion.div className="footer-section" variants={itemVariants}>
          <h4 className="footer-heading">Account</h4>
          <ul className="footer-links">
            {accountLinks.map((link, index) => (
              <li key={index}>
                <Link to={link.path} className="footer-link">
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div className="footer-section" variants={itemVariants}>
          <h4 className="footer-heading">Contact Info</h4>
          <ul className="footer-contact-list">
            {contactInfo.map((contact, index) => (
              <li key={index} className="footer-contact-item">
                <span className="contact-icon">{contact.icon}</span>
                <a href={contact.url} className="contact-text">{contact.text}</a>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
      
      <div className="footer-bottom">
        <div className="container">
          <p className="copyright">
            &copy; {currentYear} SuperCert | All Rights Reserved
          </p>
        </div>
      </div>
    </motion.footer>
  );
};

export default ModernFooter;