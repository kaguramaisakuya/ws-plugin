import { sendSocketList, Config, Version } from '../../components/index.js'
import { setMsgMap } from '../../model/index.js'

Bot.on('notice', async e => {
    if (e.self_id == '88888') {
        if (e.group?.bot?.uin) {
            e.self_id = e.group.bot.uin
        } else if (e.friend?.bot?.uin) {
            e.self_id = e.friend.bot.uin
        }
        e.bot = Bot[e.self_id]
    }
    if (Config.muteStop && (e.group?.mute_left > 0 || e.group?.all_muted)) return false
    if (sendSocketList.length == 0) return false
    if (e.group_id) {
        // 判断云崽白名单群
        const whiteGroup = Config.whiteGroup
        if (Array.isArray(whiteGroup) && whiteGroup.length > 0) {
            if (!whiteGroup.some(i => i == e.group_id)) return false
        }
        // 判断插件白名单群
        const yesGroup = Config.yesGroup
        if (Array.isArray(yesGroup) && yesGroup.length > 0) {
            if (!yesGroup.some(i => i == e.group_id)) return false
        }
        // 判断云崽黑名单群
        const blackGroup = Config.blackGroup
        if (Array.isArray(blackGroup) && blackGroup.length > 0) {
            if (blackGroup.some(i => i == e.group_id)) return false
        }
        // 判断插件黑名单群
        const noGroup = Config.noGroup
        if (Array.isArray(noGroup) && noGroup.length > 0) {
            if (noGroup.some(i => i == e.group_id)) return false
        }
    }
    // 判断云崽黑名单QQ
    if (e.user_id && Array.isArray(Config.blackQQ)) {
        if (Config.blackQQ.some(i => i == e.user_id)) return false
    }
    e.reply = reply(e)
    let other = {}
    if (e.notice_type == 'group') {
        other.group_id = e.group_id
        other.user_id = e.user_id
        other.operator_id = e.operator_id
        switch (e.sub_type) {
            //群员增加
            case 'increase':
                if (!Config.groupIncrease) return false
                other.notice_type = 'group_increase'
                other.sub_type = 'approve'
                other.operator_id = e.user_id
                break;
            //群员减少
            case 'decrease':
                if (!Config.groupDecrease) return false
                other.notice_type = 'group_decrease'
                other.sub_type = e.operator_id == e.user_id ? 'leave' : 'kick'
                if (e.user_id == Bot.uin) other.sub_type = 'kick_me'
                break
            //戳一戳
            case 'poke':
                if (!Config.groupPoke) return false
                other.notice_type = 'notify'
                other.sub_type = 'poke'
                other.user_id = e.operator_id
                other.target_id = e.target_id
                break
            //群管理变动
            case 'admin':
                if (!Config.groupAdmin) return false
                other.notice_type = 'group_admin'
                other.sub_type = e.set ? 'set' : 'unset'
                break
            //禁言
            case 'ban':
                if (!Config.groupBan) return false
                other.notice_type = 'group_ban'
                other.sub_type = e.duration == 0 ? 'lift_ban' : 'ban'
                other.duration = e.duration
                break
            //群消息撤回
            case 'recall':
                if (!Config.groupRecall) return false
                other.notice_type = 'group_recall'
                other.message_id = e.rand
                break
            default:
                return false
        }
    } else if (e.notice_type == 'friend') {
        other.user_id = e.user_id
        switch (e.sub_type) {
            //好友添加
            case 'increase':
                if (!Config.friendIncrease) return false
                other.notice_type = 'friend_add'
                break
            //好友消息撤回
            case 'recall':
                if (!Config.friendRecall) return false
                other.notice_type = 'friend_recall'
                other.message_id = e.rand
                break
            default:
                return false
        }
    } else {
        return false
    }
    let msg = {
        time: Date.parse(new Date()) / 1000,
        self_id: e.self_id,
        post_type: 'notice',
        ...other
    }
    msg = JSON.stringify(msg)
    for (const i of sendSocketList) {
        if (i.status == 1) {
            switch (Number(i.type)) {
                case 1:
                case 2:
                    if (Version.isTrss) {
                        if (i.uin != e.self_id) continue
                        if (!Version.protocol.some(i => i == e.bot?.version?.name)) continue
                    }
                    i.ws.send(msg)
                    break;
                default:
                    break;
            }
        }
    }
})

function reply(e) {
    if (!Version.isTrss) {
        const replyNew = e.reply
        return async function (massage, quote = false, data = {}) {
            const ret = await replyNew(massage, quote, data)
            if (ret) {
                setMsgMap({
                    message_id: ret.message_id,
                    time: ret.time,
                    seq: ret.seq,
                    rand: ret.rand,
                    user_id: e.user_id,
                    group_id: e.group_id,
                    onebot_id: Math.floor(Math.random() * Math.pow(2, 32)) | 0,
                })
            }
            return ret
        }
    } else {
        if (e.bot?.version?.name == 'ICQQ') {
            return async function (massage, quote = false) {
                let ret
                if (e.isGroup) {
                    if (e.group?.sendMsg) {
                        ret = await e.group.sendMsg(massage, quote)
                    } else {
                        ret = await e.bot.pickGroup(e.group_id).sendMsg(massage, quote)
                    }
                } else {
                    if (e.friend?.sendMsg) {
                        ret = await e.friend.sendMsg(massage, quote)
                    } else {
                        ret = await e.bot.pickFriend(e.user_id).sendMsg(massage, quote)
                    }
                }
                if (ret) {
                    setMsgMap({
                        message_id: ret.message_id,
                        time: ret.time,
                        seq: ret.seq,
                        rand: ret.rand,
                        user_id: e.user_id,
                        group_id: e.group_id,
                        onebot_id: Math.floor(Math.random() * Math.pow(2, 32)) | 0,
                    })
                }
                return ret
            }
        }
        return e.reply
    }
}