import os
import shutil
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
import pytesseract
import json
from pathlib import Path
import re
from typing import Dict, Any, Union, List

def numpy_to_list(obj: Any) -> Any:
    """Convert numpy arrays and types to Python native types."""
    if isinstance(obj, np.ndarray):
        if obj.size == 1:  # Single element array
            return obj.item()
        return obj.tolist()
    elif isinstance(obj, (np.int8, np.int16, np.int32, np.int64,
                        np.uint8, np.uint16, np.uint32, np.uint64)):
        return int(obj)
    elif isinstance(obj, (np.float16, np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: numpy_to_list(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [numpy_to_list(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(numpy_to_list(item) for item in obj)
    return obj

def preprocess_image(img):
    """Preprocess image for better feature extraction"""
    # Convert to grayscale if not already
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    # Resize if image is too large
    max_dimension = 1600
    height, width = gray.shape
    if height > max_dimension or width > max_dimension:
        scale = max_dimension / max(height, width)
        new_width = int(width * scale)
        new_height = int(height * scale)
        gray = cv2.resize(gray, (new_width, new_height))
    
    # Apply adaptive histogram equalization
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(enhanced)
    
    # Sharpen
    kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
    sharpened = cv2.filter2D(denoised, -1, kernel)
    
    # Binarize
    _, binary = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return binary

def match_template(img1, img2, features1, features2):
    """Match two templates and return detailed matching scores."""
    try:
        # Basic dimension check with more tolerance
        h1, w1 = img1.shape[:2]
        h2, w2 = img2.shape[:2]
        aspect_ratio1 = w1 / h1
        aspect_ratio2 = w2 / h2
        aspect_ratio_match = abs(aspect_ratio1 - aspect_ratio2) < 0.2
        
        # Calculate positive pattern score
        pattern_score = min(1.0, features1['pattern_matches'] / len(key_patterns))
        
        # Calculate negative pattern penalty
        negative_score = max(0.0, 1.0 - (features1['negative_matches'] / len(negative_patterns)))
        
        # Color format matching (beige vs pink)
        color_match = features1['is_beige']
        
        # Calculate overall match score with adjusted weights
        match_score = (
            0.15 * float(aspect_ratio_match) +
            0.35 * pattern_score +
            0.35 * negative_score +
            0.15 * float(color_match)
        )
        
        # Strict confidence levels
        if match_score >= 0.80 and color_match:  # Must be beige and high score
            confidence = 'High'
        elif match_score >= 0.60 and color_match:  # Must be beige and medium score
            confidence = 'Medium'
        else:
            confidence = 'Low'
        
        return {
            'match_score': float(match_score),
            'confidence': confidence,
            'details': {
                'aspect_ratio_match': bool(aspect_ratio_match),
                'pattern_score': float(pattern_score),
                'negative_score': float(negative_score),
                'color_match': bool(color_match),
                'text_match_percentage': float(pattern_score * 100)
            }
        }
        
    except Exception as e:
        print(f"Warning: Template matching failed: {str(e)}")
        return {
            'match_score': 0.0,
            'confidence': 'Error',
            'details': {
                'error': str(e),
                'aspect_ratio_match': False,
                'pattern_score': 0.0,
                'negative_score': 0.0,
                'color_match': False,
                'text_match_percentage': 0.0
            }
        }

def extract_features(image_path: str) -> Dict[str, Any]:
    """Extract features from Maharashtra State Board SSC certificate template."""
    # Read and preprocess image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not read image at {image_path}")
    
    # Convert to grayscale and normalize
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    normalized = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    
    # Apply adaptive thresholding with more aggressive parameters
    binary = cv2.adaptiveThreshold(normalized, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                 cv2.THRESH_BINARY, 15, 5)
    
    # Initialize SIFT detector with more features and lower contrast threshold
    sift = cv2.SIFT_create(nfeatures=2000, contrastThreshold=0.02)
    keypoints, descriptors = sift.detectAndCompute(binary, None)
    
    # Convert keypoints to serializable format
    keypoints_list = [{
        'x': float(kp.pt[0]),
        'y': float(kp.pt[1]),
        'size': float(kp.size),
        'angle': float(kp.angle),
        'response': float(kp.response),
        'octave': int(kp.octave)
    } for kp in keypoints]
    
    # Extract text using multiple OCR configurations
    text_configs = [
        '--psm 3 --oem 3',  # Default
        '--psm 6 --oem 3',  # Assume uniform block of text
        '--psm 4 --oem 3'   # Assume single column of text
    ]
    
    all_text = []
    for config in text_configs:
        try:
            text = pytesseract.image_to_string(image, lang='eng', config=config)
            all_text.append(text.strip())
        except Exception as e:
            print(f"OCR error with config {config}: {str(e)}")
            continue
    
    combined_text = ' '.join(all_text)
    
    # Check for key text patterns specific to the beige certificate
    key_patterns = [
        ["MAHARASHTRA STATE BOARD OF"],
        ["SECONDARY SCHOOL CERTIFICATE EXAMINATION - CERTIFICATE"],
        ["This is to certify that"],
        ["DISTINCTION"],
        ["ENGLISH (1ST LANG)"],
        ["MATHEMATICS"],
        ["SCIENCE & TECHNOLOGY"],
        ["SOCIAL SCIENCES"]
    ]
    
    # Check for patterns that should NOT be present (specific to pink certificate)
    negative_patterns = [
        ["MUMBAI DIVISIONAL BOARD"],
        ["STATEMENT OF MARKS"],
        ["CANDIDATE'S FULL NAME"],
        ["Subject Code No"],
        ["In Figures"]
    ]
    
    pattern_matches = 0
    negative_matches = 0
    
    # Count positive matches
    for pattern_group in key_patterns:
        if any(pat.lower() in combined_text.lower() for pat in pattern_group):
            pattern_matches += 1
    
    # Count negative matches
    for pattern_group in negative_patterns:
        if any(pat.lower() in combined_text.lower() for pat in pattern_group):
            negative_matches += 1
    
    # Detect average color to differentiate between beige and pink certificates
    avg_color = cv2.mean(image)[:3]  # BGR format
    is_beige = (avg_color[0] > 180 and avg_color[1] > 180 and avg_color[2] > 180)  # Lighter colors for beige
    
    # Create feature dictionary with normalized table structure
    features = {
        "image_hash": str(hash(str(descriptors.tobytes()))),
        "dimensions": {
            "height": int(image.shape[0]),
            "width": int(image.shape[1])
        },
        "keypoints": keypoints_list,
        "text_content": combined_text,
        "text_length": len(combined_text),
        "pattern_matches": pattern_matches,
        "negative_matches": negative_matches,
        "is_beige": is_beige,
        "table_structure": {
            "horizontal_lines": len(horizontal_lines),
            "vertical_lines": len(vertical_lines)
        },
        "quality_metrics": {
            "blur_score": float(cv2.Laplacian(gray, cv2.CV_64F).var()),
            "brightness": float(np.mean(gray)),
            "contrast": float(np.std(gray))
        }
    }
    
    return features, descriptors

def save_features(features, descriptors, template_name):
    """Save features and descriptors to files."""
    # Save descriptors as NPY
    npy_path = f"pythonService/templates/{template_name}.npy"
    np.save(npy_path, descriptors)
    
    # Convert features to JSON-serializable format and save
    json_path = f"pythonService/templates/{template_name}.json"
    with open(json_path, 'w') as f:
        json.dump(numpy_to_list(features), f, indent=2)
    
    return npy_path, json_path

def load_features(template_name):
    """Load features and descriptors from files."""
    npy_path = f"pythonService/templates/{template_name}.npy"
    json_path = f"pythonService/templates/{template_name}.json"
    
    if not os.path.exists(npy_path) or not os.path.exists(json_path):
        raise FileNotFoundError(f"Template files not found for {template_name}")
    
    descriptors = np.load(npy_path)
    with open(json_path, 'r') as f:
        features = json.load(f)
    
    return features, descriptors

def copy_and_process_template():
    """Process multiple templates and save their features."""
    templates = [
        {"source": "pythonService/templates/marksheet ssc 3.jpg", "name": "marksheet_ssc_3"},
        {"source": "pythonService/templates/marksheet_ssc_2.jpg", "name": "marksheet_ssc_2"}
    ]
    
    results = []
    for template in templates:
        print(f"\nProcessing template: {template['name']}")
        try:
            # Extract features
            features, descriptors = extract_features(template['source'])
            
            # Save features and descriptors
            npy_path, json_path = save_features(features, descriptors, template['name'])
            print(f"Features saved to {json_path}")
            print(f"Descriptors saved to {npy_path}")
            
            # Verify template against itself
            print("\nVerifying template against itself...")
            match_result = match_template(
                cv2.imread(template['source']),
                cv2.imread(template['source']),
                features,
                features
            )
            
            results.append({
                'template': template['name'],
                'match_score': match_result['match_score'],
                'confidence': match_result['confidence'],
                'details': match_result['details']
            })
            
            print("\nVerification Results:")
            print(f"Match Score: {match_result['match_score']:.2f}")
            print(f"Confidence: {match_result['confidence']}")
            print("\nMatch Details:")
            for key, value in match_result['details'].items():
                print(f"  {key}: {value}")
                
        except Exception as e:
            print(f"Error processing template {template['name']}: {str(e)}")
            results.append({
                'template': template['name'],
                'error': str(e)
            })
    
    return results

def verify_template(image_path, template_name=None):
    """Verify an image against the beige SSC certificate template."""
    try:
        # Read the image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Could not read image")

        # Convert to grayscale for text extraction
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Extract text using OCR with multiple configurations
        text = ""
        configs = [
            '--psm 3 --oem 3',  # Default
            '--psm 6 --oem 3',  # Assume uniform block of text
            '--psm 4 --oem 3'   # Assume single column of text
        ]
        for config in configs:
            try:
                text += " " + pytesseract.image_to_string(gray, config=config)
            except:
                    continue
                
        # Required text elements that must be present
        required_elements = [
            "MAHARASHTRA STATE BOARD",
            "SECONDARY SCHOOL CERTIFICATE",
            "EXAMINATION",
            "CERTIFICATE",
            "This is to certify that"
        ]
        
        # Elements that should not be present (from pink certificate)
        forbidden_elements = [
            "MUMBAI DIVISIONAL BOARD",
            "STATEMENT OF MARKS",
            "Subject Code No",
            "CANDIDATE'S FULL NAME"
        ]
        
        # Check for required elements
        required_matches = sum(1 for elem in required_elements if elem.upper() in text.upper())
        
        # Check for forbidden elements
        forbidden_matches = sum(1 for elem in forbidden_elements if elem.upper() in text.upper())
        
        # Calculate average color in BGR
        avg_color = cv2.mean(image)[:3]
        
        # Check if color is beige (light colored)
        is_beige = all(c > 170 for c in avg_color)  # Slightly relaxed threshold
        
        # Verification criteria:
        # 1. Must match most required elements
        # 2. Must not match any forbidden elements
        # 3. Must be beige colored
        is_verified = (required_matches >= 3 and  # Match at least 3 required elements
                      forbidden_matches == 0 and
                      is_beige)
        
        # Calculate match percentage
        match_percentage = (required_matches / len(required_elements)) * 100
        
        # Calculate confidence
        if is_verified:
            if match_percentage >= 80:
                confidence = 'High'
            else:
                confidence = 'Medium'
        else:
            confidence = 'Low'
        
        # Use the actual template filename that exists
        template_name = 'marksheet ssc 3'  # This matches the actual file name
        
        return {
            'verified': is_verified,
            'template': template_name if is_verified else None,
            'match_score': float(required_matches / len(required_elements)),
            'confidence': confidence,
            'details': {
                'pattern_score': float(required_matches / len(required_elements)),
                'color_match': bool(is_beige),
                'text_match_percentage': match_percentage,
                'negative_score': float(1 - (forbidden_matches / len(forbidden_elements)))
            }
        }
        
    except Exception as e:
        print(f"Verification error: {str(e)}")
        return {
            'verified': False,
            'template': None,
            'match_score': 0.0,
            'confidence': 'Error',
            'details': {
                'error': str(e),
                'pattern_score': 0.0,
                'color_match': False,
                'text_match_percentage': 0.0,
                'negative_score': 0.0
            }
        }

if __name__ == "__main__":
    results = copy_and_process_template()
    
    print("\nSummary of all template processing:")
    for result in results:
        print(f"\nTemplate: {result['template']}")
        if 'error' in result:
            print(f"Error: {result['error']}")
        else:
            print(f"Match Score: {result['match_score']:.2f}")
            print(f"Confidence: {result['confidence']}")
            print("Details:")
            for key, value in result['details'].items():
                print(f"  {key}: {value}") 