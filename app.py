from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import cv2
import numpy as np
from copy_template import extract_features, verify_template
import logging

app = Flask(__name__)
app.logger.setLevel(logging.INFO)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

@app.route('/verify', methods=['POST'])
def verify_document():
    try:
        if 'document' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No document file uploaded'
            })

        file = request.files['document']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No selected file'
            })

        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': 'Invalid file type. Allowed types: ' + ', '.join(ALLOWED_EXTENSIONS)
            })

        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        try:
            # Get template name if specified
            template_name = request.form.get('template', None)

            # Verify document
            result = verify_template(filepath, template_name)

            if result is None:
                return jsonify({
                    'success': False,
                    'message': 'Verification failed - no matching template found'
                })

            # Structure the response
            response = {
                'success': True,
                'verified': result['verified'],
                'matchedTemplate': result['template'] or 'unknown',
                'scores': {
                    'overall': result['match_score'],
                    'pattern_match': result['details']['pattern_score'],
                    'negative_pattern': result['details']['negative_score'],
                    'color_match': float(result['details']['color_match']),
                    'text_match': result['details']['text_match_percentage'] / 100
                },
                'confidence': result['confidence'],
                'message': 'Document verified successfully' if result['verified'] else 'Document verification failed - incorrect format'
            }

            return jsonify(response)

        except Exception as e:
            app.logger.error(f"Verification processing error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Verification processing failed: {str(e)}'
            })

        finally:
            # Clean up uploaded file
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except Exception as e:
                app.logger.warning(f"Failed to clean up uploaded file: {str(e)}")

    except Exception as e:
        app.logger.error(f"Verification request error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Verification request failed: {str(e)}'
        })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 