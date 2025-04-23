const handleVerification = async () => {
  setLoading(true);
  setError(null);
  setVerificationResults(null);

  const formData = new FormData();
  formData.append('document', selectedFile);
  formData.append('template_name', selectedTemplate);

  try {
    const response = await axios.post('http://localhost:5000/verify', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    setVerificationResults(response.data);
  } catch (error) {
    console.error('Error during verification:', error);
    setError('Verification failed. Please ensure the Python service is running on port 5000.');
  } finally {
    setLoading(false);
  }
}; 