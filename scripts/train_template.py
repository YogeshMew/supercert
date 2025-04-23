#!/usr/bin/env python3
"""
Script to train a new document template by extracting and saving its features
"""

import os
import sys
import json
import cv2
import numpy as np
from PIL import Image
import pytesseract
import re
import argparse
from pathlib import Path
from typing import Dict, Any, Tuple, List

# Constants
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), 'server')
TEMPLATE_DIR = os.path.join(SERVER_DIR, 'uploads', 'templates')
FEATURES_DIR = os.path.join(SERVER_DIR, 'data', 'features')
TEMP_DIR = os.path.join(SERVER_DIR, 'uploads', 'temp')

# Make sure directories exist
os.makedirs(TEMPLATE_DIR, exist_ok=True)
os.makedirs(FEATURES_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

def preprocess_image(image_path):
    """Preprocess the image for better feature extraction."""
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image from {image_path}")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply thresholding to handle variations in brightness
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Additional preprocessing
    # Noise reduction
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    
    return {
        'original': img,
        'gray': gray,
        'thresh': thresh,
        'blur': blur
    }

def extract_features(image_path: str) -> Dict[str, Any]:
    """
    Extract features from the template image including SIFT keypoints,
    dimensions, and image quality metrics.
    """
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")
    
    # Convert to grayscale for SIFT
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Initialize SIFT detector
    sift = cv2.SIFT_create()
    keypoints, descriptors = sift.detectAndCompute(gray, None)
    
    # Get image dimensions
    height, width = img.shape[:2]
    aspect_ratio = width / height
    
    # Calculate mean color values
    mean_color = cv2.mean(img)[:3]
    
    # Calculate image quality metrics
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    brightness = np.mean(gray)
    contrast = np.std(gray)
    
    # Convert keypoints to serializable format
    keypoints_list = [
        {
            'x': kp.pt[0],
            'y': kp.pt[1],
            'size': kp.size,
            'angle': kp.angle,
            'response': kp.response,
            'octave': kp.octave,
        }
        for kp in keypoints
    ]
    
    return {
        'dimensions': {
            'width': width,
            'height': height,
            'aspect_ratio': aspect_ratio
        },
        'features': {
            'keypoints': keypoints_list,
            'descriptors': descriptors.tolist() if descriptors is not None else None,
            'keypoint_count': len(keypoints)
        },
        'quality': {
            'blur_score': float(blur_score),
            'brightness': float(brightness),
            'contrast': float(contrast),
            'mean_color': {
                'b': float(mean_color[0]),
                'g': float(mean_color[1]),
                'r': float(mean_color[2])
            }
        }
    }

def create_template_visualization(image_path, features, template_name):
    """Create a visualization of the template with detected features highlighted"""
    img = cv2.imread(image_path)
    if img is None:
        return None
    
    # Create a visualization image
    viz_img = img.copy()
    
    # Draw annotated regions
    if 'rois' in features:
        for roi in features['rois']:
            x, y, w, h = roi
            cv2.rectangle(viz_img, (x, y), (x + w, y + h), (0, 255, 0), 2)  # Green
    
    # Draw circles for detected seals/logos
    if 'seal_positions' in features:
        for circle in features['seal_positions']:
            x, y, r = circle
            cv2.circle(viz_img, (x, y), r, (255, 0, 0), 2)  # Blue
    
    # Highlight text regions using PyTesseract
    try:
        # Get word boxes with PyTesseract
        gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        boxes = pytesseract.image_to_data(gray_img, output_type=pytesseract.Output.DICT)
        
        for i in range(len(boxes['text'])):
            # Only process non-empty text entries
            if boxes['text'][i].strip() and int(boxes['conf'][i]) > 30:
                x = boxes['left'][i]
                y = boxes['top'][i]
                w = boxes['width'][i]
                h = boxes['height'][i]
                
                cv2.rectangle(viz_img, (x, y), (x + w, y + h), (0, 0, 255), 1)  # Red, thin line
    except Exception as e:
        print(f"Error highlighting text regions: {e}", file=sys.stderr)
    
    # Add template name as text
    cv2.putText(
        viz_img,
        f"Template: {template_name}",
        (10, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 0, 255),  # Red
        2
    )
    
    # Save the visualization image
    viz_path = os.path.join(TEMP_DIR, f"{template_name}_analysis.jpg")
    cv2.imwrite(viz_path, viz_img)
    
    return viz_path

def train_template(template_path, template_name):
    """Train a template by extracting and saving its features"""
    try:
        # Extract features
        features = extract_features(template_path)
        
        # Add metadata
        features['metadata'] = {
            'name': template_name,
            'created_at': Path(template_path).stat().st_mtime,
            'original_path': template_path
        }
        
        # Save features to JSON file
        features_path = os.path.join(FEATURES_DIR, f"{template_name}.json")
        os.makedirs(os.path.dirname(features_path), exist_ok=True)
        
        with open(features_path, 'w') as f:
            json.dump(features, f, indent=2)
        
        # Create a visualization of detected features
        viz_path = create_template_visualization(template_path, features, template_name)
        
        return {
            "success": True,
            "message": f"Template '{template_name}' trained successfully",
            "features": features,
            "visualization": viz_path
        }
        
    except Exception as e:
        print(f"Error training template: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"Error training template: {str(e)}",
            "error": str(e)
        }

def validate_template(image_path: str) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validate the template image for minimum quality requirements.
    Returns: (is_valid, message, validation_data)
    """
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        return False, "Failed to read image", {}
    
    height, width = img.shape[:2]
    validation_data = {
        'dimensions': {'width': width, 'height': height},
        'checks': {}
    }
    
    # Check minimum dimensions
    min_dimension = 300
    if width < min_dimension or height < min_dimension:
        validation_data['checks']['dimensions'] = False
        return False, f"Image dimensions too small. Minimum required: {min_dimension}x{min_dimension}", validation_data
    validation_data['checks']['dimensions'] = True
    
    # Check for blur
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    validation_data['checks']['blur'] = blur_score > 100
    if blur_score < 100:
        return False, "Image is too blurry", validation_data
    
    # Check contrast
    contrast = np.std(gray)
    validation_data['checks']['contrast'] = contrast > 30
    if contrast < 30:
        return False, "Image has insufficient contrast", validation_data
    
    return True, "Template validation successful", validation_data

def main():
    parser = argparse.ArgumentParser(description='Template training and feature extraction')
    parser.add_argument('--image-path', required=True, help='Path to the template image')
    parser.add_argument('--template-name', required=True, help='Name of the template')
    parser.add_argument('--extract-features', action='store_true', help='Extract features from template')
    parser.add_argument('--validate-template', action='store_true', help='Validate template image')
    
    args = parser.parse_args()
    
    result = {
        'template_name': args.template_name,
        'image_path': args.image_path
    }
    
    try:
        if args.validate_template:
            is_valid, message, validation_data = validate_template(args.image_path)
            result.update({
                'validation': {
                    'is_valid': is_valid,
                    'message': message,
                    'data': validation_data
                }
            })
        
        if args.extract_features:
            features = extract_features(args.image_path)
            result['features'] = features
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'template_name': args.template_name,
            'image_path': args.image_path
        }
        print(json.dumps(error_result))
        exit(1)

if __name__ == '__main__':
    main() 