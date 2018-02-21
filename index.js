// require
const puppeteer = require('puppeteer');

// 引数の処理
if (process.argv.length < 4) {
    console.error('Usage: npm start https://example.com/ example.png');
    process.exit();
}

const AccessUrl = process.argv[2];
const SavePath = process.argv[3];

// メイン処理
(async () => {

    // ブラウザの起動
    const browser = await puppeteer.launch();

    try {
        const page = await browser.newPage();
        page.setViewport({
            width: 1920,
            height: 1080,
        })

        // デバッグ用に console.log を nodejs 側に渡す
        page.on('console', msg => console.log(msg.text()));

        // サイトにアクセスする
        await page.goto(AccessUrl);

        // 色差を計算するために chroma をページ内で読み込む
        await page.addScriptTag({
            url: 'https://cdnjs.cloudflare.com/ajax/libs/chroma-js/1.3.6/chroma.min.js',
        });

        // アクセスしたあと JS の動きを考慮してちょっと待機する
        await page.waitFor(10);

        // 色差が一定以上のものを探す
        await page.evaluate(() => {
            // 全要素を探索していく
            document.querySelectorAll('*').forEach((element) => {
                // テキストノード、または SVG を子に持っている要素を探す
                let foundChildNode = Array.prototype.filter.call(element.childNodes, (e) => {
                    let status = false;
                    status = status || (e.nodeType === Node.TEXT_NODE && e.textContent.trim().length > 0);
                    status = status || e.nodeName.toLowerCase() === 'svg';
                    return status;
                });
                if (foundChildNode.length === 0) {
                    return;
                }

                // 計算されたスタイルから色を取得
                let elementStyle = window.getComputedStyle(element);
                let fontColor = elementStyle.color;
                let backgroundColor = elementStyle.backgroundColor;

                // 色差を計算する
                let colorDiff = chroma.deltaE(fontColor, backgroundColor);

                // 計算された色差に透明度の色差を加える（透明度の差分 * 0.5 * 100）
                colorDiff += (Math.abs(chroma(fontColor).alpha() - chroma(backgroundColor).alpha()) * 0.5) * 100;

                // 色差が大きいものは無視
                if (colorDiff > 40) {
                    return;
                }

                // 色差が小さいものに色付けをする
                console.log(`${element.nodeName}(${element.className}): color=${fontColor}, backgroundColor=${backgroundColor}, diff=${colorDiff}`)
                element.style.cssText = element.style.cssText + 'border: 3px dashed red !important;';
            });
        });


        // スクリーンショットを撮ってみる
        await page.screenshot({path: SavePath});

    } catch(ex) {
        console.error(ex);
    }

    // ブラウザを終了する
    await browser.close();

})();
