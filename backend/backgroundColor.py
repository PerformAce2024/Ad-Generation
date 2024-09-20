import cv2
import sys

def extract_background_color(image_path):
    try:
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Image not found or could not be opened: {image_path}")
        
        avg_color_per_row = cv2.mean(image)
        return avg_color_per_row[:3]  # Return only the RGB values
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python backgroundColor.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    color = extract_background_color(image_path)
    print(color)
