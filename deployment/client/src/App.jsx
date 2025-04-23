import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/home/Layout';
import HomePage from './components/home/HomePage';
import Admin from './components/admin/Admin';
import AdminLayout from './components/admin/AdminLayout';
import AddDocument from './components/admin/AddDocument';
import Verify from './components/user/Verify';
import UserLayout from './components/user/UserLayout';
import AdminLogin from './components/admin/Login';
import VerifierLogin from './components/user/VerifierLogin';
import Protected from './components/Protected';
import VerifierProtected from './components/VerifierProtected';
import Register from './components/admin/Register';
import EmailTemplateManager from './components/admin/EmailTemplateManager';
import VerifierRegister from './components/user/VerifierRegister';
import Analytics from './components/admin/Analytics';
import Logout from './components/Logout';
import AdminHomePage from './components/admin/AdminHomePage';
import DocumentVerifier from './components/verification/DocumentVerifier';
import DocumentVerification from './components/verification/DocumentVerification';
import TemplateTrainer from './components/admin/TemplateTrainer';

// Page transition wrapper component
const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

function App() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition>
            <Layout />
          </PageTransition>
        }>
          <Route index element={<HomePage />} />
          <Route path="/verify-document" element={<DocumentVerification />} />
        </Route>

        <Route path="/login" element={
          <PageTransition>
            <AdminLogin />
          </PageTransition>
        } />
        
        <Route path="/register" element={
          <PageTransition>
            <Register />
          </PageTransition>
        } />
        
        <Route path="/verifier-login" element={
          <PageTransition>
            <VerifierLogin />
          </PageTransition>
        } />

        <Route path="/verifier-register" element={<VerifierRegister />} />

        <Route path="/admin" element={
          <PageTransition>
            <AdminLayout />
          </PageTransition>
        }>
          <Route index element={<Protected Component={Admin} />} />
          <Route path="/admin/add" element={<Protected Component={AddDocument}/>} />
          <Route path="/admin/email-templates" element={<Protected Component={EmailTemplateManager}/>} />
          <Route path="/admin/analytics" element={<Protected Component={Analytics}/>} />
          <Route path="/admin/template-trainer" element={<Protected Component={TemplateTrainer}/>} />
          <Route path="/admin/verification" element={<Protected Component={DocumentVerification}/>} />
        </Route>

        <Route path="/verifier" element={
          <PageTransition>
            <UserLayout />
          </PageTransition>
        } >
          <Route index element={<VerifierProtected Component={Verify} />} />
          <Route path="/verifier/document-verification" element={<VerifierProtected Component={DocumentVerifier} />} />
          <Route path="/verifier/document-verify" element={<VerifierProtected Component={DocumentVerification} />} />
        </Route>

        <Route path="/guest" element={
          <PageTransition>
            <UserLayout />
          </PageTransition>
        } >
          <Route index element={<VerifierProtected Component={Verify} />} />
          <Route path="/guest/document-verification" element={<DocumentVerifier />} />
          <Route path="/guest/document-verify" element={<DocumentVerification />} />
        </Route>

        <Route path="/dashboard" element={<Protected Component={Logout} />} />
        <Route path="/profile" element={<Protected Component={Logout} />} />
        <Route path="/logout" element={<Protected Component={Logout} />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
