import React, { useState, useEffect } from 'react';
import api from '../../utils/axiosConfig';
import { motion } from 'framer-motion';
import { FaKey, FaPlus, FaTrash, FaCopy, FaRedo, FaBuilding, FaUser, FaInfoCircle } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ActivationCodeManager = () => {
  const [activationCodes, setActivationCodes] = useState([]);
  const [institutionCodes, setInstitutionCodes] = useState([]);
  const [newCode, setNewCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInstitutionCodes, setShowInstitutionCodes] = useState(false);
  const [activeTab, setActiveTab] = useState('admin');
  const [user, setUser] = useState(null);
  const [institutionData, setInstitutionData] = useState({
    name: '',
    email: '',
    address: ''
  });

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

  // Fetch user data and activation codes on component mount
  useEffect(() => {
    // Get user info from localStorage
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
    }
    
    fetchActivationCodes();
  }, []);

  const fetchActivationCodes = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/activation-codes');
      setActivationCodes(response.data);
    } catch (error) {
      console.error('Error fetching activation codes:', error);
      toast.error('Failed to load activation codes');
    } finally {
      setIsLoading(false);
    }
  };

  const generateActivationCode = async () => {
    setIsGenerating(true);
    try {
      const response = await api.post('/api/activation-codes/generate');
      setActivationCodes([...activationCodes, response.data]);
      toast.success('New activation code generated successfully');
    } catch (error) {
      console.error('Error generating activation code:', error);
      toast.error('Failed to generate activation code');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteActivationCode = async (codeId, isInstitutionCode = false) => {
    setIsDeleting(true);
    try {
      const endpoint = isInstitutionCode 
        ? `/api/activation-codes/institution/${codeId}`
        : `/api/activation-codes/${codeId}`;
        
      await api.delete(endpoint);
      
      if (isInstitutionCode) {
        setInstitutionCodes(institutionCodes.filter(code => code._id !== codeId));
      } else {
        setActivationCodes(activationCodes.filter(code => code._id !== codeId));
      }
      toast.success('Activation code deleted successfully');
    } catch (error) {
      console.error('Error deleting activation code:', error);
      toast.error('Failed to delete activation code');
    } finally {
      setIsDeleting(false);
    }
  };

  const createCustomActivationCode = async (e) => {
    e.preventDefault();
    if (!newCode.trim()) {
      toast.warning('Please enter a valid activation code');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.post('/api/activation-codes/custom', {
        code: newCode
      });
      setActivationCodes([...activationCodes, response.data]);
      setNewCode('');
      toast.success('Custom activation code created successfully');
    } catch (error) {
      console.error('Error creating custom activation code:', error);
      toast.error('Failed to create custom activation code');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    toast.info('Activation code copied to clipboard');
  };

  const handleInstitutionInputChange = (e) => {
    const { name, value } = e.target;
    setInstitutionData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchInstitutionCodes = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/activation-codes/institution');
      setInstitutionCodes(response.data);
    } catch (error) {
      console.error('Error fetching institution codes:', error);
      toast.error('Failed to load institution codes');
    } finally {
      setIsLoading(false);
    }
  };

  const createInstitutionActivationCode = async (e) => {
    e.preventDefault();
    if (!institutionData.name.trim()) {
      toast.warning('Please enter a valid institution name');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api.post('/api/activation-codes/institution', {
        institution: institutionData
      });
      setInstitutionCodes([...institutionCodes, response.data]);
      setInstitutionData({ name: '', email: '', address: '' });
      toast.success('Institution activation code created successfully');
    } catch (error) {
      console.error('Error creating institution activation code:', error);
      toast.error('Failed to create institution activation code');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      className="container py-4"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <ToastContainer position="top-right" autoClose={3000} />
      
      <motion.div className="row mb-4" variants={itemVariants}>
        <div className="col-md-12">
          <h2 className="text-primary fw-bold d-flex align-items-center">
            <FaKey className="me-2" /> Activation Code Management
          </h2>
          <p className="text-muted">
            These codes allow you to create additional administrators for your institution who can help manage certificates.
          </p>
        </div>
      </motion.div>

      <motion.div className="row mb-4" variants={itemVariants}>
        <div className="col-md-12">
          <div className="alert alert-info d-flex align-items-center">
            <FaInfoCircle className="me-2" />
            <div>
              <strong>Note:</strong> These activation codes can only be used to create additional administrator accounts for your institution ({user?.institution || 'your institution'}). 
              They cannot be used to register new institutions in the system.
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div className="row mb-4" variants={itemVariants}>
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Generate New Activation Code</h5>
              <p className="card-text">Create a system-generated secure activation code for new admin registration within your institution.</p>
              <motion.button
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={generateActivationCode}
                disabled={isGenerating}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FaPlus />
                    <span>Generate Code</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Create Custom Activation Code</h5>
              <form onSubmit={createCustomActivationCode}>
                <div className="input-group mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter custom activation code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    required
                  />
                  <button
                    className="btn btn-primary d-flex align-items-center gap-2"
                    type="submit"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <FaPlus />
                        <span>Create</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
              <p className="card-text">Create a custom activation code for administrators in your institution.</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div className="row mb-4" variants={itemVariants}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">Your Activation Codes</h5>
            <motion.button
              className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
              onClick={fetchActivationCodes}
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaRedo />
              <span>Refresh</span>
            </motion.button>
          </div>

          {isLoading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Loading activation codes...</p>
            </div>
          ) : activationCodes.length === 0 ? (
            <div className="alert alert-info" role="alert">
              No activation codes found. Generate a new code to get started.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activationCodes.map((code) => (
                    <tr key={code._id}>
                      <td>
                        <code>{code.code}</code>
                      </td>
                      <td>{new Date(code.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${code.isUsed ? 'bg-secondary' : 'bg-success'}`}>
                          {code.isUsed ? 'Used' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <motion.button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => copyToClipboard(code.code)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Copy to clipboard"
                          >
                            <FaCopy />
                          </motion.button>
                          {!code.isUsed && (
                          <motion.button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => deleteActivationCode(code._id)}
                            disabled={isDeleting}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Delete code"
                          >
                            <FaTrash />
                          </motion.button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
      
      <motion.div className="row mb-4" variants={itemVariants}>
        <div className="col-12">
          <div className="card shadow-sm bg-light">
            <div className="card-body">
              <h5 className="card-title d-flex align-items-center">
                <FaUser className="me-2" /> How to Use Activation Codes
              </h5>
              <div className="mt-3">
                <ol className="ps-3">
                  <li>Generate an activation code using one of the options above</li>
                  <li>Share the code with the person who needs admin access to your institution's certificates</li>
                  <li>The person will use this code during registration at <code>/register</code></li>
                  <li>They will automatically be assigned to your institution</li>
                  <li>They will have access to manage certificates and documents, but won't be able to create other admins</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ActivationCodeManager;