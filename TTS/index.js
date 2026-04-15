import { EdgeTTS } from 'edge-tts-universal';
import fs from 'fs/promises';

async function toTTS(text, voice, options, callback) {
    const tts = new EdgeTTS(text, voice, options);
    callback(
        Buffer.from(
            (await (await tts.synthesize()).audio.arrayBuffer())
        )
    );
}

// text 2 speak
toTTS("喵喵喵，你好喵~", 'zh-CN-XiaoyiNeural', {
    rate: '+10%', // 语速
    pitch: '+8Hz' // 音高
}, async (file) => {
    await fs.writeFile('output.mp3', file);
    console.log('ok');
});
