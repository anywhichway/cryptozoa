(function() {
	
	var crypto,
		keypair,
		atob,
		btoa,
		isNode = false;
	if(typeof(module)!=="undefined") {
		crypto = require("crypto");
		//crypto = require("node-webcrypto-ossl");
		keypair = require("keypair");
		atob = require("atob");
		btoa = require("btoa");
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
							const pair = keypair({bits:1024});
							keys.privateKey = pair.private;
							keys.publicKey = pair.public;
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
								return {publicKey}
							});
						} else {
							keypromise = crypto.subtle.generateKey(
								    {name,modulusLength:1024,publicExponent:new Uint8Array([0x01, 0x00, 0x01]),hash:{name: "SHA-256"}},
								    true,
								    ["encrypt", "decrypt"]
							).then(k => {
								return crypto.subtle.exportKey("spki",k.publicKey).then(publicKey => {
									keys.publicKey = window.btoa(String.fromCharCode.apply(null, new Uint8Array(publicKey)));
									return crypto.subtle.exportKey("pkcs8",k.privateKey).then(privateKey => {
										keys.privateKey = window.btoa(String.fromCharCode.apply(null, new Uint8Array(privateKey)));
										return k;
									});
								})
							});
						}
						return keypromise.then((k) => {
							return crypto.subtle.encrypt({name}, k.publicKey, convertStringToArrayBufferView(data));
						}).then((data) => {
							return {keys,data:window.btoa(String.fromCharCode.apply(null, new Uint8Array(data)))};
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
									new Uint8Array(window.atob(privateKey).split("").map(function(c) { return c.charCodeAt(0); })), //privateKey,
									{name,hash:{name: "SHA-256"}},
								    false,
								    ["decrypt"]
							).then((key) => {
							return crypto.subtle.decrypt({name}, key, new Uint8Array(window.atob(data).split("").map(function(c) { return c.charCodeAt(0); })));
						}).then((data) => {
							return convertArrayBufferViewtoString(new Uint8Array(data));
						});
					}
				}
			},
			sign: (text2sign,privateKey) => {
				const name = "RSASSA-PKCS1-v1_5",
					keys = {};
				let keybuffer;
				if(isNode) {
					if(privateKey) {
						keys.privateKey = privateKey;
					} else {
						const pair = keypair({bits:1024});
						keys.privateKey = pair.private;
						keys.publicKey = pair.public;
					}
					const sign = crypto.createSign("RSA-SHA256");
					sign.update(text2sign,"utf8");
					return Promise.resolve({keys,signature:sign.sign(keys.privateKey,"base64")});
				} else {
					let keypromise;
					if(privateKey) {
						keypromise = crypto.subtle.importKey(
								"spki",
								privateKey,
								{name,hash:{name: "SHA-256"}},
							    false,
							    ["sign"]
						).then(publicKey => {
							return {privateKey}
						});
					} else {
						keypromise = crypto.subtle.generateKey(
							    {name,modulusLength:1024,publicExponent:new Uint8Array([0x01, 0x00, 0x01]),hash:{name: "SHA-256"}},
							    true,
							    ["sign", "verify"]
						).then(k => {
							return crypto.subtle.exportKey("spki",k.publicKey).then(publicKey => {
								keys.publicKey = window.btoa(String.fromCharCode.apply(null, new Uint8Array(publicKey)));
								return crypto.subtle.exportKey("pkcs8",k.privateKey).then(privateKey => {
									keys.privateKey = window.btoa(String.fromCharCode.apply(null, new Uint8Array(privateKey)));
									return k;
								});
							})
						});
					}
					return keypromise.then((k) => {
						return crypto.subtle.sign(name,k.privateKey,convertStringToArrayBufferView(text2sign));
					}).then(signature => {
						return {keys,signature:window.btoa(String.fromCharCode.apply(null, new Uint8Array(signature)))};
					});
				}
			},
			symmetric: { // use only for local encryption, brute force vulnerable for password without iv
				encrypt: (data,password,iv) => { // key is optional, generates one if necessary, returns the {key:key, iv:vector}
					const name = (isNode ? "AES-256-CBC" : "AES-CBC");
					let returniv = iv,
						keypromise,
						key;
					if(password) {
						key = password;
						const keybuffer = new Uint8Array(256/8);
						keybuffer.set(password);
						if(iv) {
							iv = new Uint8Array(atob(iv).split("").map(function(c) { return c.charCodeAt(0); }));
						} else {
							iv = new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
						}
						if(isNode) {
							const cipher = crypto.createCipheriv(name,keybuffer,iv);
							data = cipher.update(data,"utf8","base64");
							data += cipher.final("base64");
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
						if(iv) {
							iv = new Uint8Array(atob(iv).split("").map(function(c) { return c.charCodeAt(0); }));
						} else {
							returniv = iv = (isNode ? crypto.randomBytes(16) : crypto.getRandomValues(new Uint8Array(16)))
						}
						if(isNode) {
							return new Promise((resolve,reject) => {
								crypto.randomBytes(256/8,(err,buffer) => {
									let cipher = crypto.createCipheriv(name,buffer,iv);
									data = cipher.update(data,"utf8","base64");
									data += cipher.final("base64");
									const result = {key:buffer,data:data};
									if(returniv) result.iv = iv;
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
						const result = {key,data:window.btoa(String.fromCharCode.apply(null, new Uint8Array(data)))}; ;
						if(returniv) result.iv = window.btoa(String.fromCharCode.apply(null, new Uint8Array(iv)));
						return result;
					});
				}, 
				decrypt: (data,key,iv) => {
					const name =(isNode ? "AES-256-CBC" : "AES-CBC");
					let keybuffer = new Uint8Array(256/8);
					keybuffer.set(key);
					if(isNode) {
						if(iv) {
							iv = new Uint8Array(atob(iv).split("").map(function(c) { return c.charCodeAt(0); }));
						} else {
							iv = new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
						}
						const cipher = crypto.createDecipheriv(name,keybuffer,iv);
						data = cipher.update(data,"base64","utf8");
						data += cipher.final("utf8");
						return Promise.resolve(data);
					} else {
						if(iv) {
							iv = new Uint8Array(window.atob(iv).split("").map(function(c) { return c.charCodeAt(0); }));
						} else {
							iv = new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
						}
						return crypto.subtle.importKey(
								"raw",
								keybuffer,
								{name},
							    false,
							    ["encrypt", "decrypt"]
						).then((key) => {
							return crypto.subtle.decrypt({name, iv}, key, new Uint8Array(window.atob(data).split("").map(function(c) { return c.charCodeAt(0); })));
						}).then((data) => {
							return convertArrayBufferViewtoString(new Uint8Array(data));
						});
					}
					
				}
			},
			verify: (text2verify,publicKey,signature) => {
				const name = "RSASSA-PKCS1-v1_5";
				if(isNode) {
					const verify = crypto.createVerify("RSA-SHA256");
					verify.update(text2verify);
					return Promise.resolve(verify.verify(publicKey,signature,"base64"));
				} else {
					return crypto.subtle.importKey(
							"spki",
							new Uint8Array(window.atob(publicKey).split("").map(function(c) { return c.charCodeAt(0); })),
							{name, hash: {name: "SHA-256"}},
						    false,
						    ["verify"]
					).then((key) => {
						return crypto.subtle.verify(name,key,new Uint8Array(window.atob(signature).split("").map(function(c) { return c.charCodeAt(0); })),convertStringToArrayBufferView(text2verify));
					}).then((result) => {
						return result;
					});
				}
			}
	}
	
	/*let data = "QNimate",
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
	

	cryptozoa.sign(data).then(result => {
		cryptozoa.verify(data,result.keys.publicKey,result.signature).then(result => {
			console.log(result);
		})
	});*/
	
	
	
	if(typeof(module)!=="undefined") {
		module.exports = cryptozoa;
	}
	if(typeof(window)!=="undefined") {
		window.cryptozoa = cryptozoa;
	}

}).call(this);
