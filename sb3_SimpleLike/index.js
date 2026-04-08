const config = {
    // QQ群
    // 输入all匹配使用群
    QQGroup: new Set([1029879634, 759676433, "all"]),

    // 点赞次数
    // 建议值 1-50
    LikeNum: 10,

    // 触发自动点赞的指令
    LikeCmd: "赞我"
};

// send msg
spark.on('message.group.normal', (pack, reply) => {
    if (!((config.QQGroup.has("all") 
        || config.QQGroup.has(pack.group_id)) 
        && pack.raw_message == config.LikeCmd
    )) return;
    spark.QClient.sendLike(pack.qq_uid, config.LikeNum);
    reply(`点赞完成! 你收获了 ${config.LikeNum} 个赞!`);
})