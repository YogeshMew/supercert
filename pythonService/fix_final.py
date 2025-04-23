# -*- coding: utf-8 -*-
"""
This script adds the missing app.run() code to app.py to start the Flask server
"""

# Read the current app.py
with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the code to run the Flask app at the end
if "if __name__ == '__main__':" not in content:
    content += '''

# Add missing functions from original file
from app_backup_original import extract_features, find_best_match, create_comparison_visualization

# Start the server when this file is run directly
if __name__ == '__main__':
    print("Starting Flask server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
'''

# Write the updated file
with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added app.run() code to start the Flask server!") 