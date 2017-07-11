(function() {
	
	var crypto,
		keypair,
		isNode = false;
	if(typeof(module)!=="undefined") {
		crypto = require("crypto");
		keypair = require("keypair");
		isNode = true;
	} else {
		crypto = window.crypto || window.msCrypto;
	}
	
	function convertStringToArrayBufferView(str)
	{
	    var bytes = new Uint8Array(str.length);
	    for (var iii = 0; iii < str.length; iii++) 
	    {
	        bytes[iii] = str.charCodeAt(iii);
	    }
	
	    return bytes;
	}   
	
	function convertArrayBufferViewtoString(buffer)
	{
	    var str = "";
	    for (var iii = 0; iii < buffer.byteLength; iii++) 
	    {
	        str += String.fromCharCode(buffer[iii]);
	    }
	
	    return str;
	}
	
	const cryptozoa = {
			asymmetric: {
				encrypt: (data,publicKey) => { // key is optional, generates one if necessary, returns the {key:key, iv:vector}
					const name = "RSA-OAEP";
					let keys = {};
					if(isNode) {
						if(publicKey) {
							keys.publicKey = key;
						} else {
							// generate key pair
							const pair = keypair({bits:1024});
							keys.publicKey = pair.public;
							keys.privateKey = pair.private;
						}
						data = crypto.publicEncrypt({key:keys.publicKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(data));
						return Promise.resolve({keys,data});
					} else {
						let keypromise;
						if(publicKey) {
							keypromise = crypto.subtle.importKey(
									"spki",
									publicKey,
									{name,hash:{name: "SHA-256"}},
								    false,
								    ["encrypt"]
							).then(publicKey => {
								return {publicKey,privateKey:null}
							});
						} else {
							keypromise = crypto.subtle.generateKey(
								    {name,modulusLength:1024,publicExponent:new Uint8Array([0x01, 0x00, 0x01]),hash:{name: "SHA-256"}},
								    true,
								    ["encrypt", "decrypt"]
							).then(k => {
								return crypto.subtle.exportKey("spki",k.publicKey).then(publicKey => {
									keys.publicKey = new Uint8Array(publicKey);
									return crypto.subtle.exportKey("pkcs8",k.privateKey).then(privateKey => {
										keys.privateKey = new Uint8Array(privateKey);
										return k;
									});
								})
							});
						}
						return keypromise.then((k) => {
							return crypto.subtle.encrypt({name}, k.publicKey, convertStringToArrayBufferView(data));
						}).then((data) => {
							return {keys,data:new Uint8Array(data)};
						});
					}
				}, 
				decrypt: (data,privateKey) => {
					const name ="RSA-OAEP";
					if(isNode) {
						return Promise.resolve(crypto.privateDecrypt({key:privateKey,padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(data)).toString("utf8"))
					} else {
						return crypto.subtle.importKey(
									"pkcs8",
									privateKey,
									{name,hash:{name: "SHA-256"}},
								    false,
								    ["decrypt"]
							).then((key) => {
							return crypto.subtle.decrypt({name}, key, data);
						}).then((data) => {
							return convertArrayBufferViewtoString(new Uint8Array(data));
						});
					}
				}
			},
			symmetric: { // use only for local encryption, brute force vulnerable for password without iv
				encrypt: (data,password,iv) => { // key is optional, generates one if necessary, returns the {key:key, iv:vector}
					const name = (isNode ? "AES-256-CBC" : "AES-CBC");
					let hasiv = iv,
						keypromise,
						key;
					if(password) {
						key = password;
						const keybuffer = new Uint8Array(256/8);
						keybuffer.set(password);
						iv || (iv = new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]));
						if(isNode) {
							const cipher = crypto.createCipheriv(name,keybuffer,iv);
							data = cipher.update(data,"utf8","hex");
							data += cipher.final("hex");
							return Promise.resolve({key,data});
						} else {
							keypromise = crypto.subtle.importKey(
									"raw",
									keybuffer,
									{name},
								    false,
								    ["encrypt", "decrypt"]
							);
						}
					} else {
						iv || (hasiv = iv = (isNode ? crypto.randomBytes(16) : crypto.getRandomValues(new Uint8Array(16))));
						if(isNode) {
							return new Promise((resolve,reject) => {
								crypto.randomBytes(256/8,(err,buffer) => {
									let cipher = crypto.createCipheriv(name,buffer,iv);
									data = cipher.update(data,"utf8","hex");
									data += cipher.final("hex");
									const result = {key:buffer,data:data};
									if(hasiv) result.iv = iv;
									resolve(result);
								});
							})
						} else {
							keypromise = crypto.subtle.generateKey(
								    {name,length:256},
								    true,
								    ["encrypt", "decrypt"]
								).then((k) => {
									return crypto.subtle.exportKey("raw",k).then((keydata) => {
										key = new Uint8Array(keydata);
										return k;
									});
								});
						}
					}
					return keypromise.then((key) => {
						return crypto.subtle.encrypt({name, iv}, key, convertStringToArrayBufferView(data));
					}).then((data) => {
						const result = {key,data:new Uint8Array(data)};
						if(hasiv) result.iv = iv;
						return result;
					});
				}, 
				decrypt: (data,key,iv) => {
					const name =(isNode ? "AES-256-CBC" : "AES-CBC");
					let keybuffer;
					if(typeof(key)==="string") {
						keybuffer = new Uint8Array(256/8);
						keybuffer.set(key);
					} else {
						keybuffer = key;
					}
					iv || (iv = new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]))
					if(isNode) {
						const cipher = crypto.createDecipheriv(name,keybuffer,iv);
						data = cipher.update(data,"hex","utf8");
						data += cipher.final("utf8");
						return Promise.resolve(data);
					} else {
						return crypto.subtle.importKey(
								"raw",
								keybuffer,
								{name},
							    false, //whether the key is extractable (i.e. can be used in exportKey)
							    ["encrypt", "decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
						).then((key) => {
							return crypto.subtle.decrypt({name, iv}, key, data);
						}).then((data) => {
							return convertArrayBufferViewtoString(new Uint8Array(data));
						});
					}
					
				}
			}
	}
	
	let data = "QNimate",
		password = "mypassword!#!aaa",
		edata;
	
	edata = cryptozoa.symmetric.encrypt(data);
	edata.then(edata => {
		cryptozoa.symmetric.decrypt(edata.data,edata.key,edata.iv).then(data => {
			console.log("Symmetric, no pwd:",data);
		});
	})
	
	edata = cryptozoa.symmetric.encrypt(data,password);
	edata.then(edata => {
		cryptozoa.symmetric.decrypt(edata.data,edata.key,edata.iv).then(data => {
			console.log("Symmetric, pwd:",data);
		});
	})
	
	edata = cryptozoa.asymmetric.encrypt(data);
	edata.then(edata => {
		cryptozoa.asymmetric.decrypt(edata.data,edata.keys.privateKey).then(data => {
			console.log("Asymmetric:",data);
		});
	})
	
	if(typeof(module)!=="undefined") {
		module.exports = cryptozoa;
	}
	if(typeof(window)!=="undefined") {
		window.cryptozoa = cryptozoa;
	}

}).call(this);
