import React from 'react';
import { motion } from 'framer-motion';
import './ModernTitle.css';

const ModernTitle = ({ subTitle, title }) => {
  const titleVariants = {
    hidden: { 
      opacity: 0,
      y: 20
    },
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

  const lineVariants = {
    hidden: { 
      width: "0%",
      opacity: 0
    },
    visible: { 
      width: "80px",
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 20,
        delay: 0.2
      }
    }
  };

  return (
    <motion.div 
      className="page-title"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <motion.h4 variants={titleVariants}>{subTitle}</motion.h4>
      <motion.h2 variants={titleVariants}>{title}</motion.h2>
      <motion.div 
        className="title-line"
        variants={lineVariants}
      />
    </motion.div>
  );
};

export default ModernTitle;