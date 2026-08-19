from PIL import Image, ImageDraw

for seed, path in [(1, "/tmp/qa_damage_1.jpg"), (3, "/tmp/qa_damage_2.jpg")]:
    img = Image.new("RGB", (640, 480), (120 + seed * 10, 125, 135))
    d = ImageDraw.Draw(img)
    d.rectangle([20, 220, 620, 460], fill=(60, 62, 70))
    d.ellipse([160 + seed * 5, 90, 380 + seed * 5, 260], fill=(30, 30, 34))
    d.line([40, 300, 600, 285], fill=(220, 220, 220), width=8)
    d.line([120, 180, 460, 400], fill=(200, 40, 40), width=6)
    img.save(path, quality=75)
    print("wrote", path)
