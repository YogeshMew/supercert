import { Link } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';

const Templates = () => {
  return (
    <div className="templates">
      <div className="templates-header">
        <h2>Document Templates</h2>
        <div className="header-actions">
          <Link to="/admin/template-trainer" className="btn btn-primary">
            <FaPlus /> Train New Template
          </Link>
        </div>
      </div>
      
      {/* ... existing code ... */}
    </div>
  );
};

export default Templates; 