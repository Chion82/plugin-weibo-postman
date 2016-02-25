import config from './config.es';
import fs from 'fs';

const { _, $, $$, React, FontAwesome, ReactBootstrap } = window;
const {Button, Label, Input} = ReactBootstrap;

const {server_login_url, server_host} = config;

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
                微博直播可将出击战绩和建造出货实时在你的微博上直播。<br />
                <span id="weibo-postman_hint">
                    请先登录你的微博账号。
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
                    <Input type="checkbox" id="weibo-postman_post_battle_result" label="直播出击战绩" defaultChecked={this.state.postBattleResult}
                        onClick={()=>{
                            if (!$('#weibo-postman_post_battle_result').checked) {
                                $('#weibo-postman_post_midway_result').checked = false;
                            }
                        }} />
                    <Input type="checkbox" id="weibo-postman_post_midway_result" label="直播道中战绩（如不勾选，只直播BOSS点的结果）" defaultChecked={this.state.postMidwayResult} />
                    <Input type="checkbox" id="weibo-postman_post_construct_result" label="直播建造出货" defaultChecked={this.state.postConstructResult} />
                    微博前缀文本：
                    <Input type="text" id="weibo-postman_text_prefix" defaultValue={this.state.textPrefix} />
                    微博后缀文本：
                    <Input type="text" id="weibo-postman_text_after" defaultValue={this.state.textAfter} />
                    <Button bsStyle="primary" onClick={this.saveConfig.bind(this)}>保存</Button>
                </div>
            </div>
		);
	}

	componentDidMount() {
        window.addEventListener('battle.result', this.handleBattleResultResponse.bind(this));
		window.addEventListener('game.response', this.handleResponse.bind(this));
	}

    componentWillMount() {
        this.getConfigFromFile();
    }

    judgeIfDemage(nowHp, beforeHp) {
        for (let index in nowHp) {
        if (nowHp[index] < beforeHp[index])
            return true;
        }
        return false;
    }

    getConfigFromFile() {
        let defaultConfig = {
            postBattleResult : true,
            postMidwayResult : false,
            postConstructResult : true,
            textPrefix : '',
            textAfter : ' --发送自poi-plugin-weibo-postman的微博直播'
        };
        try {
            fs.accessSync(window.APPDATA_PATH + '/poi-plugin-weibo-postman-config.json', fs.R_OK);
            let configObject = JSON.parse(fs.readFileSync(window.APPDATA_PATH + '/poi-plugin-weibo-postman-config.json', {encoding:'utf8'}));
            this.setState(configObject);
        } catch (err) {
            fs.writeFileSync(window.APPDATA_PATH + '/poi-plugin-weibo-postman-config.json', JSON.stringify(defaultConfig));
            this.setState(defaultConfig);
        }
    }

    saveConfig() {
        let configObject = {
            postBattleResult : $('#weibo-postman_post_battle_result').checked,
            postMidwayResult : $('#weibo-postman_post_midway_result').checked,
            postConstructResult : $('#weibo-postman_post_construct_result').checked,
            textPrefix : $('#weibo-postman_text_prefix').value,
            textAfter : $('#weibo-postman_text_after').value
        }
        fs.writeFileSync(window.APPDATA_PATH + '/poi-plugin-weibo-postman-config.json', JSON.stringify(configObject));
        this.setState(configObject);
        window.success('保存成功！');
    }

    postWeibo(text) {
        text = this.state.textPrefix + ' ' + text;
        text += (' ' + this.state.textAfter);
        if (text.length > 140) {
            text = text.substr(0, 137) + '...';
        }
        $('#weibo-postman_iframe').setAttribute('src', `${server_host}/api/post_weibo?text=${encodeURIComponent(text)}`);
        window.success('发送微博：' + text);
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
                selectedRank = "难度:丙";
				break;
            case 2:
                selectedRank = "难度:乙";
				break;
            case 3:
                selectedRank = "难度:甲";
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
                    rankStr = '勝利S';
                else
				 	rankStr ='完全勝利!!!S';
			    break;
            case 'A':
                rankStr = '勝利A';
				break;
            case 'B':
                rankStr = '戦術的勝利B';
				break;
            case 'C':
                rankStr = '戦術的敗北C';
				break;
            case 'D':
                rankStr = '敗北D';
				break;
            case 'E':
                rankStr = '敗北E';
				break;
            default:
                rankStr = `奇怪的战果？${rank}`;
				break;
		}
		let mapStr = `${quest}(${parseInt(map/10)}-${map%10})`;
		if (boss) {
			mapStr += '(BOSS点)';
		} else {
			mapStr += '(道中)';
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
		let dropShipStr = '无';
		if (dropShipId !== -1) {
			dropShipStr = window.$ships[dropShipId].api_name;
		}
		let resultStr = `${mapStr} ${selectedRank} ${rankStr} 掉落:${dropShipStr} 编成:${shipStr} MVP:${mvpStr} `;
		this.postWeibo(resultStr);
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
				let createType = '普通建造';
				if (this.state.largeFlag) {
					createType = '大型建造';
				}
				let createdShipName = window.$ships[apiData.api_created_ship_id].api_name;
				let createdShipType = window.$shipTypes[window.$ships[apiData.api_created_ship_id].api_stype].api_name;
				this.setState({createShipFlag: false});
				let resultStr = `${createType} 出货: ${createdShipType} ${createdShipName} 资源: 油${this.state.material[0]}弹${this.state.material[1]}钢${this.state.material[2]}铝${this.state.material[3]}资材${this.state.material[4]}`;
				this.postWeibo(resultStr);
				break;
		}
	}

}

let pluginInfo = {
    name : 'weibo-postman',
	displayName : 'Weibo Postman',
	priority : 10,
	show : true,
	author : 'Chion Tang',
	version : '1.0.0',
	reactClass : WeiboPostman
}

export default pluginInfo;
