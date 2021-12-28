(function(){
/*
constants-enumeratedtype.js
var PlaceEventType = {
	VILLAGE: 0,
	TREASURE: 1,
	OCCUPATION: 2,
	SHOP: 3,
	GATE: 4,
	WAIT: 5,
	INFORMATION: 6,
	CUSTOM: 100
};
*/
// mapが開かれているシーンを確認
// リザルトシーンは既にMap攻略が終了しているので場所イベントのアイコン表示は不要だと判断した
function f_checkSceneType()
{
	return root.getBaseScene() === SceneType.FREE || root.getBaseScene() === SceneType.BATTLESETUP;
//	|| root.getBaseScene() === SceneType.BATTLERESULT;
}

//---------------------------------------
//　実行可能状態の場所イベントを保存する処理
//---------------------------------------
	MapLayer._CurrentmapPlaceEventList = null;
	
	MapLayer._setPlaceEventList = function() {
		var placeEvent, placeInfo, list, i, count, handle;
		var session = root.getCurrentSession();
		
		// 取得する場所イベントリストの記録を初期化
		this._CurrentmapPlaceEventList = [];
		
		if (session === null) return;
		
		// マップが開かれているシーン以外でmapInfoなどを取得しようとするとゲームの起動ができなくなる
		if (!f_checkSceneType()) return;
		
		if (session.getTurnType() !== TurnType.PLAYER) return;
		
		list = session.getPlaceEventList();
		count = list.getCount();
		for (i = 0; i < count; i++) {
			placeEvent = list.getData(i);
			
			if (placeEvent.getExecutedMark() === EventExecutedType.FREE && placeEvent.isEvent()) {
				placeInfo = placeEvent.getPlaceEventInfo();
				
				//　イベントの詳細情報から指定できるアイコン(エディタのイベントリストに表示されるもの)を使用する
				// if(handle === null)ではなく、isNullHandle()メソッドで判定しないとnullとして判定されない模様
				handle = placeEvent.getIconResourceHandle();
//				if (handle.isNullHandle()) root.log(placeInfo.getX() + ': '+ placeInfo.getY());
//				root.log('placeEvent: ' + placeInfo.getX() + ': '+ placeInfo.getY() + ' type:' + placeInfo.getPlaceEventType());
				//実行可能状態の場所イベントを格納 [x, y, イベントタイプ, iconハンドル]
				this._CurrentmapPlaceEventList.push([placeInfo.getX(), placeInfo.getY(), placeInfo.getPlaceEventType(), handle]);
			}
		}
	};
	
	var alias_prepareMapLayer = MapLayer.prepareMapLayer;
	MapLayer.prepareMapLayer = function() {
		alias_prepareMapLayer.call(this);
		
		this._setPlaceEventList();
	};
	
	// この関数で場所イベントリストを取得しないとイベント実行条件の成否を逐次判別できない
	// アクティブが特定座標に位置した時などに即座に検出できない
	// この方法だと毎フレーム、リストを取得しなおすので宜しくない。もっといい方法を要検討
//	var alias_moveMapLayer = MapLayer.moveMapLayer;
//	MapLayer.moveMapLayer = function() {
//		alias_moveMapLayer.call(this);
//		this._setPlaceEventList();
//	};
	
	// ターン切り替わり時に場所イベントの表示用リストを取得する
	// 場所イベント表示はプレイヤーへのアナウンスなので敵ターン中にリスト更新する必要は低いと判断した
	var _PlayerTurn_openTurnCycle = PlayerTurn.openTurnCycle;
	PlayerTurn.openTurnCycle = function () {
		_PlayerTurn_openTurnCycle.call(this);
		
		MapLayer._setPlaceEventList();
	};
	
	// 何らかのイベント終了時に場所イベントの実行可能条件の変更があった場合に備えて表示用リストを更新する
	var _PlayerTurn_doEventEndAction = PlayerTurn._doEventEndAction;
	PlayerTurn._doEventEndAction = function () {
		_PlayerTurn_doEventEndAction.call(this);
		
		MapLayer._setPlaceEventList();
	};
	
	var alias_drawMapLayer = MapLayer.drawMapLayer;
	MapLayer.drawMapLayer = function() {
		alias_drawMapLayer.call(this);
		
		if (root.getCurrentSession() !== null) {
			if (this._counter.getAnimationIndex2() % 2 === 0) {
				this._drawPlaceEventNotice();
			}
		}
	};
	
	// 場所イベントリストに対応したアイコンをマップ上に表示
	//　イベントの詳細情報から指定できるアイコン(エディタのイベントリストに表示されるもの)を使用する
	MapLayer._drawPlaceEventNotice = function() {
		var i, handle, x, y, placeEvent, eventType;
		
		// コンフィグで表示を許可していない場合
		if (root.getExternalData().env.PlaceEventNoticeSymbol !== 0) return;
		
		//イベントが実行中の時は表示しない
		if (root.isEventSceneActived()) return;
	
		var session = root.getCurrentSession();
		if (session === null) return;
		
		// マップが開かれているシーン以外でmapInfoなどを取得しようとするとゲームの起動ができなくなる
//		if (!f_checkSceneType()) return;
		
		var placeEventList = this._CurrentmapPlaceEventList;
		
//		var isRuntime = false; //ランタイムのアイコンリソースか否か
//		var iconId = 0; //アイコンのデータリストのid
		
		for (i = 0; i < placeEventList.length; i++) {
			//placeEvent is array [x, y, eventType]
			placeEvent = placeEventList[i];
			
			// 画面内か否か
			if (!CurrentMap.isMapInside(placeEvent[0], placeEvent[1]) || !MapView.isVisible(placeEvent[0], placeEvent[1])) {
				continue;
			}
			
			x = placeEvent[0] * GraphicsFormat.MAPCHIP_WIDTH - session.getScrollPixelX();
			y = placeEvent[1] * GraphicsFormat.MAPCHIP_HEIGHT - session.getScrollPixelY();
			
			eventType = placeEvent[2];
			//　PlaceEventType.CUSTOMは100が当てられているのでiconhandle用のxSrc値を任意に指定
//			if (eventType === PlaceEventType.CUSTOM) {
//				eventType = 7;
//			}
			
			handle = placeEvent[3];
//			if (handle.isNullHandle()) {
				// 以下はアイコン指定の代替処理(不使用) 
				// アイコンは同じリソース上に存在していることが前提
				// 左上(0, 0)を起点にして横方向にPlaceEventTypeの値をhandleのx座標として扱う
//				handle = root.createResourceHandle(isRuntime, iconId, 0, eventType, 0);
//			}
			if (handle.isNullHandle()) continue;
			
			GraphicsRenderer.drawImage(x, y, handle, GraphicsType.ICON);
		}
	};


//----------------------------------------------------------
// 環境設定に項目を追加
//----------------------------------------------------------
var _ConfigWindow__configureConfigItem = ConfigWindow._configureConfigItem;
ConfigWindow._configureConfigItem = function(groupArray) {
	_ConfigWindow__configureConfigItem.call(this, groupArray);
	
	groupArray.appendObject(ConfigItem.PlaceEventNoticeSymbol);
};

ConfigItem.PlaceEventNoticeSymbol = defineObject(BaseConfigtItem,
{
	selectFlag: function(index) {
		root.getExternalData().env.PlaceEventNoticeSymbol = index;
	},
	
	getFlagValue: function() {
		if (typeof root.getExternalData().env.PlaceEventNoticeSymbol !== 'number') {
			return 1;
		}
	
		return root.getExternalData().env.PlaceEventNoticeSymbol;
	},
	
	getFlagCount: function() {
		return 2;
	},
	
	getConfigItemTitle: function() {
		return '場所イベント表示';
	},
	
	getConfigItemDescription: function() {
		return '場所イベント(「調べる」コマンド等)のアイコンをマップ上に表示します';
	}
}
);

})();