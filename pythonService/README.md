# Python Document Verification Service

This service provides document verification capabilities using computer vision and OCR techniques. It helps to verify documents against trained templates by comparing features such as text content, layout, and visual elements like logos or seals.

## Quick Start

1. **Install dependencies**:
   ```
   pip install -r requirements.txt
   ```

2. **Install Tesseract OCR**:
   - Windows: Download and install from https://github.com/UB-Mannheim/tesseract/wiki
   - Linux: `sudo apt-get install tesseract-ocr`
   - macOS: `brew install tesseract`

3. **Start the service**:
   ```
   python app.py
   ```

4. **Train at least one template**:
   ```
   python test_train.py train path/to/template_image.jpg template_name
   ```

5. **Verify documents**:
   ```
   python test_verify.py path/to/document.jpg
   ```

## Frontend Integration

The service is designed to be used with the React frontend. The frontend has been updated to connect directly to this service on port 5000.

### Frontend Features:
- Document uploading and verification
- Visual feedback on verification results
- Template matching and similarity scores
- Data extraction from verified documents

## API Endpoints

### Health Check
```
GET /health
```

### Get Templates
```
GET /templates
```
Returns the list of available templates.

### Train Template
```
POST /train
```
Parameters:
- document: Image file (multipart/form-data)
- name: Template name

### Verify Document
```
POST /verify
```
Parameters:
- document: Image file (multipart/form-data)
- template: (Optional) Template name

## Testing the System

1. **Check available templates**:
   ```
   python test_train.py list
   ```

2. **Train a new template**:
   ```
   python test_train.py train sample_images/template1.jpg template_name
   ```

3. **Verify a document against a specific template**:
   ```
   python test_verify.py sample_images/document.jpg template_name
   ```

4. **Verify a document with auto-matching**:
   ```
   python test_verify.py sample_images/document.jpg
   ```

## Troubleshooting

- **404 Error**: Make sure the Python service is running on port 5000
- **File not found errors**: Ensure all directories (templates, temp, uploads) exist in the pythonService folder
- **Tesseract errors**: Verify Tesseract OCR is installed and the path is correctly set in app.py
- **No templates found**: Train at least one template before attempting verification

## How Document Verification Works

1. **Feature Extraction**: The system extracts features from documents including text (using OCR), layout information, edge patterns, and circular elements (potential seals/logos).

2. **Feature Comparison**: When verifying a document, these features are compared against stored template features.

3. **Similarity Scoring**: The system calculates similarity scores for:
   - Text similarity (word overlap)
   - Layout similarity (positioning of elements)
   - Seal/logo similarity (presence and position of circular elements)

4. **Overall Score**: A weighted combination determines the overall verification score, with 65% being the default threshold for verification.

5. **Analysis Image**: The system generates a visual comparison showing both images side by side with similarity scores.

## Features

- Document verification against trained templates
- Automatic template matching when specific template isn't provided
- Template training from document images
- Visual comparison generation between documents and templates
- RESTful API interface for integration with other services

## Requirements

- Python 3.8+
- OpenCV
- Tesseract OCR
- Flask and other dependencies listed in requirements.txt

## Installation

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Install Tesseract OCR:
   - Windows: Download and install from https://github.com/UB-Mannheim/tesseract/wiki
   - Linux: `sudo apt-get install tesseract-ocr`
   - macOS: `brew install tesseract`

3. Update the path to Tesseract in app.py if needed:
   ```python
   pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
   ```

## Running the service

```
python app.py
```

The service will start on port 5000 by default.

## Integration with Node.js

This service is designed to be used with the main server application, which will call it when document verification is needed. The Node.js server will fall back to legacy verification methods if this service is unavailable. 