import cv2
import numpy as np
import sys

def extract_background_color(image_path):
    # Load the image
    image = cv2.imread(image_path)
    
    if image is None:
        print(f"Error: Could not load image from {image_path}")
        sys.exit(1)
    
    # Convert the image to RGB (OpenCV loads in BGR by default)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Get the average color (mean across the image)
    average_color = np.mean(image_rgb, axis=(0, 1))  # Mean across width and height
    rgb_color = tuple(map(int, average_color))  # Convert to integers

    # Return the color in the format "rgb(r, g, b)"
    print(f"rgb{rgb_color}")

if __name__ == "__main__":
    # Ensure that the script receives the image path as an argument
    if len(sys.argv) != 2:
        print("Usage: python backgroundColor.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    extract_background_color(image_path)
