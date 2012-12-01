/* Initialize */
(function() {
    console.log('test');
})

/**
 * GET data from the server. Wrapper for AJAX
 *
 * @param String url remote target of POST
 * @param Function callback a function to be called on success. Will be passed the request object
 */
function get(url, callback) {
    ajax('GET', url, null, callback);
}

/**
 * AJAX helper function. Do not use this function directly
 *
 * @param String url remote target of POST
 * @param Mixed data String or Object to be POSTed
 * @param Function callback a function to be called on success. Will be passed the request object
 */
function ajax(method, url, data, callback) {
    console.log('Sending: ');
    console.log(data);
    var request = new XMLHttpRequest();
        request.open(method, url, true);
        request.setRequestHeader('Content-Type', 'text/plain');
        request.onreadystatechange = function () {
            if (request.readyState == 4 && request.status == 200) {
                console.log('Response received:');
                console.log(request);
                endLogEvent();
                if (typeof callback === 'function') { callback(request); }
            }
        };
        request.send(JSON.stringify(data));
}