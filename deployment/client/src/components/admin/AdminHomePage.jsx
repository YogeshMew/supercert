import React, { useState } from 'react';
import StudentInfoTable from './StudentInfoTable';
import TransactionInfoTable from './TransactionInfoTable';
import { motion } from 'framer-motion';
import { FaUserGraduate, FaExchangeAlt, FaFileAlt, FaSearch, FaKey, FaUserCog, FaEnvelope } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const AdminHomePage = () => {
  const [studentTable, setStudentTable] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.3 } }
  };

  const cardVariants = {
    hover: { 
      scale: 1.03,
      boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div 
      className="container py-4"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div 
        className="row mb-4 align-items-center"
        variants={itemVariants}
      >
        <div className="col-md-6">
          <h2 className="text-primary fw-bold d-flex align-items-center">
            <FaUserGraduate className="me-2" /> Welcome Admin
          </h2>
        </div>
        <div className="col-md-6 text-md-end">
          <motion.a 
            href="/admin/addDocument" 
            className="btn btn-primary d-inline-flex align-items-center me-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaFileAlt className="me-2" /> Add Transcript
          </motion.a>
          <motion.a 
            href="/admin/activation-codes" 
            className="btn btn-outline-primary d-inline-flex align-items-center me-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaKey className="me-2" /> Manage Codes
          </motion.a>
          <motion.a 
            href="/admin/email-templates" 
            className="btn btn-outline-primary d-inline-flex align-items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaEnvelope className="me-2" /> Email Templates
          </motion.a>
        </div>
      </motion.div>

      <motion.div 
        className="row mb-4"
        variants={itemVariants}
      >
        <div className="col-md-4 mb-4">
          <motion.div 
            className="card h-100 shadow-sm"
            whileHover="hover"
            variants={cardVariants}
          >
            <div className="card-body text-center p-4">
              <div className="display-4 text-primary mb-3">
                <FaFileAlt />
              </div>
              <h3 className="card-title">Upload Transcripts</h3>
              <p className="card-text">Securely upload student transcripts to be stored on the blockchain.</p>
              <Link to="/admin/addDocument" className="btn btn-primary mt-2">
                Upload Now
              </Link>
            </div>
          </motion.div>
        </div>
        
        <div className="col-md-4 mb-4">
          <motion.div 
            className="card h-100 shadow-sm"
            whileHover="hover"
            variants={cardVariants}
          >
            <div className="card-body text-center p-4">
              <div className="display-4 text-primary mb-3">
                <FaKey />
              </div>
              <h3 className="card-title">Activation Codes</h3>
              <p className="card-text">Manage activation codes for institution registration and admin access.</p>
              <Link to="/admin/activation-codes" className="btn btn-primary mt-2">
                Manage Codes
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="col-md-4 mb-4">
          <motion.div 
            className="card h-100 shadow-sm"
            whileHover="hover"
            variants={cardVariants}
          >
            <div className="card-body text-center p-4">
              <div className="display-4 text-primary mb-3">
                <FaEnvelope />
              </div>
              <h3 className="card-title">Email Templates</h3>
              <p className="card-text">Customize email templates for student communications with your institution branding.</p>
              <Link to="/admin/email-templates" className="btn btn-primary mt-2">
                Manage Templates
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div 
        className="card shadow-sm mb-4"
        variants={itemVariants}
      >
        <div className="card-body">
          <div className="row align-items-center mb-3">
            <div className="col-md-6">
              <div className="btn-group" role="group">
                <motion.button 
                  className={`btn ${studentTable ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setStudentTable(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaUserGraduate className="me-2" /> Student Information
                </motion.button>
                <motion.button 
                  className={`btn ${!studentTable ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setStudentTable(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaExchangeAlt className="me-2" /> Transaction Information
                </motion.button>
              </div>
            </div>
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-primary text-white">
                  <FaSearch />
                </span>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            key={studentTable ? 'student' : 'transaction'}
          >
            {studentTable ? <StudentInfoTable searchTerm={searchTerm} /> : <TransactionInfoTable searchTerm={searchTerm} />}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminHomePage;
