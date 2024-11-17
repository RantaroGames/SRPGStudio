/*
■ファイル名
state-prohibitAttacks.js

■SRPG Studio対応バージョン
ver.1.304

■プラグインの概要
「攻撃を禁止する」ステートを実装します。

エディタで設定できる「封印」ステートは、該当する武器やアイテムが使用（装備）不可となりパラメータボーナスやスキルも作動しなくなりますが
本プラグインで実装するステートは戦闘での攻撃（反撃）が、できなくなるだけで装備アイテムの効果は有効のままです。

■使用方法
1.このプラグインをpluginフォルダに入れる
2．任意のステートを作成する
3．ステートのカスタムパラメータに任意の数値(※)を設定する
{
  prohibitAttacks: 5
}

※数値はステートの評価値（AIがステートを付与する行動を取る基準値）に関連しています。
数値が大きいほどステート攻撃を使用する頻度が高くなりますが
一方で敵を倒せる攻撃をせずにステート付与が優先される、といったケースも起こりえます。

※ステートスコアの参考値(StateScoreChecker.getScoreの戻り値）
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
2024/11/17 ステートの指定方法を変更

*/

(function() {

// 該当するステートが付与されているかを判定する
function func_checkState(unit)
{
	var i, turnState;
	var list = unit.getTurnStateList();
	var count = list.getCount();
	
	for (i = 0; i < count; i++) {
		turnState = list.getData(i);
		if (turnState === null) continue;

		if (typeof turnState.getState().custom.prohibitAttacks === 'number') {
			return true;
		}
	}
	
	return false;
}

// 攻撃コマンドを許可しないようにする
var _AttackChecker_isUnitAttackable = AttackChecker.isUnitAttackable;
AttackChecker.isUnitAttackable = function(unit) {	
	if (func_checkState(unit) === true) {
		return false;
	}
	
	return _AttackChecker_isUnitAttackable.call(this, unit);
};

// targetUnitがunitに反撃できない扱いにする
var _AttackChecker_isCounterattack = AttackChecker.isCounterattack;
AttackChecker.isCounterattack = function(unit, targetUnit) {
	if (func_checkState(targetUnit) === true) {
		return false;
	}
	
	return _AttackChecker_isCounterattack.call(this, unit, targetUnit);
};

// AIの武器による攻撃行動を作成しないようにする
var _CombinationCollector_Weapon__isWeaponEnabled = CombinationCollector.Weapon._isWeaponEnabled;
CombinationCollector.Weapon._isWeaponEnabled = function(unit, item, misc) {
	if (func_checkState(unit) === true) {
		return false;
	}
	
	// AI設定で「許可しない行動：武器による攻撃」にチェックが入っている または 武器を装備できない ならfalse
	return _CombinationCollector_Weapon__isWeaponEnabled.call(this, unit, item, misc);
};

// 戦闘中に該当ステートが付与されたら攻撃を続行しないようにする
var _VirtualAttackControl__isAttackStopState = VirtualAttackControl._isAttackStopState;
VirtualAttackControl._isAttackStopState = function(virtualAttackUnit, state) {
	if (state !== null && typeof state.custom.prohibitAttacks === 'number') {
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
	if (result < 0) return result;

	plus = state.custom.prohibitAttacks;
	if (typeof plus !== 'number' || plus < 1) {
		plus = 5;
	}
	
	result += plus;
		
	return result;
};


})();
