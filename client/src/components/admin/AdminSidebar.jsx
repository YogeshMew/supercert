import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaHome, 
  FaUsersCog, 
  FaPlus, 
  FaEnvelope, 
  FaChartBar, 
  FaSignOutAlt,
  FaFileAlt
} from 'react-icons/fa';
import './AdminSidebar.css';

const AdminSidebar = ({ isOpen, setIsOpen, activeTab, setActiveTab }) => {
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', text: 'Dashboard', icon: <FaHome />, path: '/admin' },
    { id: 'add', text: 'Add Document', icon: <FaPlus />, path: '/admin/add' },
    { id: 'template-trainer', text: 'Template Trainer', icon: <FaFileAlt />, path: '/admin/template-trainer' },
    { id: 'users', text: 'User Management', icon: <FaUsersCog />, path: '/admin/users' },
    { id: 'emails', text: 'Email Templates', icon: <FaEnvelope />, path: '/admin/email-templates' },
    { id: 'analytics', text: 'Analytics', icon: <FaChartBar />, path: '/admin/analytics' }
  ];

  const handleMenuClick = (id, path) => {
    setActiveTab(id);
    navigate(path);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
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
          onClick={() => navigate('/logout')}
        >
          <span className="item-icon"><FaSignOutAlt /></span>
          <span className="item-text">Logout</span>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar; 