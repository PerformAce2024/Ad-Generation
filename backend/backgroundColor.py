import cv2
import numpy as np
from collections import Counter
import sys

def most_frequent_color(image_path):
    """
    This function reads an image from the given path and determines the most frequent color (background color).
    
    Parameters:
        image_path (str): The path to the image file.
    
    Returns:
        tuple: The most frequent color in the image as an (R, G, B) tuple.
    """
    # Read the image
    image = cv2.imread(image_path)
    
    if image is None:
        raise ValueError(f"Image not found or could not be opened: {image_path}")
    
    # Convert image to RGB format (OpenCV uses BGR by default)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Reshape the image to a 2D array where each row is a pixel (R, G, B)
    pixels = image.reshape(-1, 3)

    # Convert each pixel to a tuple for counting
    pixel_tuples = [tuple(pixel) for pixel in pixels]

    # Count the frequency of each pixel color
    color_counts = Counter(pixel_tuples)

    # Get the most common color
    most_common_color = tuple(map(int, color_counts.most_common(1)[0][0]))

    return most_common_color

# Main script logic
if __name__ == "__main__":
    # Check if the image path is provided
    if len(sys.argv) < 2:
        print("Usage: python backgroundColor.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]  # Get the image path from the command-line arguments
    try:
        # Get the most frequent background color
        background_color = most_frequent_color(image_path)
        print(background_color)  # Output the color as (R, G, B) for Node.js to capture
    except Exception as e:
        print(f"Error: {e}")
