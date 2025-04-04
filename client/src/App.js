import './style/index.css'; 
import Dashboard from './components/admin/Dashboard';
import ActiveUsers from './components/admin/ActiveUsers';
import AddDocument from './components/admin/AddDocument';
import VerifyDocument from './components/user/VerifyDocument';
import ViewDocuments from './components/admin/ViewDocuments';
import Templates from './components/admin/Templates';
import UserRegister from './components/auth/UserRegister';
import UserDocuments from './components/user/UserDocuments';
import TemplateTrainer from './components/admin/TemplateTrainer';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* ... existing code ... */}
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PrivateRoute>
                <AdminLayout>
                  <ActiveUsers />
                </AdminLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/documents"
            element={
              <PrivateRoute>
                <AdminLayout>
                  <ViewDocuments />
                </AdminLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/documents/add"
            element={
              <PrivateRoute>
                <AdminLayout>
                  <AddDocument />
                </AdminLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/templates"
            element={
              <PrivateRoute>
                <AdminLayout>
                  <Templates />
                </AdminLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/templates/train"
            element={
              <PrivateRoute>
                <AdminLayout>
                  <TemplateTrainer />
                </AdminLayout>
              </PrivateRoute>
            }
          />
          
          {/* ... existing code ... */}
        </Routes>
      </div>
    </Router>
  );
}

export default App; 