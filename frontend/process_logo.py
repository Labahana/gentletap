import os
from PIL import Image

src_image = r"C:\Users\HomePC\.gemini\antigravity\brain\a790d142-9e25-42fa-b23d-3606f6a6d751\gentletap_logo_g_v2_1786987434997.jpg"
public_dir = r"c:\Users\HomePC\Music\2-gentletap\frontend\public"

# Load the image
img = Image.open(src_image).convert("RGBA")
width, height = img.size

os.makedirs(public_dir, exist_ok=True)

# 1. Save the full logo as logo.png
full_logo_path = os.path.join(public_dir, "logo.png")
img.save(full_logo_path, format="PNG")
print(f"Saved full logo to {full_logo_path}")

# 2. Extract the icon (the blue square)
# We'll scan the image to find the bounding box of non-white pixels on the left side.
# Let's assume white is > 240 in all RGB channels.
left, top, right, bottom = width, height, 0, 0

pixels = img.load()
for y in range(height):
    for x in range(width // 2): # Only scan the left half to find the icon
        r, g, b, a = pixels[x, y]
        # If it's not white (blue tile)
        if r < 240 or g < 240 or b < 240:
            if x < left: left = x
            if x > right: right = x
            if y < top: top = y
            if y > bottom: bottom = y

print(f"Detected icon bounds: left={left}, top={top}, right={right}, bottom={bottom}")

# Add a tiny margin or just use the bounding box. Let's make it square.
icon_width = right - left
icon_height = bottom - top
size = max(icon_width, icon_height)

# Center the crop box
center_x = (left + right) // 2
center_y = (top + bottom) // 2

crop_left = center_x - size // 2
crop_top = center_y - size // 2
crop_right = crop_left + size
crop_bottom = crop_top + size

icon_img = img.crop((crop_left, crop_top, crop_right, crop_bottom))

# 3. Generate favicon sizes
sizes = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "apple-touch-icon.png": 180,
    "logo192.png": 192,
    "logo512.png": 512,
}

for name, s in sizes.items():
    resized = icon_img.resize((s, s), Image.Resampling.LANCZOS)
    path = os.path.join(public_dir, name)
    resized.save(path, format="PNG")
    print(f"Saved {name}")

# Create .ico file containing 16 and 32
icon_img.save(os.path.join(public_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (64, 64)])
print("Saved favicon.ico")
