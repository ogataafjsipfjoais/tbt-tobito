from pathlib import Path
import json
import unittest
import zipfile

ROOT = Path(__file__).resolve().parent.parent


class ExtensionPackageTests(unittest.TestCase):
    def test_package_has_only_local_code_and_all_referenced_assets(self):
        with zipfile.ZipFile(ROOT / "assets/downloads/tobito-surfing.zip") as archive:
            names = set(archive.namelist())
            prefix = "tobito-surfing/"
            manifest = json.loads(archive.read(prefix + "manifest.json"))
            self.assertEqual(manifest["manifest_version"], 3)
            self.assertEqual(set(manifest["permissions"]), {"activeTab", "scripting", "storage"})
            self.assertNotIn("host_permissions", manifest)
            self.assertNotIn("content_scripts", manifest)
            for name in ("popup.html", "popup.js", "content.js", "surf-core.js", "README.md", *manifest["icons"].values()):
                self.assertIn(prefix + name, names)
            for name in names:
                self.assertTrue(name.startswith(prefix))
                self.assertNotIn("..", Path(name).parts)
            self.assertEqual(archive.read(prefix + "surf-core.js"), (ROOT / "assets/js/tobito-surf-core.js").read_bytes())
