import config from './config.es';
import fs from 'fs';
import i18n_2 from 'i18n-2';
import path from 'path';

const { _, $, $$, React, FontAwesome, ReactBootstrap } = window;
const {Button, Label, Input} = ReactBootstrap;
const {server_login_url, server_host} = config;

window.i18n.weiboPostman = new i18n_2({
    locales:['en-US', 'zh-CN', 'zh-TW'],
    defaultLocale: 'en-US',
    directory: path.join(__dirname, 'i18n'),
    extension: '.json',
    devMode: false
});
window.i18n.weiboPostman.setLocale(window.language);
const __ = window.i18n.weiboPostman.__.bind(i18n.weiboPostman);

let mapLv = [];

class WeiboPostman extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            createShipFlag : false,
            largeFlag : false,
            material : [],
            kdockId : -1,
            textPrefix : '',
            textAfter : '',
            postBattleResult : true,
            postMidwayResult : true,
            postConstructResult : true
        };
    }

    render() {
        return (
            <div style={{padding: '10px'}}>
                {__('pluginDescriptionUI')}<br />
                <span id="weibo-postman_hint">
                    {__('hintLoginWeibo')}
                </span>
                <iframe src={server_login_url} id="weibo-postman_iframe" style={{width:'100%', height:'300px'}}
                    onLoad={()=>{
                        let iframeContent = $('#weibo-postman_iframe').contentDocument.body.innerHTML;
                        if (iframeContent.indexOf('"status": 200') === -1) {
                            $('#weibo-postman_hint').style.display = 'block';
                            $('#weibo-postman_iframe').style.display = 'block';
                            $('#weibo-postman_config_panel').style.display = 'none';
                            if ($('#weibo-postman_iframe').getAttribute('src').indexOf('https://api.weibo.com/oauth2/authorize') === -1) {
                                $('#weibo-postman_iframe').setAttribute('src', server_login_url);
                            }
                        } else {
                            $('#weibo-postman_hint').style.display = 'none';
                            $('#weibo-postman_iframe').style.display = 'none';
                            $('#weibo-postman_config_panel').style.display = 'block';
                        }
                    }}
                ></iframe>
                <div id="weibo-postman_config_panel">
                    <Input type="checkbox" id="weibo-postman_post_battle_result" label={__('postBattleResult')} defaultChecked={this.state.postBattleResult}
                        onClick={()=>{
                            if (!$('#weibo-postman_post_battle_result').checked) {
                                $('#weibo-postman_post_midway_result').checked = false;
                            }
                        }} />
                    <Input type="checkbox" id="weibo-postman_post_midway_result" label={__('postMidwayResult')} defaultChecked={this.state.postMidwayResult}
                        onClick={()=>{
                            if ($('#weibo-postman_post_midway_result').checked) {
                                $('#weibo-postman_post_battle_result').checked = true;
                            }
                        }} />
                    <Input type="checkbox" id="weibo-postman_post_construct_result" label={__('postConstructResult')} defaultChecked={this.state.postConstructResult} />
                    <Input type="checkbox" id='weibo-postman_post_get_image' label={__('postGetImage')} defaultChecked={this.state.postGetImage} />
                    {__('weiboTextPrefix')}
                    <Input type="text" id="weibo-postman_text_prefix" defaultValue={this.state.textPrefix} />
                    {__('weiboTextAfter')}
                    <Input type="text" id="weibo-postman_text_after" defaultValue={this.state.textAfter} />
                    <Button bsStyle="primary" onClick={this.saveConfig.bind(this)}>{__('save')}</Button>
                </div>
            </div>
        );
    }

    componentDidMount() {
        window.addEventListener('battle.result', this.handleBattleResultResponse.bind(this));
        window.addEventListener('game.response', this.handleResponse.bind(this));
    }

    componentWillMount() {
        this.getConfig();
    }

    judgeIfDemage(nowHp, beforeHp) {
        for (let index in nowHp) {
        if (nowHp[index] < beforeHp[index])
            return true;
        }
        return false;
    }

    getConfig() {
        let configSettings = {
            postBattleResult : window.config.get('weiboPostman.postBattleResult', true),
            postMidwayResult : window.config.get('weiboPostman.postMidwayResult', false),
            postConstructResult : window.config.get('weiboPostman.postConstructResult', true),
            postGetImage: window.config.get('weiboPostman.postGetImage', true),
            textPrefix : window.config.get('weiboPostman.textPrefix', ''),
            textAfter : window.config.get('weiboPostman.textAfter', __('defaultTextAfter'))
        };
        this.setState(configSettings);
    }

    saveConfig() {
        let configSettings = {
            postBattleResult : $('#weibo-postman_post_battle_result').checked,
            postMidwayResult : $('#weibo-postman_post_midway_result').checked,
            postConstructResult : $('#weibo-postman_post_construct_result').checked,
            postGetImage : $('#weibo-postman_post_get_image').checked,
            textPrefix : $('#weibo-postman_text_prefix').value,
            textAfter : $('#weibo-postman_text_after').value
        }
        this.setState(configSettings);
        window.config.set('weiboPostman.postBattleResult', configSettings.postBattleResult);
        window.config.set('weiboPostman.postMidwayResult', configSettings.postMidwayResult);
        window.config.set('weiboPostman.postConstructResult', configSettings.postConstructResult);
        window.config.set('weiboPostman.postGetImage', configSettings.postGetImage);
        window.config.set('weiboPostman.textPrefix', configSettings.textPrefix);
        window.config.set('weiboPostman.textAfter', configSettings.textAfter);
        window.success(__('saveSuccess'));
    }

    cropWeiboText(text) {
        let byteCount = 0;
        for (let i=0;i<text.length;i++) {
            if (/[\x00-\x7F]{1}/.test(text.charAt(i))) {
                byteCount ++;
            } else {
                byteCount += 2;
            }
            if (byteCount >= 276) {
                return text.substr(0, i) + '...';
            }
        }
        return text;
    }

    postWeibo(text, apiShipId=-1) {
        if (!this.state.postGetImage) {
            apiShipId = -1;
        }
        text = this.state.textPrefix + ' ' + text;
        text += (' ' + this.state.textAfter);
        text = this.cropWeiboText(text);
        $('#weibo-postman_iframe').setAttribute('src', `${server_host}/api/post_weibo?text=${encodeURIComponent(text)}&api_ship_id=${encodeURIComponent(apiShipId)}`);
        window.success(__('sentWeibo') + text);
    }

    handleBattleResultResponse(e) {
        //出击结果
        if (!this.state.postBattleResult) {
            return;
        }
        let {map, quest, boss, mapCell, rank, deckHp, deckShipId, enemy, dropItem, dropShipId, combined, mvp} = e.detail;
        let selectedRank = "";
        switch (mapLv[map]) {
            case 1:
                selectedRank = __('eventRankEasy');
                break;
            case 2:
                selectedRank = __('eventRankMedium');
                break;
            case 3:
                selectedRank = __('eventRankHard');
                break;
        }
        let beforeHp = deckShipId.map((id) => {
        if (id !== -1)
            return window._ships[id].api_nowhp;
        else
            return -1;
        });
        let rankStr = '';
        switch (rank) {
            case 'S':
                if (this.judgeIfDemage(deckHp, beforeHp))
                    rankStr = __('rankS');
                else
                     rankStr = __('rankSS');
                break;
            case 'A':
                rankStr = __('rankA');
                break;
            case 'B':
                rankStr = __('rankB');
                break;
            case 'C':
                rankStr = __('rankC');
                break;
            case 'D':
                rankStr = __('rankD');
                break;
            case 'E':
                rankStr = __('rankE');
                break;
            default:
                rankStr = `${__('rankUnknown')}${rank}`;
                break;
        }
        let mapStr = `${quest}(${parseInt(map/10)>30?'E':parseInt(map/10)}-${map%10})`;
        if (boss) {
            mapStr += __('bossPoint');
        } else {
            mapStr += __('midwayPoint');
            if (!this.state.postMidwayResult) {
                return;
            }
        }
        let shipNameArray = [];
        for (let shipId of deckShipId) {
            if (shipId === -1)
                continue;
            shipNameArray.push(window._ships[shipId].api_name + 'Lv.' + window._ships[shipId].api_lv);
        }
        let shipStr = shipNameArray.join(', ')
        let mvpStr = window._ships[deckShipId[mvp[0]]].api_name;
        let dropShipStr = __('none');
        if (dropShipId !== -1) {
            dropShipStr = window.$ships[dropShipId].api_name;
        }
        let resultStr = `${mapStr} ${selectedRank} ${rankStr} ${__('drop')}${dropShipStr} ${__('fleet')}${shipStr} MVP:${mvpStr} `;
        this.postWeibo(resultStr, dropShipId);
    }

    handleResponse(e) {
        let {body, postBody} = e.detail;

        switch (e.detail.path) {
            //活动海域等级（甲鱼、咸鱼）
            case '/kcsapi/api_get_member/mapinfo':
                for (let map of body) {
                    mapLv[map.api_id] = 0;
                    if (map.api_eventmap)
                        mapLv[map.api_id] = map.api_eventmap.api_selected_rank;
                }
                //console.log(mapLv);
                break;
            //建造
            case '/kcsapi/api_req_kousyou/createship':
                if (body.api_result === 1) {
                    let state = {
                        largeFlag : (postBody.api_large_flag === "1"),
                        kdockId : parseInt(postBody.api_kdock_id),
                        material : [parseInt(postBody.api_item1), parseInt(postBody.api_item2), parseInt(postBody.api_item3), parseInt(postBody.api_item4), parseInt(postBody.api_item5)],
                        createShipFlag : true
                    }
                    this.setState(state);
                }
                break;
            case '/kcsapi/api_get_member/kdock':
                if (!this.state.createShipFlag || !this.state.postConstructResult) {
                    this.setState({createShipFlag: false});
                    break;
                }
                let apiData = body[this.state.kdockId-1];
                let createType = __('normalConstruct');
                if (this.state.largeFlag) {
                    createType = __('largeConstruct');
                }
                let createdShipName = window.$ships[apiData.api_created_ship_id].api_name;
                let createdShipType = window.$shipTypes[window.$ships[apiData.api_created_ship_id].api_stype].api_name;
                this.setState({createShipFlag: false});
                let resultStr = `${createType} ${__('createdResult')} ${createdShipType} ${createdShipName} ${__('material')} ${__('fuel')}${this.state.material[0]}${__('ammor')}${this.state.material[1]}${__('steel')}${this.state.material[2]}${__('aluminum')}${this.state.material[3]}${__('merchandise')}${this.state.material[4]}`;
                this.postWeibo(resultStr, apiData.api_created_ship_id);
                break;
        }
    }

}

let pluginInfo = {
    name : 'weibo-postman',
    displayName : (<span><FontAwesome key={0} name='weibo' /> {__('pluginDisplayName')}</span>),
    description : __('pluginDescription'),
    link : 'https://github.com/Chion82/plugin-weibo-postman',
    priority : 10,
    show : true,
    author : 'Chion Tang',
    version : '1.1.0',
    reactClass : WeiboPostman
}

export default pluginInfo;
