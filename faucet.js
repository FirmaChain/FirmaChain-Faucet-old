const http = require('http')
const url = require('url');
const stream   = require('stream');
const execFile = require('child_process').execFile;
const child_process = require("child_process");
const qs = require('querystring');
const fs = require('fs');
const util = require('util');
const dotenv = require('dotenv')
const log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
const log_stdout = process.stdout;

dotenv.config()
const faucetAddress = process.env.FAUCET_ADDRESS;
const faucetPassword = process.env.FAUCET_PASSWORD;
const limit_amount = process.env.FAUCET_LIMIT_AMOUNT;
const denom = process.env.FAUCET_DENOM || 'ufirma';
const gas = process.env.GAS || 'auto';
const gasAdj = process.env.GAS_ADJ || 2;
const gasPrice = process.env.GAS_PRICE || 0.01;

async function faucet(address, amount) {
	if(amount > limit_amount){
		return JSON.stringify({
		   "result": "failed",
		   "error": "amount limited"
		});
	}
	amount = Math.trunc(amount * ( 10 ** 6 ));
	try {
		const params = [
			"tx",
			"send", 
			faucetAddress, 
			address, 
			amount + denom, 
			"--gas=" + gas, 
			"--gas-adjustment=" + gasAdj, 
			"--gas-prices=" + gasPrice + denom
		];
		
        	let result = child_process.spawnSync("firma-cli", [...params, "-y"], { input: faucetPassword + "\n" });
		try {
		    if(result.stderr != "") {
			return JSON.stringify({
			   "result": "failed",
			   "error": result.stderr.toString('utf8')
			});
		    }
		    let resultParse = JSON.parse(result.stdout.toString('utf8'));
		    return JSON.stringify({
			"result":  "success",
			"tx":       resultParse.txhash,
			"respData": resultParse,
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

const port = process.env.PORT
const host = process.env.HOST
server.listen(port, host)
console.log("START", `Listening at http://${host}:${port}`)
