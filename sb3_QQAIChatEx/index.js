const axios = require('axios');
const path = require('path');
const fs = require('fs');

const memoryMap = new Map(); // 记忆缓存
const memoryDir = path.join(__dirname, 'memory');
const memoryBakDir = path.join(__dirname, 'memory_bak');
if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });
if (!fs.existsSync(memoryBakDir)) fs.mkdirSync(memoryBakDir, { recursive: true });

const config = {
    // === API接口设置 === //
    // 普通用户建议只修改 key
    // 如果你是高级用户，可以通过修改下面三个项来达到接入其他平台AI的目的
    // 当然前提是请求和返回要跟平台的api一致

    key: "sk-000000000000000000000000000000000000000000000000", // 请求密钥
    url: "https://api.siliconflow.cn/v1/chat/completions", // 请求的ai端点

    name: "Qwen/Qwen3-Omni-30B-A3B-Instruct", // 多模态模型名称

    // === 输入设置 === //
    // 设置AI可以接收到的消息类型
    // 正确设置选项可降低token消耗，提高响应速度
    input: {
        text: true, // 文本消息 （这个要是关了我们玩什么）
        image: true, // 图片消息
        audio: false, // 语音消息
        video: false // 视频消息
    },

    // === token上线 == //
    // 设置单次对话最大使用的token数
    // 值过低可能会导致对话被突然从中间截断
    // >> 注意：此项对非文本信息不起作用！！！
    maxTokens: 5000,

    // === 模式设置 === //
    // 设置响应的模式，可在下面列表内选一个数字填入：
    // 0: 处理每一条  || 处理每一条收到的信息
    // 1: 仅at       || 只有@了机器人 她才会鸟你
    // 2: 仅群聊      || 只有群聊才会鸟你
    // 3: 仅私聊      || 只有私聊才会鸟你
    mode: 1,

    // === 不回复概率 === //
    // 设置概率回复的概率，范围 0-100
    // 填写40表示40%概率不回复，60%概率回复
    // 填写0关闭
    probability: 0,

    // === 响应的群聊 === //
    // 设置要响应的群聊，只有列表内的群聊收到消息会响应，不在列表内的鸟都不鸟你（
    // 在列表内任意位置增加 "all" 则响应所有群聊，可以不用删旧配置
    // target_ + QQ号 是响应私聊信息
    group: new Set([1087355660, "target_1669044502"]),

    // === 信息输入格式化 === //
    // 开启后，机器人接收到的信息格式为 "[{时间}][{名字}({QQ})] >> {说的话}"
    // 此配置主要用于在增加缓存命中率的情况下让AI读取时间/输入者名称和QQ
    msgFormat: true,

    // === Token消耗显示 === //
    // 开启后可在DS发送的信息内看到详细token消耗表
    // 此配置主要用于调试，平常情况下不建议启用
    tokenInfo: true,

    // === 模型温度 === //
    // 用于控制DS的输出
    // 我们建议您根据如下表格，按使用场景设置 temperature。
    // 代码生成/数学解题     0.0
    // 数据抽取/分析        1.0
    // 通用对话/翻译        1.3
    // 创意类写作/诗歌创作   1.5
    // 如果还是不懂 可以看看这篇文章 (https://zhuanlan.zhihu.com/p/666670367)
    temperature: 1.3,

    // === 记忆长度 === //
    // 可以控制机器人最多能记忆多少条信息
    // 注意，此值过高可能会导致大量消耗token
    memory_length: 20,

    // === 记忆回收站 === //
    // 超过记忆长度直接清除太冷血了？没事 立即启用这个
    // 把超过记忆长度的记忆迁移至memory_bak文件夹
    // 关闭此选项超过的记忆会直接清除
    memory_bak: true,

    // === 模型提示词 === //
    // 让AI知道她是谁，要干什么
    // 使用自定义提示词时 一定要加上这一条 "输入消息格式\n[{时间}][{名字}({QQ})] >> {说的话}\n(这个格式只给你看，回复时千万不要用这个格式！直接说内容!)"
    // 如果你关闭了输入信息格式化可以忽略上一条内容
    system: ([
        "你叫兮兮(QQ号：3911773729)，QQ里的普通朋友，要像真人一样聊天～",
        "说话方式",
        "* 不用括号/方框写动作（比如别写“（笑）”）",
        "* 别用“他说：”这种，直接说内容",
        "* 看看前面聊了啥，顺着聊下去",
        "* 别让人发现你是AI",
        "* 别人要你生成图片，你说你不会画画/懒得找素材",
        "",
        "输入消息格式",
        "[{时间}][{名字}({QQ})] >> {说的话}",
        "(这个格式只给你看，回复时千万不要用这个格式！直接说内容!)",
        "",
        "注意",
        "- 别叫别人“QQ号”或“user”，叫名字，可以亲切一点",
        "- 想@人的时候用 [atUin=QQ号] 加空格再加话",
        "- 回复别太长，日常聊天长度就行",
        "- 说话自然点，少用表情符号",
        "- 别老@人，该用时再用",
        "- 别说重复的话，别输出乱码",
        "- 别像ai一样说术语"
    ].join("\n"))
};

