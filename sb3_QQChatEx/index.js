const AdminList = new Set([...spark.env.get("admin_qq")]);

const config = {
    // 转发聊天的群聊
    QQChat: 759676433,
  
    join: false, // 加入信息
    left: false,// 退出信息
    chat: true,// 聊天信息
  
    say: true,// 后台say信息
    runcmd: true,// 执行命令
  
    // 敏感词过滤
    wordFilter: true,
};

let WFilter = (t) => t;
if (ll.hasExported('WordFilter', 'filter') && config.wordFilter) WFilter = ll.imports('WordFilter', 'filter');

// === 消息转发 === //
ll.exports((msg) => spark.QClient.sendGroupMsg(config.QQChat, `${WFilter(msg)}`),"QQChatEx", "onSendChat");

if (config.join) mc.listen("onJoin", (pl) => spark.QClient.sendGroupMsg(config.QQChat, `${pl.realName} 进入服务器`));
if (config.left) mc.listen("onLeft", (pl) => spark.QClient.sendGroupMsg(config.QQChat, `${pl.realName} 退出服务器`));
if (config.say) mc.listen("onConsoleCmd", (cmd) => cmd.startsWith("say") ? spark.QClient.sendGroupMsg(config.QQChat, `[服务器娘] ${cmd.slice(4)}`) : true);

// 聊天 (MC -> QQ)
if (config.chat) mc.listen("onChat", (pl, msg) => {
    if (msg[0] === "+") return;
  
    spark.QClient.sendGroupMsg(config.QQChat, `[${{0: "主世界", 1: "下界", 2: "末地"}[pl.pos.dimid] || "未知"}]`
      + `${pl.getDevice()?.avgPing > 100 ? `[${pl.getDevice().avgPing}ms]` : ""}`
      + `${pl.realName} >> ${WFilter(msg)}`
    );
});

// 聊天 (QQ -> MC)
const indexOf = (msg, text) => msg.indexOf(text) !== -1;
spark.on('message.group.normal', async (pack) => {
    if (pack.group_id !== config.QQChat || pack.message.length === 0) return;

    const msg = (await formatMsg(pack.message, pack)).replace(/\n/g, "\\n");
    const replyId = (pack.message.find(t => t.type === 'reply'))?.data?.id ?? null;

    if (msg.startsWith("/") && AdminList.has(pack.user_id - 0) && config.runcmd) {
        if (msg.startsWith("/debug")) {
            /*if (indexOf(msg, "--reply") && replyId !== null) {
                const reply = (await spark.QClient.getMsg(replyId));
                const msgData = (await formatMsg(reply.message, reply)).match(/\[([^\]]+)\](?:\[[^\]]+\])?([^>]+)>>\s*(.+)/);
                spark.QClient.sendGroupMsg(config.QQChat, `${JSON.stringify(reply, null, 4)}\n\n${JSON.stringify(msgData, null, 4)} \nreplyId: ${replyId} ${replyId === null}`);
            }*/
            if (indexOf(msg, "--testmsg")){
                spark.QClient.sendGroupMsg(config.QQChat, `${JSON.stringify(pack, null, 4)}`);
            }
            return;
        }
        const res = mc.runcmdEx(msg)?.output ?? "nullptr";
        spark.QClient.sendGroupMsg(config.QQChat, res);
        logger.setTitle("QQCommand");
        logger.info(`${pack.sender.card || pack.sender.nickname} >> ${msg}\n>> ${res}\n`);
        logger.setTitle("Server");
        return;
    }

    if (!config.chat) return;
  
    let atMsg = "";
    if (replyId !== null) {
        const reply = (await spark.QClient.getMsg(replyId));
        const msgData = (await formatMsg(reply.message, reply)).match(/\[([^\]]+)\](?:\[[^\]]+\])?([^>]+)>>\s*(.+)/);
        if (msgData[2] !== null) atMsg = `@${msgData[2]}`;
    }

    mc.broadcast(`[§6群聊§r]${pack.sender.card || pack.sender.nickname} >> ${atMsg}${msg}`);
    logger.setTitle("QQBot");
    logger.info(`${pack.sender.nickname} >> ${atMsg}${msg}`);
    logger.setTitle("Server");
})

// === 函数区 === //

async function formatMsg(msg, pack = null) {
    if (!pack) {
        return msg.map(t => {
            if (t.type === 'text') return t.data.text;
            if (t.type === 'image') return "[图片]";
            if (t.type === 'face') return "[表情]";
            if (t.type === 'at') return '@' + t.data.qq;
        }).join("");
    }
    
    const promises = msg.map(async (t) => {
        switch (t.type) {
            case 'text': return t.data.text;
            case 'image': return "[图片]";
            case 'face': return "[表情]";
            case 'at': {
                const name = await getMemberName(pack.group_id, t.data.qq);
                return `@${name}`;
            }
        }
    });
    
    const results = await Promise.all(promises);
    return results.join("");
}

// 获取群成员名称
async function getMemberName(groupId, userId) {
    const info = await spark.QClient.getGroupMemberInfo(groupId, userId);
    return info.card || info.nickname || `${userId}`;
}
