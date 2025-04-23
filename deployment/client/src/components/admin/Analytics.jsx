import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaFileAlt, FaChartBar, FaUsers, FaCalendarAlt, FaUserGraduate, FaExchangeAlt, FaSearch } from 'react-icons/fa';
import './Analytics.css';
import StudentInfoTable from './StudentInfoTable';
import TransactionInfoTable from './TransactionInfoTable';

const Analytics = () => {
  const [stats, setStats] = useState({
    totalDocuments: 0,
    recentUploads: 0,
    totalVerifications: 0,
    activeUsers: 0,
    boardDistribution: [],
    monthlyActivity: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentTable, setStudentTable] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch real data from APIs
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch student data to calculate total documents and board distribution
        const studentResponse = await axios.get('http://localhost:5001/studentInfo');
        console.log('Student response:', studentResponse);
        
        // Handle different response formats for student data
        const studentData = Array.isArray(studentResponse.data) 
          ? studentResponse.data 
          : (studentResponse.data.data && Array.isArray(studentResponse.data.data)) 
            ? studentResponse.data.data 
            : [];

        // Fetch transaction data to calculate verifications
        const transactionResponse = await axios.get('http://localhost:5001/transactionInfo');
        console.log('Transaction response:', transactionResponse);
        
        // Handle different response formats for transaction data
        const transactionArray = Array.isArray(transactionResponse.data) 
          ? transactionResponse.data 
          : (transactionResponse.data.data && Array.isArray(transactionResponse.data.data)) 
            ? transactionResponse.data.data 
            : [];

        // Log the extracted arrays
        console.log('Student data array:', studentData);
        console.log('Transaction data array:', transactionArray);

        // Calculate total documents
        const totalDocuments = studentData.length;

        // Calculate board distribution
        const boardCounts = {};
        studentData.forEach(student => {
          const board = student.dept?.includes('MAHARASHTRA') ? 'Maharashtra' : 
                        student.dept?.includes('CBSE') ? 'CBSE' : 
                        student.dept?.includes('ICSE') ? 'ICSE' : 'Other';
          
          boardCounts[board] = (boardCounts[board] || 0) + 1;
        });

        const boardDistribution = Object.entries(boardCounts).map(([name, count]) => ({
          name,
          count
        })).sort((a, b) => b.count - a.count);

        // Calculate recent uploads (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentUploads = studentData.filter(student => {
          const createdAt = new Date(student.createdAt);
          return createdAt >= thirtyDaysAgo;
        }).length;

        // Calculate total verifications
        const totalVerifications = transactionArray.length;

        // Calculate active users (unique emails in the last month)
        const activeUserEmails = new Set();
        
        // Add student emails from recent uploads
        studentData.forEach(student => {
          if (student.email) {
            const createdAt = new Date(student.createdAt);
            if (createdAt >= thirtyDaysAgo) {
              activeUserEmails.add(student.email.toLowerCase());
            }
          }
        });
        
        // Add unique verifier emails from recent transactions
        transactionArray.forEach(transaction => {
          if (transaction.email) {
            const createdAt = new Date(transaction.createdAt);
            if (createdAt >= thirtyDaysAgo) {
              activeUserEmails.add(transaction.email.toLowerCase());
            }
          }
        });
        
        const activeUsers = activeUserEmails.size;

        // Calculate monthly activity for the last 4 months
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        
        const monthlyActivity = [];
        
        for (let i = 3; i >= 0; i--) {
          const monthIndex = (currentMonth - i + 12) % 12;
          const month = months[monthIndex];
          
          // Count uploads for this month
          const uploads = studentData.filter(student => {
            const date = new Date(student.createdAt);
            return date.getMonth() === monthIndex && date.getFullYear() === new Date().getFullYear();
          }).length;
          
          // Count verifications for this month
          const verifications = transactionArray.filter(transaction => {
            const date = new Date(transaction.createdAt);
            return date.getMonth() === monthIndex && date.getFullYear() === new Date().getFullYear();
          }).length;
          
          monthlyActivity.push({
            month,
            uploads,
            verifications
          });
        }

        setStats({
          totalDocuments,
          recentUploads,
          totalVerifications,
          activeUsers,
          boardDistribution,
          monthlyActivity
        });
        
        setError('');
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="analytics-container">
      <h1>Analytics Dashboard</h1>
      <p className="section-description">
        View statistics and performance metrics for your certificates.
      </p>
      
      {error && (
        <div className="analytics-error">
          <p>{error}</p>
          <p>Try refreshing the page or check the server connection.</p>
        </div>
      )}
      
      {loading ? (
        <div className="analytics-loading">Loading analytics data...</div>
      ) : (
        <>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon">
                <FaFileAlt />
              </div>
              <div className="stat-content">
                <h3>Total Documents</h3>
                <div className="stat-value">{stats.totalDocuments || 0}</div>
                <div className="stat-description">Total certificates stored</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaCalendarAlt />
              </div>
              <div className="stat-content">
                <h3>Recent Uploads</h3>
                <div className="stat-value">{stats.recentUploads || 0}</div>
                <div className="stat-description">Uploads in the last 30 days</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaChartBar />
              </div>
              <div className="stat-content">
                <h3>Verifications</h3>
                <div className="stat-value">{stats.totalVerifications || 0}</div>
                <div className="stat-description">Total certificate verifications</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <FaUsers />
              </div>
              <div className="stat-content">
                <h3>Active Users</h3>
                <div className="stat-value">{stats.activeUsers || 0}</div>
                <div className="stat-description">Users active this month</div>
              </div>
            </div>
          </div>
          
          <div className="analytics-charts">
            <div className="chart-container">
              <h2>Board Distribution</h2>
              {stats.boardDistribution && stats.boardDistribution.length > 0 ? (
                <div className="board-distribution">
                  {stats.boardDistribution.map(board => (
                    <div key={board.name} className="board-item">
                      <div className="board-name">{board.name}</div>
                      <div className="board-bar-container">
                        <div 
                          className="board-bar" 
                          style={{ 
                            width: `${(board.count / Math.max(...stats.boardDistribution.map(b => b.count))) * 100}%` 
                          }}
                        ></div>
                        <span className="board-count">{board.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data-message">No board distribution data available</div>
              )}
            </div>
            
            <div className="chart-container">
              <h2>Monthly Activity</h2>
              {stats.monthlyActivity && stats.monthlyActivity.length > 0 ? (
                <div className="monthly-activity">
                  {stats.monthlyActivity.map(month => (
                    <div key={month.month} className="month-item">
                      <div className="month-name">{month.month}</div>
                      <div className="month-bars">
                        <div className="bar-group">
                          <div 
                            className="month-bar uploads-bar" 
                            style={{ 
                              height: `${(month.uploads / Math.max(...stats.monthlyActivity.map(m => Math.max(m.uploads, m.verifications)))) * 100}px` 
                            }}
                          ></div>
                          <div 
                            className="month-bar verifications-bar" 
                            style={{ 
                              height: `${(month.verifications / Math.max(...stats.monthlyActivity.map(m => Math.max(m.uploads, m.verifications)))) * 100}px` 
                            }}
                          ></div>
                        </div>
                        <div className="bar-labels">
                          <span className="uploads-label">{month.uploads}</span>
                          <span className="verifications-label">{month.verifications}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data-message">No monthly activity data available</div>
              )}
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color uploads-color"></div>
                  <div className="legend-label">Uploads</div>
                </div>
                <div className="legend-item">
                  <div className="legend-color verifications-color"></div>
                  <div className="legend-label">Verifications</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Student and Transaction History Section */}
      <div className="history-section">
        <h2>Certificate History</h2>
        <p className="section-description">
          View detailed history of student certificates and transactions.
        </p>

        <div className="history-card">
          <div className="tab-controls">
            <div className="tab-buttons">
              <button 
                className={`tab-button ${studentTable ? 'active' : ''}`}
                onClick={() => setStudentTable(true)}
              >
                <FaUserGraduate className="tab-icon" /> Student Information
              </button>
              <button 
                className={`tab-button ${!studentTable ? 'active' : ''}`}
                onClick={() => setStudentTable(false)}
              >
                <FaExchangeAlt className="tab-icon" /> Transaction Information
              </button>
            </div>
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="table-container">
            {studentTable ? 
              <StudentInfoTable searchTerm={searchTerm} /> : 
              <TransactionInfoTable searchTerm={searchTerm} />
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 