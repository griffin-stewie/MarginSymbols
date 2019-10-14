function setMarginSymbolsVisible(context, selected, visible) {
  // log(`context:${context}, selected:${selected}, visible:${visible}`);
  if (selected) {
    // target selected only
    let selectedLayers = context.selection;
    let selectedCount = selectedLayers.count();
    if (selectedCount == 0) {
      log("No layers are selected.");
    } else {
      // symbolID をkeyにした map に MSSymbolMaster インスタンスを保持しておいて、最後に `setIncludeBackgroundColorInInstance` をセットする
      setMarginSymbolsVisibleIn(selectedLayers, visible);
    }
  } else {
    // target all
    log("target all");
    let doc = context.document;
    let currentPage = doc.currentPage();
    let artboard = currentPage.currentArtboard();
    // log(`currentPage: ${currentPage}`);
    // log(`artboard: ${artboard}`);
    if (artboard == null) {
      // log(artboard.layers());
      context.document.showMessage(`⚠️ Please select an artboard!`);
      return
    }

    let targetLayer = artboard

    let layers = []
    traverseLayers(targetLayer, layer => {
      // log(`★traverseLayers: ${layer}`);
      layers.push(layer)
    })
    setMarginSymbolsVisibleIn(layers, visible);
  }
}

// 名前のチェックと型をチェックし、 MSSymbolMaster が返せる場合だけ返す
function validSymbolMaster(layer) {
  let symbol = null;

  if (layer.isKindOfClass(MSSymbolInstance)) {
    symbol = layer.symbolMaster();
  } else if (layer.isKindOfClass(MSSymbolMaster)) {
    symbol = layer;
  }

  if (symbol != null && !containsValidName(symbol)) {
    return null;
  }

  return symbol
}

// 型をチェックし、 MSSymbolMaster が返せる場合だけ返す
function getSymbolMaster(layer) {
  let symbol = null;

  if (layer.isKindOfClass(MSSymbolInstance)) {
    symbol = layer.symbolMaster();
  } else if (layer.isKindOfClass(MSSymbolMaster)) {
    symbol = layer;
  }

  return symbol
}

// "margin" ではじまる名前が付いたオブジェクトかどうか判定
function containsValidName(layer) {
  // log(`containsValidName arg is ${layer}`);
  // log(`containsValidName arg's ${layer.wrapObject(layer)}`);
  let name = layer.name().toLowerCase();
  return name.startsWith('margin')
}

// 任意のLayer以下のレイヤーを再帰的にたどってコールバックを呼び出す。callback には layer が引数として渡され戻り値はない。再帰的にたどるのは Group 系と Symbol 系。
// コールバックされる layer を Array にまとめると実質階層構造をフラットにしたような構成になる。
function traverseLayers(layer, callback) {
  callback(layer)
  if (isGroup(layer)) {
    let children = layer.layers()
    if (children != null || children.count() > 0) {
      Array.from(children).forEach(sublayer => {
        traverseLayers(sublayer, callback)
      });
    }
  } else if (isSymbol(layer)) {
    let master = getSymbolMaster(layer)
    if (master != null) {
      traverseLayers(master, callback)
    }
  }
}

// 引数が Group と見なせるオブジェクトかどうかを判定。Group の場合は true を返す
function isGroup(layer) {
  if (layer.isKindOfClass(MSArtboardGroup) || layer.isKindOfClass(MSLayerGroup) || layer.isKindOfClass(MSPage)) {
    return true
  }

  return false
}

// 引数が Symbol と見なせるオブジェクトかどうかを判定。Symbol(Instance, Master 両方) の場合は true を返す
function isSymbol(layer) {
  return layer.isKindOfClass(MSSymbolInstance) || layer.isKindOfClass(MSSymbolMaster)
}

// layers 引数が命名規則に沿ったSymbolだった場合に visible 引数を適用していきシンボルの可視・不可視を変更する
function setMarginSymbolsVisibleIn(layers, visible) {
  log(`setMarginSymbolsVisibleIn layers: ${layers}`);
  let count = Array.from(layers).length;
  // symbolID をkeyにした map に MSSymbolMaster インスタンスを保持しておいて、最後に `setIncludeBackgroundColorInInstance` をセットする
  let cache = new Map();
  for (let i = 0; i < count; i++) {
    let layer = layers[i];
    // log(layer.class());
    let symbol = validSymbolMaster(layer);
    if (symbol != null) {
      let key = symbol.symbolID();
      if (cache.get(key) === undefined) {
        cache.set(symbol.symbolID(), symbol);
      }
    }
  }

  for (let [key, symbol] of cache) {
    symbol.setIncludeBackgroundColorInInstance(visible);
  }
}

/// 現在のページにある全てのレイヤーを対象にマージン用シンボルインスタンスに対してだけ Lock or Unlock を実行する
function setMarginSymbolsLock(context, isLocked) {
  let doc = context.document;
  let currentPage = doc.currentPage();
  let artboard = currentPage.currentArtboard();
  // log(`currentPage: ${currentPage}`);
  // log(`artboard: ${artboard}`);

  if (artboard == null) {
    context.document.showMessage(`⚠️ Please select an artboard!`);
    return
  }

  let targetLayer = artboard


  let layers = []
  traverseLayers(targetLayer, layer => {
    // log(`★traverseLayers: ${layer}`);
    layers.push(layer)
  })
  setMarginSymbolsLockIn(layers, isLocked);
}

/// 渡された Layer 配列に含まれるマージン用シンボルインスタンスに対してだけ Lock or Unlock を実行する
function setMarginSymbolsLockIn(layers, isLocked) {
  /// マージン用の SymbolInstance だけを取り出す
  let instances = Array.from(layers).filter(isValidSymbolInstance)

  /// Lock 状態を変更する
  instances.forEach(symbol => {
    symbol.setIsLocked(isLocked);
  });
}

// 名前のチェックと型をチェックし、マージン用の MSSymbolInstance の場合だけ `true` を返す
function isValidSymbolInstance(layer) {
  if (!containsValidName(layer)) {
    return false;
  }

  return layer.isKindOfClass(MSSymbolInstance)
}

/* Exported Function */

export function showAllMarginSymbols(context) {
  setMarginSymbolsVisible(context, false, true);
};

export function hideAllMarginSymbols(context) {
  setMarginSymbolsVisible(context, false, false);
};

export function showSelectedMarginSymbols(context) {
  setMarginSymbolsVisible(context, true, true);
};

export function hideSelectedMarginSymbols(context) {
  setMarginSymbolsVisible(context, true, false);
};

export function lockAllMarginSymbols(context) {
  setMarginSymbolsLock(context, true)
}

export function unlockAllMarginSymbols(context) {
  setMarginSymbolsLock(context, false);
}