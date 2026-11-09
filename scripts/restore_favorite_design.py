import os
import re

def restore_favorite_design():
    content_path = '/Users/ogatarintaro/.gemini/antigravity/brain/8f39f772-94d2-4a39-a6da-2e8ec57b604e/.system_generated/steps/5388/content.md'
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_path = os.path.join(base_dir, 'index.php')

    with open(content_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Extract lines 190 to 1396
    body_lines = lines[190:1397]
    body_str = ''.join(body_lines)

    # Dynamic cheer messages replacement
    cheer_loop = """                        <!-- メッセージ一覧 -->
                        <div id="cheer-messages-container" class="space-y-4 max-h-80 overflow-y-auto pr-1">
                            <?php if (!empty($messages)): ?>
                                <?php foreach ($messages as $c): ?>
                                    <div class="p-4 rounded-2xl bg-white border border-amber-100/80 shadow-xs">
                                        <div class="flex items-center justify-between mb-1.5">
                                            <span class="font-bold text-xs text-slate-800 font-serif"><?= htmlspecialchars($c['author'] ?? $c['name'] ?? '鳥人間ファン', ENT_QUOTES, 'UTF-8') ?></span>
                                            <span class="text-[10px] font-brand-mono text-slate-400"><?= htmlspecialchars($c['date'] ?? date('Y.m.d'), ENT_QUOTES, 'UTF-8') ?></span>
                                        </div>
                                        <p class="text-xs text-slate-600 leading-relaxed"><?= nl2br(htmlspecialchars($c['message'] ?? '', ENT_QUOTES, 'UTF-8')) ?></p>
                                    </div>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <div class="p-4 rounded-2xl bg-white border border-amber-100/80 shadow-xs text-slate-400 text-xs text-center">
                                    最初のメッセージを投稿してみよう！🕊️
                                </div>
                            <?php endif; ?>
                        </div>"""

    # Replace static cheer messages container
    pattern = r'<!-- メッセージ一覧 -->\s*<div id="cheer-messages-container"[\s\S]*?</div>\s*</div>\s*</div>'
    match = re.search(pattern, body_str)
    if match:
        body_str = body_str[:match.start()] + cheer_loop + "\n                    </div>\n                </div>" + body_str[match.end():]
        print("Replaced cheer messages container dynamically!")
    else:
        print("Warning: cheer-messages-container pattern not matched, keeping static fallback.")

    php_header = """<?php
/**
 * Team Birdman Trial (TBT) - 公式マスコット「とび斗くん」公式Webサイト
 * 
 * アートディレクション:
 * EDITORIAL PORTRAIT & HIGH-END EDITORIAL WEB
 * 「静かで上品な、白〜淡色の空気感。大きな余白と巨大な手描きのとび斗くん」
 * 航空機・アトリエの世界観を宿し、余白と構図で魅せる公式ブランドサイト。
 */

require_once __DIR__ . '/data.php';

// メッセージデータの初期化 & 読み込み
$messages = $default_cheers ?? [];
$messageFile = __DIR__ . '/data/messages.json';
if (file_exists($messageFile)) {
    $saved = json_decode(file_get_contents($messageFile), true);
    if (is_array($saved)) {
        $messages = $saved;
    }
}

// 共通ヘッダー読み込み
require_once __DIR__ . '/includes/header.php';
?>
"""

    php_footer = """<?php
// 共通フッター読み込み
require_once __DIR__ . '/includes/footer.php';
?>
"""

    full_index_php = php_header + "\n" + body_str + "\n" + php_footer

    with open(target_path, 'w', encoding='utf-8') as out:
        out.write(full_index_php)

    print(f"Generated {target_path} successfully! Size: {len(full_index_php)} bytes")

if __name__ == '__main__':
    restore_favorite_design()
