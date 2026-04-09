const { Buffer } = require('buffer');
const https = require('https');
const http = require('http');

const config = {
    // QQ群
    // 输入all匹配使用群
    QQGroup: new Set([1029879634, 759676433, "all"]),

    // 光遇的触发指令
    cmd: new Map([
        ["/光遇 每日任务", "https://api.qmkjcm.cn/api/gy/rwt/images/sc_image.jpg"],
        ["/光遇 复刻先祖", "https://api.qmkjcm.cn/api/gy/fk/images/sc_image.jpg"],
        ["/光遇 大蜡烛", "https://api.qmkjcm.cn/api/gy/dlz/images/sc_image.jpg"],
        ["/光遇 活动", "https://api.qmkjcm.cn/api/gy/ac"]
    ])
};

spark.on('message.group.normal',async (pack, reply) => {
    if (!((config.QQGroup.has("all") 
        || config.QQGroup.has(pack.group_id)) 
        && config.cmd.has(pack.raw_message)
    )) return;
    reply(spark.msgbuilder.img("base64://" + (await url2base(config.cmd.get(pack.raw_message)))));
})

function url2base(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        client.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => {
                resolve(Buffer.concat(chunks).toString('base64'));
            });
        }).on('error', reject);
    });
}