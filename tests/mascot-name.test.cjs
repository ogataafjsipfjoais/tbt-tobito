const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

test('profile and archive display the unified mascot name', () => {
    const result = execFileSync('php', ['-r', 'require "data.php"; echo json_encode([$tobito, $archives], JSON_UNESCAPED_UNICODE);'], { cwd: root, encoding: 'utf8' });
    const [profile, archives] = JSON.parse(result);
    assert.equal(profile.name, 'とびとくん');
    assert.doesNotMatch(JSON.stringify(archives), /とび斗|トビト|トビ斗/);
});
test('page, metadata, accessibility labels and extension use the unified display name', () => {
    for (const file of ['index.php', 'includes/header.php', 'includes/footer.php', 'assets/js/tbt-accessibility-i18n.js', 'assets/js/tobito-surf-core.js', 'assets/js/tobito-surf-demo.js', 'assets/js/tobito-companion.js', 'assets/js/yakitori-game.js', 'assets/js/game.js', 'extensions/tobito-surfing/manifest.json', 'extensions/tobito-surfing/popup.html']) {
        const text = fs.readFileSync(path.join(root, file), 'utf8');
        assert.doesNotMatch(text, /とび斗|トビト|トビ斗/, file);
        assert.match(text, /とびとくん/, file);
    }
});
