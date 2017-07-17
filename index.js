(function() {
	
	const convertStringToArrayBufferView = (str) => {
		    const bytes = new Uint8Array(str.length);
		    for (let iii = 0; iii < str.length; iii++) 
		    {
		        bytes[iii] = str.charCodeAt(iii);
		    }
		    return bytes;
		},  
		convertArrayBufferViewToString = (buffer) => {
		    let str = "";
		    for (let iii = 0; iii < buffer.byteLength; iii++) 
		    {
		        str += String.fromCharCode(buffer[iii]);
		    }
		    return str;
		},
		encode = (byteArray) => {
			return btoa(String.fromCharCode.apply(null, new Uint8Array(byteArray)));
		},
		decode = (base64string) => {
			 return new Uint8Array(atob(base64string).split("").map(function(c) { return c.charCodeAt(0); }));
		};
	
	var crypto,
		atob,
		btoa;
	if(typeof(module)!=="undefined") {
		const fromPEM =(pem) => {
				let start = pem.indexOf("-----\n")+6,
					end = pem.lastIndexOf("-----END")-1,
					result = "";
				pem = pem.substring(start,end);
				return pem.replace(/\\n/g,"");
			},
			nodecrypto = require("crypto"),
			keypair = require("keypair");
		atob = require("atob");
		btoa = require("btoa");
		class CryptoKey {};
		class CryptoKeyPair {};
		// a very basic WebCrypto API for the server so that the core cryptozoa can look just like a WebCrypto app
		// this emake design and testing easier, it also means that if/when node supports the webcyrpto API cryptozoa will still work
		// only implements the stuff needed by cryptozoa, some stuff hard coded
		// almost works, just some type of encoding issues when transferring certs across machines, may be the PEM wrappers added on server
		crypto = {
			async getRandomValues(buffer) {
				nodecrypto.randomFillSync(buffer);
				return buffer;
			},
			subtle: {
				async decrypt(algorithm,key,data) {
					if(algorithm.name==="AES-CBC") {
						const cipher = nodecrypto.createDecipheriv("AES-256-CBC",key.raw,algorithm.iv);
						data = cipher.update(convertArrayBufferViewToString(data),"base64","utf8");
						data += cipher.final("utf8");
						return convertStringToArrayBufferView(data);
					} else if(algorithm.name==="RSA-OAEP") {
						return nodecrypto.privateDecrypt({key:key.pem,padding:nodecrypto.constants.RSA_PKCS1_OAEP_PADDING},data);
					}
				},
				async encrypt(algorithm,key,data) {
					if(algorithm.name==="AES-CBC") {
						const cipher = nodecrypto.createCipheriv("AES-256-CBC",key.raw,algorithm.iv);
						data = cipher.update(convertArrayBufferViewToString(data),"utf8","base64");
						data += cipher.final("base64");
						return convertStringToArrayBufferView(data);
					} else if(algorithm.name==="RSA-OAEP") {
						return nodecrypto.publicEncrypt({key:key.pem,padding:nodecrypto.constants.RSA_PKCS1_OAEP_PADDING},data);
					}
				},
				async exportKey(format,key) {
					if(key && typeof(key)==="object" && key instanceof CryptoKeyPair) {
						if(format==="pkcs8") {
							return key.privateKey.pkcs8;
						} else if(format==="spki") {
							return key.publicKey.spki;
						} else {
							throw new Error("Unsupported key type:" + type);
						}
					} else if(!key[format]) {
						throw new Error("Unsupported key type:" + type);
					}
					return key[format];
				},
				async generateKey(algo,extractable,usages) {
					const pair = keypair({bits:algo.modulusLength}),
						cryptokeypair = new CryptoKeyPair();
					cryptokeypair.privateKey = {
						pem: pair.private,
						raw: convertStringToArrayBufferView(fromPEM(pair.private)),
						algo,
						extractable,
						usages
					};
					cryptokeypair.privateKey.pkcs8 = cryptokeypair.privateKey.raw;
					cryptokeypair.publicKey = {
						pem: pair.public,
						raw: convertStringToArrayBufferView(fromPEM(pair.public)),
						algo,
						extractable,
						usages
					};
					cryptokeypair.publicKey.spki = cryptokeypair.publicKey.raw;
					return cryptokeypair;
				},
				async importKey(type,keyData,algo,extractable,usages) {
					if(type==="pkcs8") {
						const str = convertArrayBufferViewToString(keyData);
						return Object.assign(new CryptoKey(),{pem: '-----BEGIN RSA PRIVATE KEY-----\n' + str + "\n-----END RSA PRIVATE KEY-----\n",pkcs8:keyData,raw:keyData,algo,extractable,usages});
					} else if(type=="spki") {
						const str = convertArrayBufferViewToString(keyData);
						return Object.assign(new CryptoKey(),{pem: '-----BEGIN RSA PUBLIC KEY-----\n' + str + "\n-----END RSA PUBLIC KEY-----\n",spki:keyData,raw:keyData,algo,extractable,usages});
					} else if(type="raw") {
						return Object.assign(new CryptoKey(),{raw:keyData,algo,extractable,usages});
					} else {
						throw new Error("Unsupported key type:" + type);
					}
				},
				async sign(algo,key,text2sign) {
					const sign = nodecrypto.createSign("RSA-SHA1");
					sign.update(convertArrayBufferViewToString(text2sign));
					return sign.sign({key:key.pem,padding:nodecrypto.constants.RSA_PKCS1_PSS_PADDING,saltLength:0});
				},
				async verify(algo, key, signature, text2verify) {
					const verify = nodecrypto.createVerify("RSA-SHA1");
					verify.update(convertArrayBufferViewToString(text2verify));
					return verify.verify({key:key.pem,padding:nodecrypto.constants.RSA_PKCS1_PSS_PADDING,saltLength:0},signature);
				}
			}
		}
		// override the above for now with something that works! Although the above is close, it works on the server, but not interactively with browsers
		const WebCrypto = require("node-webcrypto-ossl");
		crypto = new WebCrypto();
	} else {
		crypto = window.crypto || window.msCrypto;
		atob = window.atob;
		btoa = window.btoa;
	}
	
	const cryptozoa = {
			asymmetric: {
				encrypt: async (data,password,publicKey) => {
					const name = "RSA-OAEP";
					let keys = {};
					!publicKey || (keys.publicKey=publicKey);
					if(publicKey) {
						if(typeof(publicKey)==="string") {
							publicKey = await crypto.subtle.importKey(
									"spki",
									decode(publicKey),
									{name,hash:{name: "SHA-256"}},
								    false,
								    ["encrypt"]
							);
						}
					} else {
						keys = await crypto.subtle.generateKey(
							    {name,modulusLength:1024,publicExponent:new Uint8Array([0x01, 0x00, 0x01]),hash:{name: "SHA-256"}},
							    true,
							    ["encrypt", "decrypt"]
						);
						publicKey = keys.publicKey;
						keys.publicKey = encode(await crypto.subtle.exportKey("spki",keys.publicKey));
						keys.privateKey = encode(await crypto.subtle.exportKey("pkcs8",keys.privateKey));
					}
					const iv = encode(new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15])),
						encrypted = await cryptozoa.symmetric.encrypt(data,password,iv);
					password = encode(await crypto.subtle.encrypt({name}, publicKey, convertStringToArrayBufferView(encrypted.password)));
					return {keys,password,data:encrypted.data};
				},
				decrypt: async (data,password,privateKey) => {
					const name ="RSA-OAEP";
					if(typeof(privateKey)==="string") {
						privateKey = await crypto.subtle.importKey(
								"pkcs8",
								decode(privateKey),
								{name,hash:{name: "SHA-256"}},
							    false,
							    ["decrypt"]
						);
					}
					// as rediculous as the nested decode(encode()) seem, they are absolutely necessary!
					password = convertArrayBufferViewToString(decode(encode(await crypto.subtle.decrypt({name}, privateKey,decode(password)))));
					return await cryptozoa.symmetric.decrypt(data,password);
				}
			},
			randomBytes: async (count) => {
				return crypto.getRandomValues(new Uint8Array(count));
			},
			randomPassword: async (size=8) => {
				return encode(await cryptozoa.randomBytes(size)).substring(0,size);
			},
			sign: async (text2sign,privateKey) => {
				const name = "RSASSA-PKCS1-v1_5"; //"RSASSA-PKCS1-v1_5",
					keys = {};
				let keypromise;
				if(privateKey) {
					keypromise = crypto.subtle.importKey(
							"spki",
							decode(privateKey),
							{name,hash:{name: "SHA-1"}},
						    false,
						    ["sign"]
					).then(publicKey => {
						return {privateKey}
					});
				} else {
					keypromise = crypto.subtle.generateKey(
						    {name,modulusLength:1024,publicExponent:new Uint8Array([0x01, 0x00, 0x01]),hash:{name: "SHA-1"}},
						    true,
						    ["sign","verify"]
					).then(k => {
						return crypto.subtle.exportKey("spki",k.publicKey).then(publicKey => {
							keys.publicKey = encode(publicKey);
							return crypto.subtle.exportKey("pkcs8",k.privateKey).then(privateKey => {
								keys.privateKey = encode(privateKey);
								return k;
							});
						})
					});
				}
				return keypromise.then((k) => {
					return crypto.subtle.sign({name,saltLength:0},k.privateKey,convertStringToArrayBufferView(text2sign));
				}).then(signature => {
					return {keys,signature:encode(signature)};
				});
			},
			symmetric: { // use only for local encryption, brute force vulnerable for password without iv
				encrypt: async (data,password,iv) => { // key is optional, generates one if necessary, returns the {key:key, iv:vector}
					const name = "AES-CBC";
					let returniv = iv;
					!iv || (iv = decode(iv));
					if(!password) {
						if(!iv) {
							iv = await cryptozoa.randomBytes(16);
							returniv = encode(iv);
						}
						password = await cryptozoa.randomPassword(32);
					} else {
						password = password.padEnd(32);
						iv || (iv = new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]));
					}
					const key = await crypto.subtle.importKey(
							"raw",
							convertStringToArrayBufferView(password),
							name, //{name},
						    false,
						    ["encrypt", "decrypt"]
					);
					data = encode(await crypto.subtle.encrypt({name, iv}, key, convertStringToArrayBufferView(data)));
					const result = {password,data}; ;
					if(returniv) result.iv = returniv;
					return result;
				}, 
				decrypt: async (data,password,iv) => {
					const name = "AES-CBC";
					password = password.padEnd(32);
					//const keybuffer = convertStringToArrayBufferView(password);
					if(iv) {
						iv = decode(iv);
					} else {
						iv = new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
					}
					const key = await crypto.subtle.importKey(
							"raw",
							convertStringToArrayBufferView(password),
							name, //{name},
						    false,
						    ["encrypt", "decrypt"]
					);
					return convertArrayBufferViewToString(new Uint8Array(await crypto.subtle.decrypt({name, iv}, key, decode(data))));
				}
			},
			verify: async (text2verify,publicKey,signature) => {
				const name = "RSASSA-PKCS1-v1_5",
					key = await crypto.subtle.importKey(
						"spki",
						decode(publicKey),
						{name, hash: {name: "SHA-1"}},
					    false,
					    ["verify"]
					);
				return await crypto.subtle.verify({name,saltLength:0},key,decode(signature),convertStringToArrayBufferView(text2verify));
			}
	}
	/*
	let data = "QNimate",
		password = "mypassword!#!aaa",
		edata;
	
	edata = cryptozoa.symmetric.encrypt(data,password);
	edata.then(edata => {
		cryptozoa.symmetric.decrypt(edata.data,edata.password,edata.iv).then(data => {
			console.log("Symmetric, pwd:",data);
		});
	})
	
	edata = cryptozoa.symmetric.encrypt(data);
	edata.then(edata => {
		cryptozoa.symmetric.decrypt(edata.data,edata.password,edata.iv).then(data => {
			console.log("Symmetric, no pwd:",data);
		});
	})
	
	edata = cryptozoa.asymmetric.encrypt(data,password);
	edata.then(edata => {
		cryptozoa.asymmetric.decrypt(edata.data,edata.password,edata.keys.privateKey).then(data => {
			console.log("Asymmetric, pwd:",data);
		});
	})
	
	edata = cryptozoa.asymmetric.encrypt(data);
	edata.then(edata => {
		cryptozoa.asymmetric.decrypt(edata.data,edata.password,edata.keys.privateKey).then(data => {
			console.log("Asymmetric, no pwd:",data);
		});
	})

	cryptozoa.sign(data).then(result => {
		cryptozoa.verify(data,result.keys.publicKey,result.signature).then(result => {
			console.log(result);
		})
	});
	
	cryptozoa.randomPassword().then(result => {
		console.log(result);
	});
	*/
	
	
	if(typeof(module)!=="undefined") {
		module.exports = cryptozoa;
	}
	if(typeof(window)!=="undefined") {
		window.cryptozoa = cryptozoa;
	}

}).call(this);
