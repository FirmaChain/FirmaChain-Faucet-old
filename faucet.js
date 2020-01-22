const http = require('http')
const url = require('url');
const stream   = require('stream');
const execFile = require('child_process').execFile;
const child_process = require("child_process");
const qs = require('querystring');
const fs = require('fs');
const util = require('util');

const log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
const log_stdout = process.stdout;

const faucetAddress = "firma1ej6f6wrazt62kxfehrjf2rqyd5z2gvaf2vd92x";
const faucetPassword = "vlfmak12#$";
const denom = "firma";

async function faucet(address, amount) {
	try {
        let result = child_process.spawnSync("firma-cli", ["tx", "send", faucetAddress, address, amount + denom ,"-y"], { input: faucetPassword + "\n" });
        try {
            let resultParse = JSON.parse(result.stdout.toString('utf8'));
            return JSON.stringify({
                "result":  "success",
                "tx":       resultParse.txhash 
            });
        }
        catch (e) {
            return e;
        }
	}
	catch (e){
		console.log("CRITICAL", e);
		return false;
	}
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

console.log = function(type, d) {
	log_file.write(type + "\n" + util.format(d) + '\n');
	log_stdout.write(type + "\n" + util.format(d) + '\n');
};

const server = http.createServer( function(request, response) {
	if (request.method == 'POST') {
		var body = ''
		request.on('data', function(data) {
			body+=data;
		})
		request.on('end', async function() {
			var post = qs.parse(body);
			var result = await faucet(post.address, post.amount);
			console.log("Result", result);
			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end(result);
		})
	} else {
		response.writeHead(403, {'Content-Type': 'text/html'})
		response.end(null)
	}
})

const port = 4555
const host = 'localhost'
server.listen(port, host)
console.log("START", `Listening at http://${host}:${port}`)
