import React from 'react';
import { motion } from 'framer-motion';
import A1 from '../../assets/a1.png';
import A2 from '../../assets/a2.png';
import A3 from '../../assets/a3.png';
import './Aboutus.css';

const Aboutus = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
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
  
  const features = [
    { title: "Data Privacy", description: "Your credentials are secured using advanced encryption and blockchain technology." },
    { title: "Real-time Verification", description: "Instantly verify the authenticity of any certificate in our system." },
    { title: "Fraud Resistant", description: "Immutable blockchain records prevent tampering and forgery attempts." },
    { title: "Institution Verified", description: "All certificates are issued by verified and trusted educational institutions." }
  ];

  return (
    <section className="about" id="about">
      <div className="container about-container">
        <motion.div 
          className="about-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <motion.div className="about-blocks" variants={containerVariants}>
            <motion.div className="about-block" variants={itemVariants}>
              <div className="about-block-image">
                <motion.img 
                  src={A1} 
                  alt="Identity Misrepresentation" 
                  whileHover={{ scale: 1.05 }}
                />
              </div>
                <h3>Identity Misrepresentation</h3>
              <p>Protecting against false claims of educational achievements and credentials.</p>
            </motion.div>
            
            <motion.div className="about-block" variants={itemVariants}>
              <div className="about-block-image">
                <motion.img 
                  src={A2} 
                  alt="Document Tampering" 
                  whileHover={{ scale: 1.05 }}
                />
            </div>
              <h3>Document Tampering</h3>
              <p>Preventing alteration of grades, courses, and qualification details.</p>
            </motion.div>
            
            <motion.div className="about-block" variants={itemVariants}>
              <div className="about-block-image">
                <motion.img 
                  src={A3} 
                  alt="Forgery Elimination" 
                  whileHover={{ scale: 1.05 }}
                />
            </div>
              <h3>Forgery Elimination</h3>
              <p>Eliminating completely fabricated credentials and certificates.</p>
            </motion.div>
          </motion.div>

          <motion.div className="about-info" variants={containerVariants}>
            <motion.h2 variants={itemVariants}>The SuperCert Platform</motion.h2>
            <motion.p variants={itemVariants}>
              SuperCert is a revolutionary blockchain-based platform that secures educational credentials against fraud and tampering. 
              Our technology ensures that certificates issued by educational institutions remain verifiable, immutable, and accessible globally.
            </motion.p>
            
            <motion.div className="about-features" variants={containerVariants}>
              {features.map((feature, index) => (
                <motion.div 
                  key={index} 
                  className="feature-item"
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                >
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
            
            <motion.p className="about-cta" variants={itemVariants}>
              Join us in revolutionizing educational credential management and verification with SuperCert's cutting-edge blockchain solution.
            </motion.p>
          </motion.div>
        </motion.div>
        </div>
    </section>
  );
};

export default Aboutus;
