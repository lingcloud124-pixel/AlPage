#!/usr/bin/env python3
"""
Sample Night Sky Background Generator
This script creates a sample dark-themed night sky background with stars and a panda
based on the specifications without requiring an OpenAI API key
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import random


def generate_night_sky(width=1920, height=1080):
    """
    Generate a night sky background with stars and a panda
    """
    # Create a new image with deep purple/indigo background
    img = Image.new("RGB", (width, height), color=(45, 30, 80))  # Deep indigo/purple
    draw = ImageDraw.Draw(img)

    # Add stars
    for _ in range(150):
        x = random.randint(0, width)
        y = random.randint(0, height)
        # Random star brightness and color (white, gold, orange)
        colors = [(255, 255, 200), (255, 255, 150), (255, 215, 0), (255, 180, 100)]
        color = random.choice(colors)
        size = random.uniform(0.5, 3)
        draw.ellipse([x - size, y - size, x + size, y + size], fill=color)

    # Draw gradual gradient for sky
    pixels = img.load()
    for i in range(width):
        for j in range(height):
            # Make sky slightly vary in color
            r, g, b = pixels[i, j]
            r = min(255, max(30, r + random.randint(-10, 20)))
            g = min(255, max(20, g + random.randint(-15, 15)))
            b = min(255, max(60, b + random.randint(-20, 5)))
            pixels[i, j] = (r, g, b)

    # Draw a cute panda silhouette lying down looking up
    # Draw the body of the panda
    center_x = width // 2
    body_y = height - 300
    draw.ellipse(
        [center_x - 100, body_y - 50, center_x + 100, body_y + 50], fill=(240, 240, 240)
    )

    # Draw head of the panda (circular shape)
    draw.ellipse(
        [center_x - 70, body_y - 90, center_x - 10, body_y - 30], fill=(240, 240, 240)
    )

    # Draw ears (small circles)
    draw.ellipse(
        [center_x - 75, body_y - 100, center_x - 45, body_y - 70], fill=(20, 20, 20)
    )
    draw.ellipse(
        [center_x - 35, body_y - 100, center_x - 5, body_y - 70], fill=(20, 20, 20)
    )

    # Draw facial features - eyes
    draw.ellipse(
        [center_x - 60, body_y - 75, center_x - 45, body_y - 60], fill=(20, 20, 20)
    )
    draw.ellipse(
        [center_x - 30, body_y - 75, center_x - 15, body_y - 60], fill=(20, 20, 20)
    )

    # Draw a little nose
    draw.ellipse(
        [center_x - 45, body_y - 55, center_x - 30, body_y - 45], fill=(20, 20, 20)
    )

    # Draw smile
    draw.arc(
        [center_x - 55, body_y - 50, center_x - 20, body_y - 30],
        0,
        180,
        fill=(20, 20, 20),
        width=2,
    )

    # Glow effect around some stars
    for _ in range(30):
        x = random.randint(0, width)
        y = random.randint(0, height)
        size = random.uniform(3, 7)
        # Orange/gold glow
        overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        alpha = random.randint(100, 200)
        color = (*random.choice([(255, 165, 0), (255, 215, 0), (255, 223, 0)]), alpha)
        overlay_draw.ellipse(
            [x - size * 2, y - size * 2, x + size * 2, y + size * 2], fill=color
        )
        img = Image.alpha_composite(img.convert("RGBA"), overlay)

    return img.convert("RGB")


def main():
    print("Generating sample night sky background...")
    img = generate_night_sky(1920, 1080)

    # Create designs directory if it doesn't exist
    import os

    os.makedirs(
        "/Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation/designs",
        exist_ok=True,
    )

    # Save the image
    output_path = "/Users/gulingfei/Desktop/APP（vibe-coding）/Topic Automation/designs/panda-night-bg.png"
    img.save(output_path)
    print(f"Sample image saved to: {output_path}")


if __name__ == "__main__":
    main()
