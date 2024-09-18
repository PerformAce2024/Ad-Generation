import cv2
import numpy as np
from collections import Counter
import sys

print(f"OpenCV version: {cv2.__version__}")

def most_frequent_color(image_path):
    # Read the image
    image = cv2.imread(image_path)
    
    if image is None:
        raise ValueError(f"Image not found or could not be opened: {image_path}")

    # Convert image to RGB (OpenCV uses BGR by default)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Reshape the image to be a list of pixels
    pixels = image.reshape(-1, 3)

    # Convert the list of pixels to a list of tuples
    pixel_tuples = [tuple(pixel) for pixel in pixels]

    # Count the frequency of each color
    color_counts = Counter(pixel_tuples)

    # Get the most common color and convert to standard integers
    most_common_color = tuple(map(int, color_counts.most_common(1)[0][0]))

    return most_common_color

# Get the image path from the command line argument
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]  # Get image path from Node.js or command line
    try:
        background_color = most_frequent_color(image_path)
        print(background_color)  # Print the color as standard integers for Node.js to read
    except Exception as e:
        print(f"Error: {e}")
