import cv2
import requests
import numpy as np
from collections import Counter
import sys

def download_image(url):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            image_array = np.asarray(bytearray(response.content), dtype=np.uint8)
            downloaded_image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            if downloaded_image is None:
                print("Error: OpenCV could not decode the image.")
            return downloaded_image
        else:
            print(f"Failed to download image from {url}, status code: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None

def most_frequent_color(downloaded_image):
    try:
        # Convert image to RGB (OpenCV uses BGR by default)
        image = cv2.cvtColor(downloaded_image, cv2.COLOR_BGR2RGB)

        # Reshape the image to be a list of pixels
        pixels = image.reshape(-1, 3)

        # Convert the list of pixels to a list of tuples
        pixel_tuples = [tuple(pixel) for pixel in pixels]

        # Count the frequency of each color
        color_counts = Counter(pixel_tuples)

        # Get the most common color and convert to standard integers
        most_common_color = tuple(map(int, color_counts.most_common(1)[0][0]))

        return most_common_color
    except Exception as e:
        print(f"Error processing image for color extraction: {e}")
        return None

# Get the image URL from the command line argument
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No image URL provided. Please pass the URL as an argument.")
        sys.exit(1)
    
    image_url = sys.argv[1]  # Get image URL from Node.js or command line
    image = download_image(image_url)
    
    if image is not None:
        background_color = most_frequent_color(image)
        if background_color:
            print(background_color)  # Print the color as standard integers for Node.js to read
        else:
            print("Failed to extract color from the image.")
    else:
        print("Failed to download or process the image.")
