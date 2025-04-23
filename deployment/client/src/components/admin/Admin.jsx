import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaPlus, 
  FaUsers, 
  FaKey, 
  FaEnvelope, 
  FaChartBar, 
  FaCalendarAlt, 
  FaRegClock,
  FaUserGraduate,
  FaCertificate,
  FaShieldAlt,
  FaFileAlt
} from 'react-icons/fa';
import AdminSidebar from './AdminSidebar';
import './Admin.css';

export const Admin = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalCertificates: 243,
    verifications: 129,
    pendingApprovals: 8,
    recentUsers: 17
  });
  
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    document.title = 'Admin Dashboard | SuperCert';
    
    // Refresh the date every minute
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Format date and time
  const dateFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = currentDate.toLocaleDateString('en-US', dateFormatOptions);
  const formattedTime = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="admin-dashboard">
      <AdminSidebar isOpen={isOpen} setIsOpen={setIsOpen} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className={`admin-main ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="admin-header">
          <button className="menu-toggle" onClick={() => setIsOpen(!isOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className="admin-header-content">
            <h1>Admin Dashboard</h1>
            <div className="date-time">
              <span><FaCalendarAlt /> {formattedDate}</span>
              <span><FaRegClock /> {formattedTime}</span>
            </div>
          </div>
          <div className="admin-controls">
            <span className="admin-logout" onClick={() => navigate('/logout')}>Logout</span>
          </div>
        </div>

        <div className="dashboard-summary">
          <div className="summary-card">
            <div className="summary-icon cert-icon">
              <FaCertificate />
            </div>
            <div className="summary-details">
              <h3>{stats.totalCertificates}</h3>
              <p>Total Certificates</p>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon verify-icon">
              <FaShieldAlt />
            </div>
            <div className="summary-details">
              <h3>{stats.verifications}</h3>
              <p>Verifications</p>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon pending-icon">
              <FaKey />
            </div>
            <div className="summary-details">
              <h3>{stats.pendingApprovals}</h3>
              <p>Pending Approvals</p>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon users-icon">
              <FaUserGraduate />
            </div>
            <div className="summary-details">
              <h3>{stats.recentUsers}</h3>
              <p>New Users</p>
            </div>
          </div>
        </div>
        
        <h2 className="section-title">Quick Actions</h2>
        <div className="admin-features">
          <div className="feature-card" onClick={() => navigate('/admin/add')}>
            <div className="feature-icon">
              <FaPlus />
            </div>
            <div className="feature-info">
              <h3>Add Document</h3>
              <p>Upload and certify new academic certificates</p>
            </div>
          </div>

          <div className="feature-card" onClick={() => navigate('/admin/template-trainer')}>
            <div className="feature-icon">
              <FaFileAlt />
            </div>
            <div className="feature-info">
              <h3>Template Trainer</h3>
              <p>Train document templates for verification</p>
            </div>
          </div>

          <div className="feature-card" onClick={() => navigate('/admin/users')}>
            <div className="feature-icon">
              <FaUsers />
            </div>
            <div className="feature-info">
              <h3>User Management</h3>
              <p>Manage users and their roles in the system</p>
            </div>
          </div>

          <div className="feature-card" onClick={() => navigate('/admin/keys')}>
            <div className="feature-icon">
              <FaKey />
            </div>
            <div className="feature-info">
              <h3>Activation Codes</h3>
              <p>Generate and manage activation codes</p>
            </div>
          </div>

          <div className="feature-card" onClick={() => navigate('/admin/notifications')}>
            <div className="feature-icon">
              <FaEnvelope />
            </div>
            <div className="feature-info">
              <h3>Notifications</h3>
              <p>Manage system notifications and alerts</p>
            </div>
          </div>
          
          <div className="feature-card" onClick={() => navigate('/admin/analytics')}>
            <div className="feature-icon">
              <FaChartBar />
            </div>
            <div className="feature-info">
              <h3>Analytics</h3>
              <p>View system analytics and statistics</p>
            </div>
          </div>
        </div>
        
        <div className="admin-footer">
          <p>&copy; {new Date().getFullYear()} SuperCert - Blockchain Certificate Verification System</p>
        </div>
      </div>
    </div>
  );
};

export default Admin; 