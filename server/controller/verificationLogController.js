const VerificationLog = require('../models/VerificationLog');
const Document = require('../models/Document');

// Log a new verification attempt
exports.logVerification = async (req, res) => {
  try {
    const logData = req.body;
    
    // Add IP and user agent for tracking
    logData.ipAddress = req.ip;
    logData.userAgent = req.headers['user-agent'];
    
    // Create a new log entry
    const newLog = new VerificationLog(logData);
    await newLog.save();
    
    return res.status(201).json({
      success: true,
      message: 'Verification logged successfully',
      logId: newLog._id
    });
  } catch (error) {
    console.error('Error logging verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log verification',
      error: error.message
    });
  }
};

// Get verification logs with filter options
exports.getLogs = async (req, res) => {
  try {
    const { 
      result, 
      template, 
      startDate, 
      endDate, 
      studentName,
      batch,
      limit = 100,
      skip = 0
    } = req.query;
    
    // Build filter query
    const query = {};
    
    if (result) query.result = result.toUpperCase();
    if (template) query.template = template;
    if (studentName) query['studentInfo.name'] = { $regex: studentName, $options: 'i' };
    if (batch) query['studentInfo.batch'] = batch;
    
    // Date range filtering
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Get logs with pagination
    const logs = await VerificationLog.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await VerificationLog.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > (parseInt(skip) + parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error retrieving verification logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve logs',
      error: error.message
    });
  }
};

// Get analytics/stats for dashboard
exports.getVerificationStats = async (req, res) => {
  try {
    // Get total documents count
    const totalCertificates = await Document.countDocuments();
    
    // Get total verifications count
    const totalVerifications = await VerificationLog.countDocuments();
    
    // Get successful verifications count
    const successfulVerifications = await VerificationLog.countDocuments({ result: 'VERIFIED' });
    
    // Get failed verifications count
    const failedVerifications = await VerificationLog.countDocuments({ result: 'REJECTED' });
    
    // Get verification success rate
    const successRate = totalVerifications > 0 
      ? (successfulVerifications / totalVerifications) * 100 
      : 0;
    
    // Get verification by template
    const verificationsByTemplate = await VerificationLog.aggregate([
      { $group: { 
        _id: '$template', 
        total: { $sum: 1 },
        verified: { $sum: { $cond: [{ $eq: ['$result', 'VERIFIED'] }, 1, 0] } },
        avgScore: { $avg: '$score' }
      }},
      { $sort: { total: -1 } }
    ]);
    
    // Get recent verification trends (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const verificationTrends = await VerificationLog.aggregate([
      { $match: { timestamp: { $gte: last7Days } } },
      { $group: {
        _id: { 
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } 
        },
        total: { $sum: 1 },
        verified: { $sum: { $cond: [{ $eq: ['$result', 'VERIFIED'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$result', 'REJECTED'] }, 1, 0] } }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    return res.status(200).json({
      success: true,
      stats: {
        totalCertificates,
        totalVerifications,
        successfulVerifications,
        failedVerifications,
        successRate: successRate.toFixed(2),
        verificationsByTemplate,
        verificationTrends
      }
    });
  } catch (error) {
    console.error('Error retrieving verification stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve verification statistics',
      error: error.message
    });
  }
};

// Get top rejection reasons (failed verifications)
exports.getTopRejectionReasons = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    // Get logs with the lowest scores
    const lowestScores = await VerificationLog.find({ result: 'REJECTED' })
      .sort({ score: 1 })
      .limit(parseInt(limit))
      .select('template score timestamp documentInfo');
    
    return res.status(200).json({
      success: true,
      rejectionReasons: lowestScores
    });
  } catch (error) {
    console.error('Error retrieving rejection reasons:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve rejection reasons',
      error: error.message
    });
  }
}; 