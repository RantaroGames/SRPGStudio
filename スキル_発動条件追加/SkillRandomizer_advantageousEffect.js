/*
■ファイル名
SkillRandomizer_advantageousEffect.js

■SRPG Studio対応バージョン
ver.1.3031

■プラグインの概要
「相性有利な武器を装備している場合のみ」スキル発動を許可する処理を加えます。

武器タイプの相性設定で有利な設定（どれか一つでもパラメータに正数を指定している場合）があった時のみ
特定のカスタムパラメータが設定されたスキルの発動を許可します。

■使用方法
1.このプラグインをpluginフォルダに入れる
2．スキルのカスタムパラメータに以下の設定を記述する

{
  advantageousEffect: 1
}

※変則的な相性設定にしている場合について
武器相性で相手の装備武器に負数を設定している場合
advantageousEffect: 2 を指定することでスキル発動者側が有利とみなして判定するようになります。

■適用されるスキルについて
本プラグインで操作できるのは発動型のスキル（先制や連続など）に限られます。

発動率が設定できないスキル（再攻撃、クリティカル可能など）には適用されません。
またカスタムスキルを実装しているプラグインで発動率を考慮しない処理になっているスキルも対象外になります。


■作成者
ran

■更新履歴
2024/10/30 新規作成

*/

(function() {

//-------------------------------------------------------
// スキル発動条件に「相性有利な武器を装備している場合」を追加する
//-------------------------------------------------------
var _SkillRandomizer__isSkillInvokedInternal = SkillRandomizer._isSkillInvokedInternal;
SkillRandomizer._isSkillInvokedInternal = function(active, passive, skill) {
	var result = _SkillRandomizer__isSkillInvokedInternal.call(this, active, passive, skill);
	var weapon, compatible, advantageousEffect;
	
	// 本来の判定でスキル不発なので処理を終える
	if (result === false) return result;
	
	// 相性有利な攻撃で発動するスキルが設定されていない
	advantageousEffect = skill.custom.advantageousEffect;
	if (typeof advantageousEffect !== 'number') return result;
	
	// スキル発動者の武器に相性が設定されているかを調べる
	// 自分or相手が武器を装備していない、武器タイプに相性が設定されていない 場合はnullが返る
	weapon = ItemControl.getEquippedWeapon(active);
	compatible = CompatibleCalculator._getCompatible(active, passive, weapon);

	// 有利な武器ではない
	if (fnc_isAdvantageous(compatible, false) === false) {
		// 相手の武器に相性設定されているケースも調べる
		if (advantageousEffect === 2) {
			weapon = ItemControl.getEquippedWeapon(passive);
			compatible = CompatibleCalculator._getCompatible(passive, active, weapon);
			
			// 相手の武器に負数が設定されていた場合は相対的に有利とみなす
			if (fnc_isAdvantageous(compatible, true) === true) return result;
		}
		
		return false;
	}
	
	return result;
};

//-------------------------------------------------------
// 相性有利な武器であるか否かを判定する
//-------------------------------------------------------
function fnc_isAdvantageous(compatible, opponentCheck)
{
	if (compatible === null) return false;

	if (!opponentCheck) {
		// 何か一つでも正数が設定されていたら相性有利とみなす
		if (compatible.getPower() > 0 || compatible.getDefense() > 0 || compatible.getHit() > 0 || compatible.getAvoid() > 0 ||
			compatible.getCritical() > 0 || compatible.getCriticalAvoid() > 0 || compatible.getAgility() > 0)
		{
			return true;
		}
	}
	else {
		// 対戦相手の武器に何か一つでも負数が設定されていたら相性有利とみなす
		if (compatible.getPower() < 0 || compatible.getDefense() < 0 || compatible.getHit() < 0 || compatible.getAvoid() < 0 ||
			compatible.getCritical() < 0 || compatible.getCriticalAvoid() < 0 || compatible.getAgility() < 0)
		{
			return true;
		}
	}
	
	return false;
}


///-------------------------------------------------------
// スキル情報ウィンドウに説明を追加する
//-------------------------------------------------------
var alias001 = SkillInfoWindow.drawWindowContent;
SkillInfoWindow.drawWindowContent = function(x, y) {
	if (this._skill === null) return;
	
	var range;
	var length = this._getTextLength();
	var textui = this.getWindowTextUI();
	var color = ColorValue.INFO;//textui.getColor();
	var font = textui.getFont();
	var ySpace = ItemInfoRenderer.getSpaceY();
	var text = '相性有利な武器を装備中';
	
	alias001.call(this, x, y);
	y += alias002.call(this) - ySpace
	
	if (typeof this._skill.custom.advantageousEffect === 'number') {
		range = createRangeObject();
		
		range.x = x;
		range.y = y;
		range.width = this.getWindowWidth() - (DefineControl.getWindowXPadding() * 2);
		range.height = GraphicsFormat.ICON_HEIGHT;
		
		TextRenderer.drawRangeText(range, TextFormat.LEFT, text, -1, color, font);
		y += ySpace;
	}
};

var alias002 = SkillInfoWindow.getWindowHeight;
SkillInfoWindow.getWindowHeight = function() {
	var height = alias002.call(this);
	
	if (this._skill === null) return height;
	
	if (typeof this._skill.custom.advantageousEffect === 'number') {
		height += ItemInfoRenderer.getSpaceY();
	}
	
	return height;
};

})();
