// Storage for parsed page views
var tree = {
    devices: {},
    getDevice: treeGetDevice,
    getWindow: treeGetWindow,
    getTab: treeGetTab
};

// Temporary storage for items loaded in the GET requests
var pages = {};

// ???
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

// Map of generated keys to an id used on the page
var ids = {};

// SVG element that holds all the nodes and paths
//var svg = Raphael("container", document.width, document.height);
var svg = Raphael("container", 500, 500);

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

    // Load the test data
    testGet('multiWindow.json');
})();

function addChild(parent, data, type) {
    // Create basic site container node
    $site = $('\
        <div class="' + type + '" id="page_' + ids[data.deviceGuid + data.windowId + data.tabId + data.pageOpenTime] + '">\
            <div class="site">' + data.pageUrl + '</div>\
        </div>\
    ');

    // Add extra attributes
    if (data.hasOwnProperty('parentTabId')) {
        $site.attr('parenttabid', 'num_' + data.parentTabId);
    }
    if (data.hasOwnProperty('attrs')) {
        for (var i = 0, l = data.attrs.length; i < l; i++) {
            $site.attr(data.attrs[i], 'num_' + data[data.attrs[i]]);
        }
    }

    // add node to DOM
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

        // cache annoying selectors
        var windowSelector = '[windowid="num_' + obj.windowId + '"]';
        var tabSelector = '[tabid="num_' + obj.tabId + '"]';

        if ($(windowSelector).length == 0) {
            // window does not exist, create it
            obj.attrs = ['windowId', 'tabId'];  // DOM attributes that should be populated
            $('#timeline').addBranch(obj);
        } else if ($(windowSelector + ' ' + tabSelector + ', ' + windowSelector + tabSelector).length == 0) {
            // windows exists but tab does not
            obj.attrs = ['tabId'];
            $(windowSelector).addBranch(obj);
        } else {
            // window and tab exists
            $(windowSelector + ' ' + tabSelector + ', ' + windowSelector + tabSelector).addStem(obj);
        }
        // find existing child nodes, move them under the new node
        $('[parenttabid="num_' + obj.tabId + '"] .branch').moveInto($('#page_' + pageId));
    }

    // Erase pages so it can be reused
    pages = null;
}

/**
 * Simply a shortcut for creating the generated ID that is used to identify each node in the IDs object
 * @Param: Page object stored in the trees global
 * @Return: String
 * @Author: Tony Grosinger
 */
function createKey(page) {
    return obj.deviceGuid + obj.windowId + obj.tabId + obj.pageOpenTime;
}

/**
 * Draws a path connecting two nodes on the page. Bottom-Middle of page1 to Left-Middle of page2
 * @Param: page1, page2 Page objects stored in the tree object
 * @Author: Tony Grosinger
 */
function drawConnectingPath(page1, page2) {
    // Determine the location to create the path
    var x1 = page1.attr("x") + (page1.attr("width") / 2);
    var y1 = page1.attr("y") + page1.attr("height");

    var x2 = page2.attr("x");
    var y2 = page2.attr("y") + (page2.attr("height") / 2);

    var xMid = x1;
    var yMid = y2;

    // Create the path and set some metadata
    var newPath = container.path("M " + x1 +"," + y1 + " Q " + xMid + "," + yMid + " " + x2 + "," y2);
    newPath.id = "path_" + createKey(page1) + "_" + createKey(page2);
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