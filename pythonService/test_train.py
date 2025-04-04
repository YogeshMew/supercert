import requests
import os
import sys

def train_template(image_path, template_name):
    """Train a new template for document verification"""
    print(f"Training template '{template_name}' from image: {image_path}")
    
    if not os.path.exists(image_path):
        print(f"Error: Image file not found: {image_path}")
        return
    
    # Create multipart form data
    files = {'document': open(image_path, 'rb')}
    data = {'name': template_name}
    
    try:
        # Send request to training endpoint
        response = requests.post('http://localhost:5000/train', files=files, data=data)
        
        # Handle response
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("Template training successful!")
                print(f"Features extracted: {result.get('features', {})}")
            else:
                print(f"Training failed: {result.get('message', 'Unknown error')}")
        else:
            print(f"Error: HTTP {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error sending request: {str(e)}")
    finally:
        files['document'].close()

def list_templates():
    """List all available templates"""
    try:
        response = requests.get('http://localhost:5000/templates')
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                templates = result.get('templates', [])
                if templates:
                    print(f"Found {len(templates)} templates:")
                    for i, template in enumerate(templates, 1):
                        print(f"{i}. {template}")
                else:
                    print("No templates found.")
            else:
                print(f"Error: {result.get('message', 'Unknown error')}")
        else:
            print(f"Error: HTTP {response.status_code}")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python test_train.py train <image_path> <template_name>")
        print("  python test_train.py list")
        sys.exit(1)
    
    action = sys.argv[1]
    
    if action == "train":
        if len(sys.argv) != 4:
            print("Usage: python test_train.py train <image_path> <template_name>")
            sys.exit(1)
        
        image_path = sys.argv[2]
        template_name = sys.argv[3]
        train_template(image_path, template_name)
    
    elif action == "list":
        list_templates()
    
    else:
        print(f"Unknown action: {action}")
        print("Usage:")
        print("  python test_train.py train <image_path> <template_name>")
        print("  python test_train.py list")
        sys.exit(1) 