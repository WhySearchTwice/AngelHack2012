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
var devicesSet = svg.set();

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

        // Create a little metadata about the page
        obj.width = ((obj.pageCloseTime - obj.pageOpenTime) / 500);
        obj.key = createKey(obj);

        //drawObjDom(obj);
        drawObjSvg(obj);
    }

    // Erase pages so it can be reused
    pages = null;
}

/**
 * Draw the tree object in the dom using SVG and Raphael
 * @Param: Tree object to draw
 * @Author: Tony Grosinger
 */
function drawObjSvg(obj) {
    // var deviceSet = getElementWithId(devicesSet, obj.deviceGuid);
    // if(deviceSet == null) {
    //     console.log("Creating a new deviceSet");
    //     deviceSet = svg.set();
    //     deviceSet.id = obj.deviceGuid;
    //     devicesSet.push(deviceSet);
    // }

    // var windowSet = getElementWithId(deviceSet, obj.windowId);
    // if(windowSet == null) {
    //     console.log("Creating a new windowSet");
    //     windowSet = svg.set();
    //     windowSet.id = obj.windowId;
    //     deviceSet.push(windowSet);
    // }

    // var tabSet = getElementWithId(windowSet, obj.tabId);
    // if(tabSet == null) {
    //     console.log("Creating a new tabSet");
    //     tabSet = svg.set();
    //     tabSet.id = obj.tabId;
    //     windowSet.push(tabSet);
    // }

    var xOffset = 0;
    for(var pageOpenTime in tree.devices[obj.deviceGuid].windows[obj.windowId].tabs[obj.tabId]) {
        // Ignore the current page
        if(pageOpenTime == obj.pageOpenTime) {
            continue;
        }
        var page = tree.devices[obj.deviceGuid].windows[obj.windowId].tabs[tabId].pages[pageOpenTime];
        xOffset = xOffset + page.width;
    }

    // Add the xOffset to the x value of the parent

    // Set the x value
    obj.x = xOffset;

    // Calculate the Y value based on how many other tabs have been opened in this window
    //obj.y = deviceSet.length * 100;
    //console.log("y: " + obj.y);

    // Set X, Y, and Height based on set information
    obj.height = 100;
    obj.y = 100;

    // Create a new node
    var newNode = drawNode(obj);
    //tabSet.push(node);

    obj.node = newNode;
    obj.containingSet = tabSet;
}

/**
 * Draw the tree object in the dom using divs
 * @Param: Tree object to draw
 * @Author: Ansel Santosa
 */
function drawObjDom(obj) {
    // Register page and create ID
        var pageId = ids[obj.deviceGuid + obj.windowId + obj.tabId + obj.pageOpenTime] = view.idCounter;
        view.idCounter++;

        // cache annoying selectors
        var windowSelector = '[windowid="num_' + obj.windowId + '"]';
        var tabSelector = '[tabid="num_' + obj.tabId + '"]';
        var parentTabSelector = '[tabid="num_' + obj.parentTabId + '"]';
        obj.attrs = ['tabId']; // extra DOM attributes that should be populated

        if ($(windowSelector + ' ' + parentTabSelector + ', ' + windowSelector + parentTabSelector).length != 0) {
            // parent of page is already created, add it
            $(windowSelector + ' ' + parentTabSelector + ', ' + windowSelector + parentTabSelector).last().addBranch(obj);
        } else if ($(windowSelector).length == 0) {
            // window does not exist, create it
            obj.attrs.push('windowId');
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

/**
 * Simply a shortcut for creating the generated ID that is used to identify each node in the IDs object
 * @Param: Page object stored in the trees global
 * @Return: String
 * @Author: Tony Grosinger
 */
function createKey(page) {
    return page.key || page.deviceGuid + page.windowId + page.tabId + page.pageOpenTime;
}

/**
 * Takes a key and attempts to parse it against items stored in the tree
 * @Param: Key to be parsed
 * @Return: Object from the tree or null
 * @Author: Tony Grosinger
 */
function parseKey(key) {
    for(var deviceGuid in tree.devices) {
        if(key.indexOf(deviceGuid) != 0) {
            // Not found here, try the next one
            continue;
        }

        // Remove the device guid from the key, then search for the window
        key = key.substring(deviceGuid.length);

        for(var windowId in tree.devices[deviceGuid].windows) {
            if(key.indexOf(windowId) != 0) {
                // Not found here, try the next one
                continue;
            }

            // Remove the windowId from the key, then search for the tab
            key = key.substring(windowId.length);

            for(var tabId in tree.devices[deviceGuid].windows[windowId]) {
                if(key.indexOf(tabId) != 0) {
                    // Not found here, try the next one
                    continue;
                }

                // Remove the tabId from the key, then search for the page
                key = key.substring(tabId.length);

                for(var pageOpenTime in tree.devices[deviceGuid].windows[windowId].tabs[tabId]) {
                    if(key.indexOf(pageOpenTime) != 0) {
                        // Not found here, try the next one
                        continue;
                    }

                    // We found it! Phew
                    return tree.devices[deviceGuid].windows[windowId].tabs[tabId].pages[pageOpenTime];
                }
            }
        }
    }

    // Nothing was found, sad day
    return null;
}

/**
 * Draws a node on the page. Will attempt to remove any existing node with this ID prior to drawing
 * @Param: page1 Page object stored in the tree object
 * @Param: set to add this node to (optional)
 * @Author: Tony Grosinger
 */
function drawNode(page) {
    // TODO: Look into animating this node to a new location rather than removing it

    pageId = createKey(page);
    var existingPage = svg.getById(pageId)
    if(existingPage != null) {
        existingPage.remove();
    }

    var newNode = svg.rect(page.x, page.y, page.width, page.height);
    newNode.id = pageId;

    return newNode;
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
    var newPath = container.path("M " + x1 + "," + y1 + " Q " + xMid + "," + yMid + " " + x2 + "," + y2);
    newPath.id = "path_" + createKey(page1) + "_" + createKey(page2);
}

/**
 * Given a Raphael Set, find an element within it that has a given ID
 * @Param: Set
 * @Param: String
 * @Return: Raphael Element or null
 * @Author: Tony Grosinger
 */
function getElementWithId(set, id) {
    for(var index in set.items) {
        var object = set.items[index];
        if(object.id == id) {
            return object
        }
    }
    return null;
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