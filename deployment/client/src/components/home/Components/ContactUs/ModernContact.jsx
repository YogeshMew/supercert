import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaEnvelope, FaPhoneAlt, FaMapMarkerAlt, FaClock, FaPaperPlane } from 'react-icons/fa';
import './ModernContact.css';

const ModernContact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [formStatus, setFormStatus] = useState({
    submitted: false,
    success: false,
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate form submission
    setFormStatus({
      submitted: true,
      success: true,
      message: 'Thank you for your message! We will get back to you soon.'
    });
    
    // Reset form after submission
    setTimeout(() => {
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      setFormStatus({
        submitted: false,
        success: false,
        message: ''
      });
    }, 5000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
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

  const contactInfo = [
    {
      icon: <FaEnvelope />,
      title: "Email Us",
      details: ["info@supercert.edu", "support@supercert.edu"]
    },
    {
      icon: <FaPhoneAlt />,
      title: "Call Us",
      details: ["+1 (555) 123-4567", "+1 (555) 987-6543"]
    },
    {
      icon: <FaMapMarkerAlt />,
      title: "Office",
      details: ["123 Blockchain Avenue", "Digital City, DC 10101"]
    },
    {
      icon: <FaClock />,
      title: "Working Hours",
      details: ["Monday-Friday: 9am-5pm", "Saturday: 10am-2pm"]
    }
  ];

  return (
    <section className="contact" id="contact">
      <div className="container contact-container">
        <motion.div 
          className="contact-content"
      initial="hidden"
      whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
          <motion.div className="contact-info" variants={containerVariants}>
            <motion.h2 variants={itemVariants}>Get In Touch</motion.h2>
            <motion.p variants={itemVariants}>
              Have questions about SuperCert? We're here to help! Reach out to our team for inquiries about our blockchain certification platform, technical support, or partnership opportunities.
            </motion.p>
            
            <motion.div className="contact-cards" variants={containerVariants}>
              {contactInfo.map((info, index) => (
                <motion.div 
                  key={index} 
                  className="contact-card"
                  variants={itemVariants}
                  whileHover={{ y: -5, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
                >
                  <div className="contact-card-icon">
                    {info.icon}
              </div>
                  <h3>{info.title}</h3>
                  {info.details.map((detail, i) => (
                    <p key={i}>{detail}</p>
                  ))}
                </motion.div>
              ))}
            </motion.div>
        </motion.div>
        
          <motion.div className="contact-form-wrapper" variants={containerVariants}>
            <motion.form 
              className="contact-form"
              onSubmit={handleSubmit}
              variants={itemVariants}
            >
              <h3>Send Us a Message</h3>
              
              <div className="form-group">
                <label htmlFor="name">Your Name</label>
                <input 
                  type="text" 
                  id="name"
                  name="name" 
                  value={formData.name}
                  onChange={handleChange}
                  required 
                  placeholder="John Doe"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Your Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input 
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required 
                  placeholder="How can we help you?"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="message">Your Message</label>
                <textarea 
                  id="message"
                  name="message" 
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Tell us more about your inquiry..."
                  rows="5"
                ></textarea>
              </div>
              
              {formStatus.submitted && (
                <motion.div 
                  className={`form-alert ${formStatus.success ? 'success' : 'error'}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {formStatus.message}
                </motion.div>
              )}
              
              <motion.button 
                type="submit"
                className="btn btn-primary submit-btn"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={formStatus.submitted}
              >
                Send Message <FaPaperPlane className="ms-2" />
              </motion.button>
            </motion.form>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ModernContact;