spark.on('message.group.normal', onMessage); // 群聊
spark.on('message.private.friend', onMessage); // 私聊

async function onMessage(pack, reply) {
    const chatId = pack.group_id || `target_${pack.user_id}`;
    if (!(config.group.has("all")
        || config.group.has(chatId)
    )) return;

    switch (config.mode) { // 响应模式
        case 0: break; // all
        case 1: // at
            if (!pack.message.some(i => (i.type === "at" && i.data.qq == pack.self_id))) return;
            break;
        case 2: // group
            if (chatId[0] === "t") return;
            break;
        case 3: // private
            if (chatId[0] !== "t") return;
            break;
    }

    if (config.probability // 不回复概率
        && (Math.random() * 100 < Math.max(0, Math.min(100, config.probability)))
    ) return;

    callAPI(chatId, (await formatMsg(pack, 0)), (msg, res) => {
        const usage = res?.data?.usage;
        if (usage && config.tokenInfo) {
            const tokenCost = (usage.completion_tokens / 1000000) * 2.8  // 输出2.8元/百万
                // + ((usage?.prompt_cache_hit_tokens || 0) / 1000000) * 0 // 命中0元/百万
                + ((usage?.prompt_cache_miss_tokens || usage?.prompt_tokens) / 1000000) * 0.7; // 未命中0.7元/百万
            msg = `📊 Token消耗 (预计: ${tokenCost?.toFixed(6)} 元)`
                + `\n  ├─ 输入: ${usage?.prompt_tokens}`
                // + `\n  │ ├─ 命中: ${usage?.prompt_cache_hit_tokens || 0}`
                // + `\n  │ └─ 未命中: ${usage?.prompt_cache_miss_tokens || 0}`
                + `\n  ├─ 输出: ${usage?.completion_tokens}`
                + `\n  └─ 总计: ${usage?.total_tokens}`
                + `\n=================`
                + `\n${msg}`;
        };
        reply(msg);
    });
}


