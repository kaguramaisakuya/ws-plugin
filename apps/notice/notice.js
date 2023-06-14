import { socketList, Config } from '../../components/index.js'

Bot.on('notice', async e => {
    if (socketList.length == 0) {
        return false
    }
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
    socketList.forEach(socket => {
        if (socket.type != 3) {
            socket.send(msg)
        }
    })
})