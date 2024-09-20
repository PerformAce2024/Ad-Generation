import cv2
import requests
import numpy as np
import sys

def download_image(url):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            image_array = np.asarray(bytearray(response.content), dtype=np.uint8)
            image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            return image
        else:
            print(f"Failed to download image from {url}, status code: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None

def extract_background_color(image):
    try:
        # Assuming some OpenCV logic to extract the dominant background color
        avg_color_per_row = np.average(image, axis=0)
        avg_color = np.average(avg_color_per_row, axis=0)
        return avg_color
    except Exception as e:
        print(f"Error extracting background color: {e}")
        return None

if __name__ == "__main__":
    image_url = sys.argv[1]
    print(f"Downloading image from {image_url}")

    image = download_image(image_url)
    
    if image is not None:
        print(f"Image downloaded successfully, extracting background color...")
        background_color = extract_background_color(image)
        if background_color is not None:
            print(f"Extracted background color: {background_color}")
        else:
            print("Failed to extract background color")
    else:
        print("Failed to load image for background color extraction")
