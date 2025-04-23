# Template Training and Feature Extraction

This script provides functionality for template training and feature extraction from document images.

## Setup

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Usage

The script can be used in two modes:

1. Feature Extraction:
```bash
python train_template.py --image-path path/to/image.jpg --template-name "Template1" --extract-features
```

2. Template Validation:
```bash
python train_template.py --image-path path/to/image.jpg --template-name "Template1" --validate-template
```

### Parameters

- `--image-path`: Path to the template image (required)
- `--template-name`: Name of the template (required)
- `--extract-features`: Extract features from the template
- `--validate-template`: Validate the template image

### Output

The script outputs results in JSON format, including:
- Image dimensions and aspect ratio
- SIFT keypoints and descriptors
- Image quality metrics (blur score, brightness, contrast)
- Validation status and messages (when using --validate-template) 