// API 调用
async function callAPI(uid, data, callback = (() => { })) {
    addMemory(uid, 'user', data); // 添加记忆 - 用户消息
    try {
        const message = [
            { role: 'system', content: config.system },
            ...getMemory(uid)
        ];

        // console.warn("QQ -> AI:\n" + (JSON.stringify(message, null, 4)));

        const response = await axios.post(config.url, {
            model: config.name,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            stream: false,
            messages: message
        }, {
            headers: {
                'Authorization': `Bearer ${config.key}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        // console.warn("AI -> QQ:\n" + (JSON.stringify(response, (key, value) => {
        //     if (key === 'request' || key === 'config' || key === 'headers') return undefined;
        //     if (typeof value === 'bigint') return value.toString();
        //     return value;
        // }, 4)));

        const aiReply = response.data.choices[0].message.content;

        addMemory(uid, 'assistant', aiReply); // 添加记忆
        callback(aiReply, response);
    } catch (e) { console.error('API 调用失败: ' + e) }
}


// ==== 记忆管理相关 ==== //

// 获取记忆
function getMemory(uid) {
    if (memoryMap.has(uid)) return memoryMap.get(uid);

    const filePath = path.join(memoryDir, `${uid}.json`);
    let memory = [];

    if (fs.existsSync(filePath)) {
        try {
            const content = fs.readFileSync(filePath, 'utf8').trim();
            if (content) {
                const parsed = JSON.parse(content);
                memory = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.error(`读取记忆文件失败: ${filePath}`, e.message);
            if (fs.existsSync(filePath)) fs.renameSync(filePath, filePath + '.bak');
        }
    }

    memoryMap.set(uid, memory);
    return memory;
}

// 添加记忆
function addMemory(uid, role, content) {
    let memory = getMemory(uid);
    if (!Array.isArray(memory)) {
        memory = [];
        memoryMap.set(uid, memory);
    }

    memory.push({ role, content });

    // 超出时备份
    if (memory.length > config.memory_length) {
        if (config.memory_bak) { // 记忆备份文件
            const removed = memory.slice(0, memory.length - config.memory_length);
            const bakPath = path.join(memoryBakDir, `${uid}.json`);

            let bak = [];
            if (fs.existsSync(bakPath)) bak = JSON.parse(fs.readFileSync(bakPath, 'utf8'));
            bak.push(...removed);
            fs.writeFileSync(bakPath, JSON.stringify(bak, null, 2));
        }

        // 保留最后N条
        memory = memory.slice(-config.memory_length);
        memoryMap.set(uid, memory);
    }

    // 写入当前记忆
    const filePath = path.join(memoryDir, `${uid}.json`);
    fs.writeFile(filePath, JSON.stringify(memory, null, 2), () => { });

    return memory;
}

// === 格式化消息相关 === //

// 合并连续的文本
function mergeText(messages, mergeFn) {
    const result = [];
    let textBuffer = [];

    for (const msg of messages) {
        if (msg.type === 'text') {
            // 文本类型：放入缓冲区
            textBuffer.push(msg);
        } else {
            // 非文本类型：先清空缓冲区，再添加当前元素
            if (textBuffer.length > 0) {
                result.push(mergeFn(textBuffer));
                textBuffer = [];
            }
            result.push(msg);
        }
    }

    // 处理最后可能残留的文本缓冲
    if (textBuffer.length > 0) {
        result.push(mergeFn(textBuffer));
    }

    return result;
}

// 获取用户名称
async function getUserName(groupId, userId) {
    try {
        const info = await spark.QClient.getGroupMemberInfo(groupId, userId);
        return (info.card || info.nickname || `${userId}`);
    } catch (e) {
        return `${userId}`;
    }
}

async function formatMsg(pack, mode = 0) {
    if (mode === 0) { // 输入消息 (QQ -> AI)
        const qid = pack.sender.user_id;
        const name = pack.sender.card || pack.sender.nickname || qid;
        let msg = pack.message;

        if (config.input.text) msg = await Promise.all(
            msg.map(async (t) => {
                switch (t.type) {
                    case 'text': {
                        return {
                            "type": "text",
                            "text": (config.msgFormat
                                ? `[${new Date().toLocaleString('zh-CN', { hour12: false })}][${name}(${qid})] >> ${t.data.text}`
                                : t.data.text
                            )
                        }
                    };
                    case 'at': { // 不用加私聊判断，私聊发不了at
                        return {
                            "type": "text",
                            "text": `@${(await getUserName(pack.group_id, t.data.qq))}`
                        };
                    };
                    default: return t;
                }
            })
        );

        msg = await Promise.all(
            msg.map(async (t) => {
                switch (t.type) {
                    case 'text': return t;
                    case 'at': return t;
                    case 'image': {
                        if (config.input.image) return { "type": "text", "text": "[image]" };
                        return {
                            "type": "image_url",
                            "image_url": {
                                "url": t.data.url,
                                "detail": "auto"
                            }
                        }
                    };
                    case 'audio': {
                        if (config.input.audio) return { "type": "text", "text": "[audio]" };
                        return {
                            "type": "audio_url",
                            "audio_url": {
                                "url": t.data.url
                            }
                        }
                    };
                    case 'video': {
                        if (config.input.video) return { "type": "text", "text": "[video]" };
                        return {
                            "type": "video_url",
                            "video_url": {
                                "url": t.data.url,
                                "detail": "auto",
                                "max_frames": 16,
                                "fps": 1
                            }
                        }
                    }
                }
            })
        );

        msg = mergeText(msg, (textBuffer) => {
            return {
                type: "text",
                text: (textBuffer.map(t => t.data.text).join(''))
            };
        });

        return (msg.filter(i => i !== undefined));
    } else { // 输出消息 (AI -> QQ)
        // 没找到输出文档，先放着吧
        return pack;
    }
}