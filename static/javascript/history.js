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

var pageStartTime = 1352957091993; // Yea this is hard coded for now
var nodeSizeScalingFactor = 400; // This is what the time difference in ms is divided by to get pixels

// Map of generated keys to an id used on the page
var ids = {};

/* Initialize */
(function() {
    // Load the test data
    testGet('timtan.json');

    drawNowMarker();
})();

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
            tab.yOffset = window.maxYOffset + 40; // Used when stacking tabs within the window
            window.maxYOffset += 40;
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
    var windowGroupId = "group_" + obj.deviceGuid + "_" + obj.windowId;
    var windowGroup = document.getElementById(windowGroupId);

    // If the window group is null, create it
    if(windowGroup == null) {
        windowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
/*
        // If there is already a window in this device, make the top of this window at the bottom of the last one
        var distanceToOffset = 0;
        for(var index in tree.devices[obj.deviceGuid].windows) {
            var tempWindow = tree.devices[obj.deviceGuid].windows[index];

            // Add the maxYOffset to our offset
            distanceToOffset += tempWindow.maxYOffset;
        }
        windowGroup.setAttribute("transform", "translate(0, " + distanceToOffset + ")");
*/
        windowGroup.setAttribute("id", windowGroupId);
        deviceGroup.appendChild(windowGroup);
    }

    // Add our new page to the window group
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
    } else {
        // Check to see if there is a previous page to connect to instead
        var mostRecentFound = null;
        for(var index in tree.devices[obj.deviceGuid].windows[obj.windowId].tabs[obj.tabId].pages) {
            var possiblePage = tree.devices[obj.deviceGuid].windows[obj.windowId].tabs[obj.tabId].pages[index];
            if(possiblePage.pageCloseTime < obj.pageOpenTime) {
                // This is a viable option, check to see if it was the most recent
                if(mostRecentFound != null && mostRecentFound.pageCloseTime < possiblePage.pageOpenTime) {
                    // No good
                    continue;
                }

                // Looks good
                mostRecentFound = possiblePage;
            }
        }

        // If a page was found, draw a line between them
        if(mostRecentFound != null) {
            drawPathBetweenNodes(mostRecentFound, obj, windowGroup, "inLine");
        }
    }
}

function drawNowMarker() {
    var startingX = 683400 / nodeSizeScalingFactor;
    var width = 100;
    var height = 50;

    var triangle = document.createElementNS("http://www.w3.org/2000/svg", "path");
    triangle.setAttribute("d", "M" + startingX + ",0 L" + (startingX + width)  + ",0 L" + (startingX + width/2) + "," + height + " L" + startingX + ",0");
    triangle.setAttribute("class", "nowIcon");

    var verticalLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
    verticalLine.setAttribute("d", "M" + (startingX + (width/2)) + "," + height + " L" + (startingX + (width/2)) + "," + document.height);
    verticalLine.setAttribute("class", "nowLine");

    var svg = document.getElementById("svgContainer");
    svg.appendChild(triangle);
    svg.appendChild(verticalLine);
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
    drawNowMarker();
}

/**
 * Draws a line between a parent node and a child node. Will add it to a group
 * so the transform can be applied
 * @Param: parent, child Objects from the tree to be connected.
 * @Param: windowGroup SVGGroup object to add element to
 * @Author: Tony Grosinger
 */
function drawPathBetweenNodes(parent, child, windowGroup, mode) {
    var x1, y1, x2, y2
    if(mode != null && mode == "inLine") {
        // A node progressing down the history of a tab
        x1 = parent.x + parent.width;
        y1 = parent.y + 15;

        x2 = child.x;
        y2 = y1;
    } else {
        // A child node
        x1 = parent.x + 10;
        y1 = parent.y + 30;

        x2 = child.x;
        y2 = child.y + 15;
    }


    var xMid = x1;
    var yMid = y2;

    // Create the actual shape
    var newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    newPath.setAttribute("d", "M" + x1 + "," + y1 + " Q" + xMid + "," + yMid + " " + x2 + "," + y2);
    newPath.setAttribute('class', 'trail');

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
    newNode.setAttribute('class', 'site');
    newNode.setAttribute("id", "group_" + obj.deviceGuid + "_" + obj.windowId + "_" + obj.tabId + "_" + obj.pageOpenTime);

    newNode.addEventListener("mouseover", function (e) {createSVGTooltip(obj, e.pageX, e.pageY);});
    newNode.addEventListener("mouseout", function() {$('#tooltip').remove();});

    // Create a clipping mask
    var $newNodeMask = $('\
        <clipPath id="mask_' + obj.deviceGuid + "_" + obj.windowId + "_" + obj.tabId + "_" + obj.pageOpenTime +'">\
            <rect width="' + obj.width + '" height="50"/>\
        </clipPath>\
    ');
    newNode.appendChild($newNodeMask[0]);

    // Create the Rectangle
    var newNodeRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    newNodeRect.setAttribute("width", obj.width);
    newNodeRect.setAttribute("height", '30');
    newNodeRect.setAttribute("rx", '4');
    newNodeRect.setAttribute('style', 'fill:url(#siteBackground)')
    newNode.appendChild(newNodeRect);
    newNodeRect.addEventListener("click", function() {collapseParent(obj.key);});

    var link = document.createElementNS("http://www.w3.org/2000/svg", "a");
    var textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
    link.setAttribute('xlink:href', obj.pageUrl);
    textNode.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space","preserve");
    textNode.setAttribute("y", "20");
    textNode.setAttribute("x", "10");
    var myText = document.createTextNode(obj.title);
    textNode.appendChild(myText);
    link.appendChild(textNode);
    newNode.appendChild(newNodeRect);
    newNode.appendChild(link);

    return newNode;
}

