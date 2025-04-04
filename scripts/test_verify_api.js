const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function testVerifyAPI() {
  try {
    const formData = new FormData();
    
    // Add the document file
    const filePath = path.resolve(__dirname, '../server/Uploads/temp/marksheet ssc 2.jpg');
    formData.append('document', fs.createReadStream(filePath));
    
    // Add the template name
    formData.append('templateName', 'SSC-Marksheet-Template');
    
    console.log('Sending verification request...');
    
    const response = await axios.post('http://localhost:5000/api/verify/document', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
    
    console.log('Verification Result:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.analysis) {
      console.log(`Analysis image saved at: ${response.data.analysis}`);
    }
    
  } catch (error) {
    console.error('Error testing verification API:');
    if (error.response) {
      console.error('Response error:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testVerifyAPI(); 