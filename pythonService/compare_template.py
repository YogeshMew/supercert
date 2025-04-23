import cv2
import numpy as np
import os
import sys
from app import extract_features, preprocess_image, compare_features

def compare_template_to_document(template_path, document_path, output_filename):
    """Compare template to document and visualize the differences"""
    print(f"Comparing template: {template_path}")
    print(f"With document: {document_path}")
    
    # Load images
    template_img = cv2.imread(template_path)
    document_img = cv2.imread(document_path)
    
    if template_img is None:
        print(f"Error: Could not read template image: {template_path}")
        return False
    
    if document_img is None:
        print(f"Error: Could not read document image: {document_path}")
        return False
    
    # Extract features
    template_features = extract_features(template_img)
    document_features = extract_features(document_img)
    
    # Compare features
    similarity_scores = compare_features(document_features, template_features)
    
    # Resize images to same height
    target_height = 600
    temp_aspect = template_img.shape[1] / template_img.shape[0]
    doc_aspect = document_img.shape[1] / document_img.shape[0]
    
    template_resized = cv2.resize(template_img, (int(target_height * temp_aspect), target_height))
    document_resized = cv2.resize(document_img, (int(target_height * doc_aspect), target_height))
    
    # Create a visual comparison
    temp_width = template_resized.shape[1]
    doc_width = document_resized.shape[1]
    
    # Create a canvas large enough for both images side by side plus info
    canvas_width = temp_width + doc_width + 40  # Add padding
    canvas_height = target_height * 2 + 200  # Add space for text
    canvas = np.ones((canvas_height, canvas_width, 3), dtype=np.uint8) * 255
    
    # Place images side by side at the top
    template_x = 20
    document_x = template_x + temp_width + 20
    
    # Place images
    canvas[20:20+target_height, template_x:template_x+temp_width] = template_resized
    canvas[20:20+target_height, document_x:document_x+doc_width] = document_resized
    
    # Add titles
    cv2.putText(canvas, "Template Image", 
               (template_x, 15), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    cv2.putText(canvas, "Document Image", 
               (document_x, 15), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    # Draw detected features on bottom copies
    template_visual = template_resized.copy()
    document_visual = document_resized.copy()
    
    # Draw features on template
    for feature in template_features.get('detected_features', []):
        feature_type = feature.get('type', 'unknown')
        x, y = feature.get('x', 0), feature.get('y', 0)
        w, h = feature.get('width', 0), feature.get('height', 0)
        
        # Scale coordinates
        x_scale = temp_width / template_features['dimensions']['width']
        y_scale = target_height / template_features['dimensions']['height']
        
        x_scaled = int(x * x_scale)
        y_scaled = int(y * y_scale)
        w_scaled = int(w * x_scale)
        h_scaled = int(h * y_scale)
        
        # Different colors for different feature types
        if feature_type == 'text_block':
            color = (255, 0, 0)  # Blue for text blocks
        elif feature_type == 'seal':
            color = (0, 0, 255)  # Red for seals
        elif feature_type == 'logo':
            color = (0, 255, 0)  # Green for logos
        else:
            color = (255, 255, 0)  # Yellow for other
        
        # Draw rectangle
        cv2.rectangle(template_visual, (x_scaled, y_scaled), (x_scaled + w_scaled, y_scaled + h_scaled), color, 2)
    
    # Draw features on document
    for feature in document_features.get('detected_features', []):
        feature_type = feature.get('type', 'unknown')
        x, y = feature.get('x', 0), feature.get('y', 0)
        w, h = feature.get('width', 0), feature.get('height', 0)
        
        # Scale coordinates
        x_scale = doc_width / document_features['dimensions']['width']
        y_scale = target_height / document_features['dimensions']['height']
        
        x_scaled = int(x * x_scale)
        y_scaled = int(y * y_scale)
        w_scaled = int(w * x_scale)
        h_scaled = int(h * y_scale)
        
        # Different colors for different feature types
        if feature_type == 'text_block':
            color = (255, 0, 0)  # Blue for text blocks
        elif feature_type == 'seal':
            color = (0, 0, 255)  # Red for seals
        elif feature_type == 'logo':
            color = (0, 255, 0)  # Green for logos
        else:
            color = (255, 255, 0)  # Yellow for other
        
        # Draw rectangle
        cv2.rectangle(document_visual, (x_scaled, y_scaled), (x_scaled + w_scaled, y_scaled + h_scaled), color, 2)
    
    # Place visualized images on the bottom
    bottom_y = 20 + target_height + 20
    canvas[bottom_y:bottom_y+target_height, template_x:template_x+temp_width] = template_visual
    canvas[bottom_y:bottom_y+target_height, document_x:document_x+doc_width] = document_visual
    
    # Add titles for visualized images
    cv2.putText(canvas, "Template Features", 
               (template_x, bottom_y - 5), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    cv2.putText(canvas, "Document Features", 
               (document_x, bottom_y - 5), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    # Add comparison information
    info_y = bottom_y + target_height + 30
    
    # Format overall score for display
    overall_score = similarity_scores.get('overall', 0) * 100
    
    # Format individual scores
    score_details = []
    for key, value in similarity_scores.items():
        if key != 'overall':
            score_details.append((key, value * 100))
    
    # Sort scores by value (highest first)
    score_details.sort(key=lambda x: x[1], reverse=True)
    
    # Add title for scores
    cv2.putText(canvas, "Comparison Results:", 
               (template_x, info_y), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    
    # Add overall score
    is_verified = overall_score >= 75
    score_color = (0, 180, 0) if is_verified else (0, 0, 200)  # Green if verified, red if not
    
    status_text = "VERIFIED" if is_verified else "NOT VERIFIED"
    cv2.putText(canvas, f"Status: {status_text}", 
               (template_x, info_y + 25), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, score_color, 2)
    
    cv2.putText(canvas, f"Overall Score: {overall_score:.1f}%", 
               (template_x, info_y + 50), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, score_color, 2)
    
    # Add individual scores
    for i, (key, value) in enumerate(score_details):
        # Skip if value is 0
        if value == 0:
            continue
            
        # Format key for display
        display_key = key.replace('_', ' ').replace('similarity', '').title()
        
        # Determine color based on score
        if value >= 75:
            color = (0, 180, 0)  # Green
        elif value >= 50:
            color = (20, 180, 240)  # Yellow-ish
        else:
            color = (0, 0, 200)  # Red
        
        # Draw score text
        cv2.putText(canvas, f"{display_key}: {value:.1f}%", 
                   (template_x + 300, info_y + 25 + i*25), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        # Draw score bar
        bar_width = 150
        bar_height = 15
        bar_x = template_x + 500
        bar_y = info_y + 25 + i*25 - 15
        
        # Background bar
        cv2.rectangle(canvas, 
                     (bar_x, bar_y), 
                     (bar_x + bar_width, bar_y + bar_height), 
                     (220, 220, 220), -1)
        
        # Filled portion
        filled_width = int(bar_width * (value / 100))
        cv2.rectangle(canvas, 
                     (bar_x, bar_y), 
                     (bar_x + filled_width, bar_y + bar_height), 
                     color, -1)
    
    # Save the result
    output_dir = "temp/visualizations"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, output_filename)
    
    cv2.imwrite(output_path, canvas)
    print(f"Comparison visualization saved to: {output_path}")
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python compare_template.py <template_path> <document_path> [output_filename]")
        sys.exit(1)
    
    template_path = sys.argv[1]
    document_path = sys.argv[2]
    output_filename = sys.argv[3] if len(sys.argv) >= 4 else "template_comparison.jpg"
    
    compare_template_to_document(template_path, document_path, output_filename) 