var tree = {
    devices: {},
    getDevice: treeGetDevice,
    getWindow: treeGetWindow,
    getTab: treeGetTab
};
var pages = {};

/* Initialize */
(function() {
    fetchData();
    testGet();
    parseData();
})();

$.fn.createChild = function(data) {
    $(this).appendChild('<div class="site"></div>');
};

function fetchData() {
    // get data
    for (var i = 0, l = pages.length; i < l; i++) {

    }
}

function parseData() {
    for(var objId in pages) {
        var obj = pages[objId];

        // Ensure device exists
        var device = tree.getDevice(obj.deviceGuid);
        if(device == null) {
            tree.devices[obj.deviceGuid] = {windows: {}};
            device = tree.getDevice(obj.deviceguid);
        }

        // Ensure window exists
        var window = tree.getWindow(obj.deviceGuid, obj.windowId);
        if(window == null) {
            device.windows[obj.windowId] = {tabs:{}};
            window = tree.getWindow(obj.deviceGuid, obj.windowId);
        }

        // Ensure tab exists
        var tab = tree.getTab(obj.deviceGuid, obj.windowId, obj.tabId);
        if(tab == null) {
            window.tabs[obj.tabId] = {pages: {}};
            tab = tree.getTab(obj.deviceGuid, obj.windowId, obj.tabId);
        }

        // Create the page in the tab
        // TODO: This might be cleared whenever the pages variable is reset
        tab.pages[obj.pageOpenTime] = obj;
    }
}

/**
 * Retrieve the device layer of organization from the window object
 * @Param: String deviceGuid The id of the device that is being searched for
 * @Return: Object device object or null if it does not exist
 */
function treeGetDevice(deviceGuid) {
    return this.tree[deviceGuid] || null;
}

/**
 * Retrieve the window layer of organization from the window object
 * @Param: String deviceGuid The id of the device that is being searched for
 * @Param: String windowId The id of the window that is being searched for
 * @Return: Object window object or null if it does not exist
 */
function treeGetWindow(deviceGuid, windowId) {
    if (this.tree.getDevice(deviceGuid) == null) {
        console.error('Device GUID does not exist');
        return null;
    }

    return this.tree[deviceGuid].windows[windowId] || null;
}

/**
 * Retrieve the tab layer of organization from the window object
 * @Param: String deviceGuid The id of the device that is being searched for
 * @Param: String windowId The id of the window that is being searched for
 * @Param: String tabId The id of the tab that is being searched for
 * @Return: Object tab object or null if it does not exist
 */
function treeGetTab(deviceGuid, windowId, tabId) {
    if (this.tree.getDevice(deviceGuid) == null) {
        console.error('Device GUID does not exist');
        return null;
    }

    if (this.tree.getWindow(windowId) == null) {
        console.error('Window does not exist');
        return null;
    }

    return this.tree[deviceGuid].windows[windowId].tabs[tabId] || null;
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