/**
 * Create a SVG object that contains a rectangle and text for a tooltip.
 * @Param: Node to attach tooltip to.
 * @Author: Chris Gilbert
 */
function createSVGTooltip(obj, x, y) {
    // Create a new group
    var newNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    newNode.setAttribute("id", "tooltip");
    newNode.setAttribute("transform", "translate(" + x + "," + (y + 10) + ")");

    // Create the tooltip square
    var newNodeRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    newNodeRect.setAttribute("height", "50");
    newNodeRect.setAttribute("width", 400);
    newNodeRect.setAttribute("fill", "grey");

    // Create the text for the tooltip
    var textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
    var tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    textNode.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space","preserve");
    textNode.setAttribute("x", "10");
    textNode.setAttribute("y", "30");

    // Date for start time.
    var date = new Date(obj.pageOpenTime*1000);
    var month = date.getMonth();
    var day = date.getDate();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var formattedTimeStart = month + '/' + day + ' at ' + hours + ':' + minutes + ':' + seconds;

    // Date for end time.
    var date = new Date(obj.pageCloseTime*1000);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var formattedTimeClose = hours + ':' + minutes + ':' + seconds;

    // Format pageURL to fit a set size.
    var currenturl = obj.pageURL;
    if (currenturl.length > 20) {
        currenturl = currenturl.substring(19) + '...';
    }

    var myText = document.createTextNode(currenturl + ' accessed on ' + formattedTimeStart + ' until ' + formattedTimeClose);
    tspan.appendChild(myText);
    textNode.appendChild(tspan);
    newNode.appendChild(newNodeRect);
    newNode.appendChild(textNode);

    $('#svgContainer').append(newNode);
}

/**
 * Will toggle the collapsed attribute of all subpages of a particular parent
 * @Param: String key representing the parent node
 * @Author: Tony Grosinger
 */
function collapseParent(parentKey) {
    // Get the containing window
    var parent = parseKey(parentKey);
    var window = tree.devices[parent.deviceGuid].windows[parent.windowId];

    // For each tab
    for(var tabId in window.tabs) {
        var tab = window.tabs[tabId];

        var newValue = null;

        // For each page
        for(var pageOpenTime in tab.pages) {
            var page = tab.pages[pageOpenTime];

            // Add isCollapsed if the page has the correct parent
            if(newValue != null) {
                page.isCollapsed = newValue;
            } else if(page.parentTabId == parent.tabId && page.pageOpenTime > parent.pageOpenTime && page.pageOpenTime < parent.pageCloseTime) {
                if(newValue != null) {
                    page.isCollapsed = newValue;
                } else {
                    page.isCollapsed = !page.isCollapsed || false;
                    newValue = page.isCollapsed;
                }
            }
        }
    }

    // Redraw the graphic
    redraw();
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
        console.log("Found the deviceGuid");

        // Remove the device guid from the key, then search for the window
        key = key.substring(deviceGuid.length);

        for(var windowId in tree.devices[deviceGuid].windows) {
            if(key.indexOf(windowId) != 0) {
                // Not found here, try the next one
                continue;
            }
            console.log("Found the windowId");

            // Remove the windowId from the key, then search for the tab
            key = key.substring(windowId.length);

            for(var tabId in tree.devices[deviceGuid].windows[windowId].tabs) {
                if(key.indexOf(tabId) != 0) {
                    // Not found here, try the next one
                    continue;
                }
                console.log("Found the tabId");

                // Remove the tabId from the key, then search for the page
                key = key.substring(tabId.length);

                for(var pageOpenTime in tree.devices[deviceGuid].windows[windowId].tabs[tabId].pages) {
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