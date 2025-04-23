import cv2
import numpy as np
import json
import os
from copy_template import extract_features, match_template

def test_template_verification(template1_path, template2_path):
    """Test verification between two template images."""
    print("\nTesting template verification...")
    
    # Load both images
    img1 = cv2.imread(template1_path)
    img2 = cv2.imread(template2_path)
    
    if img1 is None or img2 is None:
        print("Error: Could not load one or both images")
        return
    
    print(f"\nImage 1 dimensions: {img1.shape}")
    print(f"Image 2 dimensions: {img2.shape}")
    
    try:
        # Extract features from both images
        print("\nExtracting features from Image 1...")
        features1, descriptors1 = extract_features(template1_path)
        
        print("\nExtracting features from Image 2...")
        features2, descriptors2 = extract_features(template2_path)
        
        # Match templates in both directions
        print("\nMatching Image 1 against Image 2...")
        match_1_2 = match_template(img1, img2, features1, features2)
        
        print("\nMatching Image 2 against Image 1...")
        match_2_1 = match_template(img2, img1, features2, features1)
        
        # Print detailed results
        print("\n=== Verification Results ===")
        print("\nImage 1 -> Image 2:")
        print(f"Match Score: {match_1_2['match_score']:.2f}")
        print(f"Confidence: {match_1_2['confidence']}")
        print("\nDetails:")
        for key, value in match_1_2['details'].items():
            print(f"  {key}: {value}")
            
        print("\nImage 2 -> Image 1:")
        print(f"Match Score: {match_2_1['match_score']:.2f}")
        print(f"Confidence: {match_2_1['confidence']}")
        print("\nDetails:")
        for key, value in match_2_1['details'].items():
            print(f"  {key}: {value}")
            
        # Compare features
        print("\n=== Feature Comparison ===")
        print(f"\nImage 1 features:")
        print(f"Number of keypoints: {len(features1['keypoints'])}")
        print(f"Pattern matches: {features1['pattern_matches']}")
        print(f"Table structure: {features1['table_structure']}")
        
        print(f"\nImage 2 features:")
        print(f"Number of keypoints: {len(features2['keypoints'])}")
        print(f"Pattern matches: {features2['pattern_matches']}")
        print(f"Table structure: {features2['table_structure']}")
        
    except Exception as e:
        print(f"Error during verification: {str(e)}")

if __name__ == "__main__":
    template1 = "pythonService/templates/marksheet_ssc_2.jpg"
    template2 = "pythonService/templates/marksheet_ssc_3.jpg"
    
    test_template_verification(template1, template2) 