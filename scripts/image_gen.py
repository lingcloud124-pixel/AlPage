#!/usr/bin/env python3
"""
Image Generation Script for OpenAI's DALL-E API
"""

import os
import argparse
from pathlib import Path
from openai import OpenAI


def generate_image(prompt, size="1024x1024", output_path=None, quality="standard"):
    """
    Generate an image using OpenAI's DALL-E API

    Args:
        prompt (str): Text prompt for image generation
        size (str): Size of the image (default: "1024x1024")
        output_path (str): Path to save the generated image
        quality (str): Quality of the image ("standard" or "hd")
    """
    # Check if OPENAI_API_KEY is set in environment
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "OPENAI_API_KEY environment variable not set. "
            "Please set your OpenAI API key."
        )

    client = OpenAI(api_key=api_key)

    # Convert size string to appropriate format
    size_mapping = {
        "256x256": "256x256",
        "512x512": "512x512",
        "1024x1024": "1024x1024",
        "1792x1024": "1792x1024",
        "1024x1792": "1024x1792",
        "1920x1080": "1792x1024",  # Closest available size to 1920x1080
        "landscape": "1792x1024",
        "portrait": "1024x1792",
    }

    # Use closest mapping or the original size if available
    api_size = size_mapping.get(size, "1024x1024")

    print(f"Generating image with prompt: '{prompt}'")
    print(f"Size: {api_size}, Quality: {quality}")

    response = client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size=api_size,
        quality=quality,
        n=1,
    )

    image_url = response.data[0].url

    # Download and save the image if path is provided
    if output_path:
        import requests
        from PIL import Image
        from io import BytesIO

        # Create output directory if it doesn't exist
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        # Get the image from URL
        img_response = requests.get(image_url)
        img = Image.open(BytesIO(img_response.content))

        # Save the image
        img.save(output_path)
        print(f"Image saved to: {output_path}")

    return image_url


def main():
    parser = argparse.ArgumentParser(
        description="Generate images using OpenAI's DALL-E API"
    )
    parser.add_argument(
        "--prompt", type=str, required=True, help="Prompt for image generation"
    )
    parser.add_argument(
        "--size",
        type=str,
        default="1024x1024",
        help="Image size (options: 256x256, 512x512, 1024x1024, 1792x1024, 1024x1792)",
    )
    parser.add_argument(
        "--output-path", type=str, help="Path to save the generated image"
    )
    parser.add_argument(
        "--quality",
        type=str,
        default="standard",
        choices=["standard", "hd"],
        help="Image quality (default: standard)",
    )

    args = parser.parse_args()

    image_url = generate_image(args.prompt, args.size, args.output_path, args.quality)
    print(f"Generated image URL: {image_url}")


if __name__ == "__main__":
    main()
