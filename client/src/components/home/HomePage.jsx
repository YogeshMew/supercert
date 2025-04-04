import React, { useEffect } from 'react';
import ModernNavbar from "./Components/Navbar/ModernNavbar.jsx";
import ModernTitle from "./Components/Title/ModernTitle.jsx";
import ModernHome from "./Components/Home/ModernHome.jsx";
import Aboutus from "./Components/Aboutus/Aboutus.jsx";
import ModernContact from "./Components/ContactUs/ModernContact.jsx";
import ModernFooter from "./Components/Footer/ModernFooter.jsx";
import '../../../src/style/index.css';

const HomePage = () => {
  // Enhanced effect to ensure navbar visibility
  useEffect(() => {
    // Force the navbar to be fixed and visible
    const forceNavbarVisibility = () => {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        // Ensure these styles are directly applied to override any conflicts
        navbar.style.position = 'fixed';
        navbar.style.top = '0';
        navbar.style.left = '0';
        navbar.style.width = '100%';
        navbar.style.zIndex = '99999';
        
        // Add scrolled class when scrolled
        if (window.scrollY > 10) {
          navbar.classList.add('navbar-scrolled');
        } else {
          navbar.classList.remove('navbar-scrolled');
        }
      }
    };

    // Run initially
    forceNavbarVisibility();
    
    // Add event listener for scroll
    window.addEventListener('scroll', forceNavbarVisibility);
    
    // Also check periodically to ensure navbar remains visible
    const intervalCheck = setInterval(forceNavbarVisibility, 1000);
    
    // Cleanup function
    return () => {
      window.removeEventListener('scroll', forceNavbarVisibility);
      clearInterval(intervalCheck);
    };
  }, []);

  return (
    <div className="container-fluid p-0">
      <ModernNavbar />
      <ModernHome />
      <div className="about-section">
        <ModernTitle subTitle="ABOUT SUPERCERT" title="Your Trusted Source for Secure and Verified Educational Certificates" />
        <Aboutus />
      </div>
      <div className="contact-section">
        <ModernTitle subTitle="Contact Us" title="Get in Touch With Our Team" />
        <ModernContact />
      </div>
      <ModernFooter />
    </div>
  );
};

export default HomePage;