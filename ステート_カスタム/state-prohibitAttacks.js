/*
■ファイル名
state-prohibitAttacks.js

■SRPG Studio対応バージョン
ver.1.3031

■プラグインの概要
「攻撃を禁止する」ステートを実装します。

エディタで設定できる「封印」ステートは、該当する武器やアイテムが使用（装備）不可となりパラメータボーナスやスキルも作動しなくなりますが
本プラグインで実装するステートは戦闘での攻撃（反撃）が、できなくなるだけで装備アイテムの効果は有効のままです。

■使用方法
1.このプラグインをpluginフォルダに入れる
2．任意のステートを作成する
3．2で作成したステートのidを本プラグイン内(45行目付近)の STATE_ID に設定する

4．AIのステート評価値を変更したい場合、ステートのカスタムパラメータに任意の値を設定する
{
  addScore: 20
}

ステートスコアの参考値(StateScoreChecker.getScoreの戻り値）
・初期値 -1
・相手がステート無効orステートが付与されている -1を返して終了;

・自然回復値（0ではない）の絶対値を加算
・相手が封印に該当する武器、アイテムを所持していれば +5
・オプション行動禁止+5, 暴走+25
・パラメータボーナスの絶対値を加算


■作成者
ran

■更新履歴
2024/11/09 新規作成

*/

(function() {

// ステートid
var STATE_ID = 0;

// 該当するステートが付与されているかを判定する
function func_checkState(unit, id)
{
	var state = root.getBaseData().getStateList().getDataFromId(id);
	return StateControl.getTurnState(unit, state) !== null;
}

// 攻撃コマンドを許可しないようにする
var _AttackChecker_isUnitAttackable = AttackChecker.isUnitAttackable;
AttackChecker.isUnitAttackable = function(unit) {	
	if (func_checkState(unit, STATE_ID) === true) {
		return false;
	}
	
	return _AttackChecker_isUnitAttackable.call(this, unit);
};

// targetUnitがunitに反撃できない扱いにする
var _AttackChecker_isCounterattack = AttackChecker.isCounterattack;
AttackChecker.isCounterattack = function(unit, targetUnit) {
	if (func_checkState(targetUnit, STATE_ID) === true) {
		return false;
	}
	
	return _AttackChecker_isCounterattack.call(this, unit, targetUnit);
};

// AIの武器による攻撃行動を作成しないようにする
var _CombinationCollector_Weapon__isWeaponEnabled = CombinationCollector.Weapon._isWeaponEnabled;
CombinationCollector.Weapon._isWeaponEnabled = function(unit, item, misc) {
	if (func_checkState(unit, STATE_ID) === true) {
		return false;
	}
	
	// AI設定で「許可しない行動：武器による攻撃」にチェックが入っている または 武器を装備できない ならfalse
	return _CombinationCollector_Weapon__isWeaponEnabled.call(this, unit, item, misc);
};

// 戦闘中に該当ステートが付与されたら攻撃を続行しないようにする
var _VirtualAttackControl__isAttackStopState = VirtualAttackControl._isAttackStopState;
VirtualAttackControl._isAttackStopState = function(virtualAttackUnit, state) {
	if (state !== null && state.getId() === STATE_ID) {
		return true;
	}
	
	return _VirtualAttackControl__isAttackStopState.call(this, virtualAttackUnit, state);
};

// AIのステートの評価値にカスタムパラメータで指定した値を加算する
var _StateScoreChecker_getScore = StateScoreChecker.getScore;
StateScoreChecker.getScore = function(unit, targetUnit, state) {
	var result = _StateScoreChecker_getScore.call(this, unit, targetUnit, state);
	var plus;

	// 本来の結果が-1（該当ステートが無効or既に付与されている）なら-1を返して終了
	if (result === -1) return result;
	
	if (state === root.getBaseData().getStateList().getDataFromId(STATE_ID)) {
		plus = typeof state.custom.addScore === 'number' ? state.custom.addScore : 5;
		result += plus;
		if (result < 0) result = -1;
	}
	
	return result;
};


})();
