import React from 'react'
import './Footer.css'
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa'
import logo from '../../assets/Final.png'

export default function Foooter() {
  return (
    <footer className='footer'>
      <div className="footer-content">
        <div className="footer-logo">
          <div className="d-flex align-items-center mb-2">
            <img src={logo} alt="SuperCert Logo" style={{ width: '30px', height: 'auto', marginRight: '10px' }} />
            <h3>SuperCert</h3>
          </div>
          <p>Secure and verified educational certificates</p>
        </div>
        <div className="footer-links">
          <ul>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Contact Us</a></li>
            <li><a href="#">Support</a></li>
          </ul>
        </div>
        <div className="footer-social">
          <a href="#"><FaFacebook /></a>
          <a href="#"><FaTwitter /></a>
          <a href="#"><FaInstagram /></a>
          <a href="#"><FaLinkedin /></a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2025 SuperCert. All rights reserved.</p>
      </div>
    </footer>
  )
}
