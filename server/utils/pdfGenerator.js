const generatePDF = async (studentData) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .details {
          margin-bottom: 30px;
        }
        .detail-row {
          margin: 10px 0;
        }
        .label {
          font-weight: bold;
          width: 150px;
          display: inline-block;
        }
        .value {
          display: inline-block;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">STUDENT TRANSCRIPT</div>
      </div>
      
      <div class="details">
        <h3>STUDENT DETAILS</h3>
        <div class="detail-row">
          <span class="label">Name:</span>
          <span class="value">${studentData.fullName}</span>
        </div>
        <div class="detail-row">
          <span class="label">Seat/Roll Number:</span>
          <span class="value">${studentData.rollNo}</span>
        </div>
        <div class="detail-row">
          <span class="label">Date of Birth:</span>
          <span class="value">${new Date(studentData.dob).toLocaleDateString()}</span>
        </div>
        <div class="detail-row">
          <span class="label">Board/University:</span>
          <span class="value">${studentData.board}</span>
        </div>
        <div class="detail-row">
          <span class="label">Program:</span>
          <span class="value">${studentData.program}</span>
        </div>
        <div class="detail-row">
          <span class="label">Exam Year:</span>
          <span class="value">${studentData.examYear}</span>
        </div>
        <div class="detail-row">
          <span class="label">Department:</span>
          <span class="value">${studentData.department}</span>
        </div>
        <div class="detail-row">
          <span class="label">Batch Year:</span>
          <span class="value">${studentData.batchYear}</span>
        </div>
        <div class="detail-row">
          <span class="label">Email:</span>
          <span class="value">${studentData.email}</span>
        </div>
      </div>
      
      <div class="blockchain-info">
        <h3>BLOCKCHAIN VERIFICATION</h3>
        <div class="detail-row">
          <span class="label">Document Hash:</span>
          <span class="value">${studentData.documentHash || ''}</span>
        </div>
        <div class="detail-row">
          <span class="label">Transaction ID:</span>
          <span class="value">${studentData.transactionId || ''}</span>
        </div>
        <div class="detail-row">
          <span class="label">Timestamp:</span>
          <span class="value">${new Date().toLocaleString()}</span>
        </div>
      </div>
    </body>
    </html>
  `;

  const options = {
    format: 'A4',
    border: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    header: {
      height: '15mm'
    },
    footer: {
      height: '15mm',
      contents: {
        default: '<div style="text-align: center; font-size: 10px;">This is a blockchain-verified document. Page {{page}} of {{pages}}</div>'
      }
    }
  };

  return new Promise((resolve, reject) => {
    pdf.create(html, options).toBuffer((err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer);
      }
    });
  });
}; 