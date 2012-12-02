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
    testGet();
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

/**
 * Method for retrieving JSON from server.
 * @Param: String email
 */
function get(email) {
    var request = $.ajax({
        type: 'GET',
        url: 'http://ec2-174-129-49-253.compute-1.amazonaws.com/user/'+email+'.com',
        dataType : 'jsonp'
    });
}

/**
 * Test method for getting static JSON from server.
 */
function testGet() {
    $.ajax({
        type: 'GET',
        url: '/static/sampleData/simpleReddit.json',
        dataType : 'json'
    })
        .success(function(data) {
           pages = data;
        })
        .error(function(data) {
            console.error(data);
        })
    ;
}