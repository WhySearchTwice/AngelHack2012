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

var pageStartTime = 1352957091993;
var nodeSizeScalingFactor = 200;

// Map of generated keys to an id used on the page
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
            window.maxYOffset = 0; // Used when stacking tabs within the window
        }

        // Ensure tab exists
        console.log("Retrieving tab");
        var tab = tree.getTab(obj.deviceGuid, obj.windowId, obj.tabId);
        if(tab == null) {
            window.tabs[obj.tabId] = {pages: {}};
            tab = tree.getTab(obj.deviceGuid, obj.windowId, obj.tabId);
            tab.yOffset = window.maxYOffset + 50; // Used when stacking tabs within the window
            window.maxYOffset += 50;
        }

        // Create the page in the tab
        console.log("Saving page");
        tab.pages[obj.pageOpenTime] = obj;

        // Create a little metadata about the page
        obj.width = ((obj.pageCloseTime - obj.pageOpenTime) / nodeSizeScalingFactor);
        obj.x = ((obj.pageOpenTime - pageStartTime) / nodeSizeScalingFactor);
        obj.y = tab.yOffset;
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
    // Create a rectangle to represent this element
    var newNode = createSvgNode(obj);

    // Attempt to get the group for this device
    var deviceGroupId = "group_" + obj.deviceGuid;
    var deviceGroup = document.getElementById(deviceGroupId);

    // If the device group is null, create it
    if(deviceGroup == null) {
        deviceGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        deviceGroup.setAttribute("id", deviceGroupId);
        document.getElementById("svgContainer").appendChild(deviceGroup);
    }

    // Attempt to get the group for this window
    var windowGroupId = "group_" + obj.deviceGuid + obj.windowId;
    var windowGroup = document.getElementById(windowGroupId);

    // If the window group is null, create it
    if(windowGroup == null) {
        windowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        windowGroup.setAttribute("id", windowGroupId);
        deviceGroup.appendChild(windowGroup);
    }

    // Add our new page to the tab group
    windowGroup.appendChild(newNode);

    // If our node has a parent node, draw a line between them
    if(obj.parentTabId != null) {
        // Find the parent node
        var parentTab = tree.devices[obj.deviceGuid].windows[obj.windowId].tabs[obj.parentTabId];

        // That tab may have a bunch of pages, find the one that actually created this node
        var parentPage = null;
        for(var index in parentTab.pages) {
            var possiblePage = parentTab.pages[index];
            if(possiblePage.pageOpenTime < obj.pageOpenTime && possiblePage.pageCloseTime > obj.pageOpenTime) {
                parentPage = possiblePage;
                break;
            }
        }
        if(parentPage != null) {
            drawPathBetweenNodes(parentPage, obj, windowGroup);
        }
    }
}

/**
 * Redraw the current viewport, starts by clearing all current contents
 * @Author: Tony Grosinger
 */
function redraw() {
    // Clear all contents (Just replace the item since there is so much stuff in it)
    var newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var oldSvg = document.getElementById("svgContainer");
    oldSvg.parentElement.replaceChild(newSvg, oldSvg);
    newSvg.id = "svgContainer";

    // For each device
    for(var deviceGuid in tree.devices) {
        var device = tree.devices[deviceGuid];

        // For each window
        for(var windowId in device.windows) {
            var window = device.windows[windowId];

            // For each tab
            for(var tabId in window.tabs) {
                var tab = window.tabs[tabId];

                // For each page
                for(var pageOpenTime in tab.pages) {
                    var page = tab.pages[pageOpenTime];

                    // Draw the page if not collapsed
                    if(!page.isCollapsed) {
                        drawObjSvg(page);
                    }
                }
            }
        }
    }
}

/**
 * Draws a line between a parent node and a child node. Will add it to a group
 * so the transform can be applied
 * @Param: parent, child Objects from the tree to be connected.
 * @Param: windowGroup SVGGroup object to add element to
 * @Author: Tony Grosinger
 */
function drawPathBetweenNodes(parent, child, windowGroup) {
    var x1 = parent.x;
    var y1 = parent.y + 50;

    var x2 = child.x;
    var y2 = child.y + 25;

    var xMid = x1;
    var yMid = y2;

    // Create the actual shape
    var newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    newPath.setAttribute("d", "M" + x1 + "," + y1 + " Q" + xMid + "," + yMid + " " + x2 + "," + y2);
    newPath.setAttribute("stroke", "black");
    newPath.setAttribute("stroke-width", 3);
    newPath.setAttribute("opacity", 1);
    newPath.setAttribute("fill", "none");

    // Add it to the provided windowGroup
    windowGroup.appendChild(newPath);
}

/**
 * Create an SVG object that contains a rectangle and text for a page node
 * @Param: Tree object to be drawn
 * @Return: SVG Element
 * @Author: Tony Grosinger
 */
function createSvgNode(obj) {
    // Create a wrapper object
    var newNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    newNode.setAttribute("transform", "translate(" + obj.x + "," + obj.y + ")");
    newNode.addEventListener("click", function() {collapseParent(obj.key);});

    // Create the Rectangle
    var newNodeRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    newNodeRect.setAttribute("height", "50");
    newNodeRect.setAttribute("width", obj.width);
    newNodeRect.setAttribute("fill", "red");
    newNode.appendChild(newNodeRect);

    // Create the Text
    var textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
    var tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    textNode.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space","preserve");
    textNode.setAttribute("y", "30");
    var myText = document.createTextNode(obj.pageUrl);
    tspan.appendChild(myText);
    textNode.appendChild(tspan);
    newNode.appendChild(textNode);

    return newNode;
}

function collapseParent(parentKey) {
    // Get the containing window
    var parent = parseKey(parentKey);
    var window = tree.devices[parent.deviceGuid].windows[parent.windowId];

    // TODO: This will not work when a tab has something coming out of it that was not made by the parent

    // For each tab
    for(var tabId in window.tabs) {
        var tab = window.tabs[tabId];

        // For each page
        for(var pageOpenTime in tab.pages) {
            var page = tab.pages[pageOpenTime];

            // Add isCollapsed if the page has the correct parent
            if(page.parentTabId == parent.tabId) {
                page.isCollapsed = true;
            }
        }
    }

    // Redraw the graphic
    redraw();
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