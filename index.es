const { _, $, $$, React, FontAwesome } = window;

let mapLv = [];

function judgeIfDemage(nowHp, beforeHp) {
  for (let index in nowHp) {
    if (nowHp[index] < beforeHp[index])
      return true;
	}
  return false;
}

class WeiboPostman extends React.Component {

	render() {
		return (
			<div><h1>Hello World</h1></div>
		);
	}

	componentDidMount() {
		window.addEventListener('battle.result', this.handleBattleResultResponse);
		window.addEventListener('game.response', this.handleResponse);
	}

	handleBattleResultResponse(e) {
		//出击结果
		//console.log(e.detail);
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
        if (judgeIfDemage(deckHp, beforeHp))
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
		let mapStr = `${quest}(${map/10}-${map%10})`;
		if (boss) {
			mapStr += '(BOSS点)';
		} else {
			mapStr += '(道中)';
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
		let resultStr = `${mapStr} ${selectedRank} ${rankStr} 掉落:${dropShipStr} 编队:${shipStr} MVP:${mvpStr} `;
		console.log(resultStr);
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
					this.largeFlag = (postBody.api_large_flag === "1");
					this.kdockId = parseInt(postBody.api_kdock_id);
					this.material = [parseInt(postBody.api_item1), parseInt(postBody.api_item2), parseInt(postBody.api_item3), parseInt(postBody.api_item4), parseInt(postBody.api_item5)];
					this.createShipFlag = true;
				}
				break;
			case '/kcsapi/api_get_member/kdock':
				if (!this.createShipFlag) {
					break;
				}
				let apiData = body[this.kdockId-1];
				let createType = '普通建造';
				if (this.largeFlag) {
					createType = '大型建造';
				}
				let createdShipName = window.$ships[apiData.api_created_ship_id].api_name;
				let createdShipType = window.$shipTypes[window.$ships[apiData.api_created_ship_id].api_stype].api_name;
				this.createShipFlag = false;
				let resultStr = `${createType} 出货: ${createdShipType} ${createdShipName} 资源: 油${this.material[0]}弹${this.material[1]}钢${this.material[2]}铝${this.material[3]}资材${this.material[4]}`;
				console.log(resultStr);
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
