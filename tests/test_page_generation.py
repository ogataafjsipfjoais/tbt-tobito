import importlib.util
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'update_page_tobito.py'
spec = importlib.util.spec_from_file_location('page_generator', SCRIPT)
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class PageGenerationTests(unittest.TestCase):
    def test_extracts_only_shared_content(self):
        body = '\n<main><?php echo "content"; ?></main>\n'
        source = 'header' + generator.START_MARKER + body + generator.END_MARKER + 'footer'
        self.assertEqual(generator.extract_content(source), body)

    def test_rejects_missing_duplicate_and_reversed_boundaries(self):
        start, end = generator.START_MARKER, generator.END_MARKER
        for source in ['', start, end, start + start + end, end + start]:
            with self.subTest(source=source), self.assertRaises(ValueError):
                generator.extract_content(source)

    def test_invalid_source_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            (base / 'index.php').write_text('no content markers', encoding='utf-8')
            output = base / 'page-tobito.php'
            output.write_text('previous build', encoding='utf-8')
            with self.assertRaises(ValueError):
                generator.update_page_tobito(base)
            self.assertEqual(output.read_text(encoding='utf-8'), 'previous build')


if __name__ == '__main__':
    unittest.main()
