var tree = {
    windows: {},
    contains: treeContains,
    getWindow: treeGetWindow,
    getTab: treeGetTab
};
var pages = {};

/* Initialize */
(function() {
    fetchData();
})();

$.fn.createChild = function(data) {
    $(this).appendChild('<div class="site"></div>');
};

function fetchData() {
    // get data
    for (var i = 0, l = pages.length; i < l; i++) {

    }
}

function treeContains(key) {
    for (var i = 0, l = this.windows.length; i < l; i++) {
        if (typeof this.windows[key] !== 'undefined') {
            return true;
        }
    }
    return false;
}

function treeGetWindow(id) {
    return this.window[id] || false;
}

function treeGetTab(id) {
    if (!this.contains(id)) { console.error('Window ID does not exist'); }
}
