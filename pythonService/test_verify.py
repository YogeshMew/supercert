import requests
import os
import sys
import json

def verify_document(image_path, template_name=None):
    """Verify a document against templates"""
    print(f"Verifying document: {image_path}")
    
    if not os.path.exists(image_path):
        print(f"Error: Image file not found: {image_path}")
        return
    
    # Create multipart form data
    files = {'document': open(image_path, 'rb')}
    data = {}
    
    if template_name:
        data['template'] = template_name
        print(f"Using specified template: {template_name}")
    else:
        print("Using auto-matching against all templates")
    
    try:
        # Send request to verification endpoint
        response = requests.post('http://localhost:5000/verify', files=files, data=data)
        
        # Handle response
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                if result.get('verified'):
                    print("\n✅ DOCUMENT VERIFIED")
                else:
                    print("\n❌ DOCUMENT NOT VERIFIED")
                
                print(f"\nMatched Template: {result.get('matchedTemplate', 'Unknown')}")
                
                if 'scores' in result:
                    print("\nSimilarity Scores:")
                    for key, value in result['scores'].items():
                        if key != 'overall':
                            print(f"  - {key.replace('_', ' ').title()}: {value * 100:.2f}%")
                    
                    print(f"\nOverall Score: {result['scores'].get('overall', 0) * 100:.2f}%")
                
                if 'analysis' in result:
                    print(f"\nAnalysis image: {result['analysis']}")
            else:
                print(f"Verification failed: {result.get('message', 'Unknown error')}")
        else:
            print(f"Error: HTTP {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error sending request: {str(e)}")
    finally:
        files['document'].close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python test_verify.py <image_path> [template_name]")
        sys.exit(1)
    
    image_path = sys.argv[1]
    template_name = sys.argv[2] if len(sys.argv) > 2 else None
    
    verify_document(image_path, template_name) 