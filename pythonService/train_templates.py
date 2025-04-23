import os
import cv2
import numpy as np
import sys
import time
from app import extract_features, preprocess_image

def train_template(template_path):
    """Train a template and save its features"""
    try:
        # Load the template image
        print(f"Loading template: {template_path}")
        template_img = cv2.imread(template_path)
        
        if template_img is None:
            print(f"Error: Could not read template image: {template_path}")
            return False
        
        # Get template name without extension
        template_name = os.path.splitext(os.path.basename(template_path))[0]
        
        # Process the template image
        print(f"Preprocessing template: {template_name}")
        processed_img = preprocess_image(template_img)
        
        # Extract features
        print(f"Extracting features for template: {template_name}")
        template_features = extract_features(template_img)
        
        # Save features to .npy file
        feature_path = os.path.join(os.path.dirname(template_path), f"{template_name}.npy")
        np.save(feature_path, template_features)
        
        print(f"Features extracted and saved for {template_name}")
        return True
    except Exception as e:
        print(f"Error training template {template_path}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def train_all_templates(template_dir):
    """Train all templates in a directory"""
    count = 0
    success = 0
    
    # Check for template images
    for filename in os.listdir(template_dir):
        if filename.endswith('.jpg') or filename.endswith('.jpeg') or filename.endswith('.png'):
            template_path = os.path.join(template_dir, filename)
            
            # Skip if npy file already exists
            template_name = os.path.splitext(filename)[0]
            feature_path = os.path.join(template_dir, f"{template_name}.npy")
            
            if os.path.exists(feature_path):
                print(f"Skipping {filename} - features already exist")
                success += 1
                count += 1
                continue
                
            count += 1
            if train_template(template_path):
                success += 1
    
    print(f"Training complete: {success}/{count} templates processed successfully")

if __name__ == "__main__":
    # Get templates directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    template_dir = os.path.join(script_dir, 'templates')
    
    print(f"Training templates in: {template_dir}")
    train_all_templates(template_dir) 