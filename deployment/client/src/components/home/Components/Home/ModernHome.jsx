import React from 'react';
import { motion } from 'framer-motion';
import { Link } from "react-scroll";
import './ModernHome.css';
import Pic from '../../assets/home.png';
import { FaArrowRight, FaShieldAlt, FaUniversity, FaGraduationCap } from 'react-icons/fa';

const ModernHome = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const imageVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 80,
        delay: 0.3
      }
    }
  };

  const buttonVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { delay: 0.6, duration: 0.3 }
    },
    hover: {
      scale: 1.05,
      boxShadow: "0px 5px 15px rgba(197, 137, 64, 0.3)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: { scale: 0.95 }
  };

  const featureVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.8 + (custom * 0.1),
        duration: 0.5
      }
    })
  };

  const features = [
    {
      icon: <FaShieldAlt />,
      title: "Secure & Immutable",
      description: "Blockchain-backed certificates that cannot be tampered with"
    },
    {
      icon: <FaUniversity />,
      title: "Institutional Trust",
      description: "Verified by accredited educational institutions"
    },
    {
      icon: <FaGraduationCap />,
      title: "Instant Verification",
      description: "Verify credentials in seconds, not days or weeks"
    }
  ];

  return (
    <section className="hero" id="home">
      <div className="container hero-container">
        <motion.div 
          className="hero-content"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h1 className="hero-title" variants={itemVariants}>
            Secure Education Credentials <span className="text-primary">on the Blockchain</span>
          </motion.h1>

          <motion.p className="hero-subtitle" variants={itemVariants}>
            SuperCert is revolutionizing credential verification with blockchain technology.
            Secure, instant, and immutable certification for the digital age.
          </motion.p>

          <motion.div variants={itemVariants} className="mb-5">
            <motion.button
              className="btn btn-primary me-3"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Link to="about" smooth={true} offset={-100} duration={500}>
                Learn More
              </Link>
              <FaArrowRight className="ms-2" />
            </motion.button>
            
            <motion.button
              className="btn btn-outline"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              Verify Certificate
            </motion.button>
          </motion.div>
          
          <motion.div className="feature-badges" variants={containerVariants}>
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className="feature-badge"
                custom={index}
                variants={featureVariants}
                initial="hidden"
                animate="visible"
              >
                <span className="feature-icon">{feature.icon}</span>
                <div>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-image"
          variants={imageVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="certificate-animation">
            <motion.img
              src={Pic}
              alt="Blockchain Certificate Example"
              whileHover={{
                scale: 1.03,
                transition: { duration: 0.3 }
              }}
              className="certificate-image"
            />
            <motion.div 
              className="certificate-glow"
              animate={{ 
                boxShadow: ["0 0 20px rgba(62, 64, 149, 0.3)", "0 0 40px rgba(62, 64, 149, 0.6)", "0 0 20px rgba(62, 64, 149, 0.3)"] 
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                repeatType: "reverse"
              }}
            />
          </div>
        </motion.div>
      </div>
      
      <motion.div 
        className="scroll-indicator"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <span>Scroll Down</span>
        <motion.div 
          className="scroll-arrow"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        />
      </motion.div>
    </section>
  );
};

export default ModernHome;