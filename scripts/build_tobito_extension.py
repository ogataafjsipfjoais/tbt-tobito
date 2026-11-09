from pathlib import Path
import shutil
import zipfile

root = Path(__file__).resolve().parent.parent
extension = root / "extensions" / "tobito-surfing"
images = extension / "images"
images.mkdir(parents=True, exist_ok=True)
for name in ("tobito_face_normal.png", "tobito_pose_airplane.png", "tobito_pose_koi.png", "tobito_pose_crossed_arms.png"):
    shutil.copy2(root / "assets" / "images" / name, images / name)
shutil.copy2(root / "assets" / "js" / "tobito-surf-core.js", extension / "surf-core.js")
downloads = root / "assets" / "downloads"
downloads.mkdir(parents=True, exist_ok=True)
shutil.copy2(extension / "README.md", downloads / "tobito-surfing-README.md")
with zipfile.ZipFile(downloads / "tobito-surfing.zip", "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in sorted(extension.rglob("*")):
        if file.is_file():
            archive.write(file, "tobito-surfing/" + file.relative_to(extension).as_posix())
