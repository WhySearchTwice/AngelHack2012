/* Initialize */
(function() {
    console.log('test');
})

$.get(
	"http://ec2-174-129-49-253.compute-1.amazonaws.com",
    {user : "anstosa_gmail.com"},
    function(data) {
        alert("Data loaded: " + data);
    }
);