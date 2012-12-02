var tree = {
    devices: {},
    getDevice: treeGetDevice,
    getWindow: treeGetWindow,
    getTab: treeGetTab
};
var pages = {};
var view = {
    time: {
        range: 600000,
        now: 1352957097873,
        width: window.innerWidth,
        modifier: function () {
            return this.time.width / this.time.range;
        }
    },
    idCounter: 0
};
var ids = {};

/* Initialize */
(function() {
    $.fn.moveInto = function(parent) {
        $(parent).append($(this).detach());
        return this;
    };

    $.fn.addStem = function(data) {
        addChild(this, data, 'stem');
        return this;
    }

    $.fn.addBranch = function(data) {
        addChild(this, data, 'branch');
        return this;
    }

    testGet('multiWindow.json');
})();

function addChild(parent, data, type) {
    $site = $('\
        <div class="' + type + '" id="page_' + ids[data.deviceGuid + data.windowId + data.tabId + data.pageOpenTime] + '">\
            <div class="site">' + data.pageUrl + '</div>\
        </div>\
    ');
    if (data.hasOwnProperty('parentTabId')) {
        $site.attr('parenttabid', 'num_' + data.parentTabId);
    }
    if (data.hasOwnProperty('attrs')) {
        for (var i = 0, l = data.attrs.length; i < l; i++) {
            $site.attr(data.attrs[i], 'num_' + data[data.attrs[i]]);
        }
    }
    $(parent).append($site);
};

/**
 * Parse the data retrieved from the get request and sort it into the tree object.
 * Will clear the pages object when completed and call function to draw each node as it runs.
 * @Author: Tony Grosinger
 */
function parseData() {
    for(var objId in pages) {
        var obj = pages[objId].value;

        // Ensure device exists
        console.log("Retrieving device");
        var device = tree.getDevice(obj.deviceGuid);
        if(device == null) {
            tree.devices[obj.deviceGuid] = {windows: {}};
            device = tree.getDevice(obj.deviceGuid);
        }

        // Ensure window exists
        console.log("Retrieving window");
        var window = tree.getWindow(obj.deviceGuid, obj.windowId);
        if(window == null) {
            device.windows[obj.windowId] = {tabs: {}};
            window = tree.getWindow(obj.deviceGuid, obj.windowId);
        }

        // Ensure tab exists
        console.log("Retrieving tab");
        var tab = tree.getTab(obj.deviceGuid, obj.windowId, obj.tabId);
        if(tab == null) {
            window.tabs[obj.tabId] = {pages: {}};
            tab = tree.getTab(obj.deviceGuid, obj.windowId, obj.tabId);
        }

        // Create the page in the tab
        console.log("Saving page");
        tab.pages[obj.pageOpenTime] = obj;

        // Register page and create ID
        var pageId = ids[obj.deviceGuid + obj.windowId + obj.tabId + obj.pageOpenTime] = view.idCounter;
        view.idCounter++;

        if ($('[windowid="num_' + obj.windowId + '"]').length == 0) {
            obj.attrs = ['windowId'];
            if ($('[tabid="num_' + obj.tabId + '"]').length == 0) {
                obj.attrs.push('tabId');
            }
            $('#timeline').addBranch(obj);
        } else if ($('[windowid="num_' + obj.windowId + '"] [tabid="num_' + obj.tabId + '"], [windowid="num_' + obj.windowId + '"][tabid="num_' + obj.tabId + '"]').length == 0) {
            obj.attrs = ['tabId'];
            $('[windowid="num_' + obj.windowId + '"]').addBranch(obj);
        } else {
            $('[tabid="num_' + obj.tabId + '"]').addStem(obj);
        }
        //$('[windowid="num_' + obj.windowId + '"] [tabid="num_' + obj.tabId + '"] .branch').moveInto($('#page_' + pageId));
        $('[parenttabid="num_' + obj.tabId + '"] .branch').moveInto($('#page_' + pageId));
    }

    // Erase pages so it can be reused
    pages = null;
}

/**
 * Retrieve the device layer of organization from the window object
 * @Param: String deviceGuid The id of the device that is being searched for
 * @Return: Object device object or null if it does not exist
 * @Author: Tony Grosinger
 */
function treeGetDevice(deviceGuid) {
    return this.devices[deviceGuid] || null;
}

/**
 * Retrieve the window layer of organization from the window object
 * @Param: String deviceGuid The id of the device that is being searched for
 * @Param: String windowId The id of the window that is being searched for
 * @Return: Object window object or null if it does not exist
 * @Author: Tony Grosinger
 */
function treeGetWindow(deviceGuid, windowId) {
    if (this.getDevice(deviceGuid) == null) {
        console.error('Device GUID does not exist');
        return null;
    }

    return this.devices[deviceGuid].windows[windowId] || null;
}

/**
 * Retrieve the tab layer of organization from the window object
 * @Param: String deviceGuid The id of the device that is being searched for
 * @Param: String windowId The id of the window that is being searched for
 * @Param: String tabId The id of the tab that is being searched for
 * @Return: Object tab object or null if it does not exist
 * @Author: Tony Grosinger
 */
function treeGetTab(deviceGuid, windowId, tabId) {
    if (this.getDevice(deviceGuid) == null) {
        console.error('Device GUID does not exist');
        return null;
    }

    if (this.getWindow(deviceGuid, windowId) == null) {
        console.error('Window does not exist');
        return null;
    }

    return this.devices[deviceGuid].windows[windowId].tabs[tabId] || null;
}

/**
 * Method for retrieving JSON from server. Results are saved to pages global object
 * @Param: String email
 * @Author: Chris Gilbert
 */
function get(email) {
    var request = $.ajax({
        type: 'GET',
        url: 'http://ec2-174-129-49-253.compute-1.amazonaws.com/user/'+email+'.com',
        dataType : 'jsonp'
    });
}

/**
 * Test method for getting static JSON from server. Results are saved to pages global object
 * @Param: String filename
 * @Author: Chris Gilbert
 */
function testGet(filename) {
    $.ajax({
        type: 'GET',
        url: '/static/sampleData/' + filename,
        dataType : 'json'
    })
        .success(function(data) {
           pages = data;
           parseData();
        })
        .error(function(data) {
            console.error(data);
        })
    ;
}