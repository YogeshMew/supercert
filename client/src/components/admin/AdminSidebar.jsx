import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaUsersCog, 
  FaPlus, 
  FaEnvelope, 
  FaChartBar, 
  FaSignOutAlt,
  FaFileAlt,
  FaTachometerAlt,
  FaFileUpload,
  FaBrain,
  FaUsers
} from 'react-icons/fa';
import './AdminSidebar.css';

const AdminSidebar = ({ isOpen, setIsOpen, activeTab, setActiveTab, setIsAuthenticated }) => {
  const [location, setLocation] = useState(useLocation());
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', text: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin/dashboard' },
    { id: 'add', text: 'Add Document', icon: <FaFileUpload />, path: '/admin/add-document' },
    { id: 'template-trainer', text: 'Template Trainer', icon: <FaBrain />, path: '/admin/template-trainer' },
    { id: 'users', text: 'User Management', icon: <FaUsers />, path: '/admin/user-management' },
    { id: 'emails', text: 'Email Templates', icon: <FaEnvelope />, path: '/admin/email-templates' },
    { id: 'analytics', text: 'Analytics', icon: <FaChartBar />, path: '/admin/analytics' }
  ];

  useEffect(() => {
    const currentPath = location.pathname;
    const matchingTab = menuItems.find(item => currentPath.includes(item.path));
    setActiveTab(matchingTab ? matchingTab.id : '');
  }, [location.pathname]);

  const handleMenuClick = (id, path) => {
    setActiveTab(id);
    navigate(path);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminAuthToken');
    setIsAuthenticated(false);
    navigate('/admin/login');
  };

  return (
    <div className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h3>SuperCert Admin</h3>
        <button className="close-sidebar" onClick={() => setIsOpen(false)}>×</button>
      </div>
      
      <div className="sidebar-menu">
        {menuItems.map(item => (
          <div 
            key={item.id}
            className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => handleMenuClick(item.id, item.path)}
          >
            <span className="item-icon">{item.icon}</span>
            <span className="item-text">{item.text}</span>
          </div>
        ))}
      </div>
      
      <div className="sidebar-footer">
        <div 
          className="sidebar-item logout"
          onClick={handleLogout}
        >
          <span className="item-icon"><FaSignOutAlt /></span>
          <span className="item-text">Logout</span>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar; 