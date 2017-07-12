# cryptozoa

1) Dead simple isomorphic encryption wrapper around window.crypto and Node crypto.

2) The collective name for small animals who live in darkness in many places [...](https://en.wikipedia.org/wiki/Cryptozoa)

Cryptozoa supports:

1) AES-256-CBC symmetric encryption with both externally provided passwords or auto-generated secret keys. Initialization vectors can also be provided or auto-generated.

2) RSA-OAEP SHA-256 1024 asymmetric encryption with both externally provided key pairs or automatically generated key pairs.

3) RSA SHA-256 asymmetric signing with both externally provided key pairs or automatically generated key pairs.

The focus is on SIMPLE. `utf8` encoding is assumed for encryptable data input and output. No key or SHA size options are available. Currently Unicode is not supported (Unicode will be supported over time).

Additionally, the implementation is constrained by the intersection of available options between the [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) 
and the [Node JS Crypto API](https://nodejs.org/api/crypto.html).

If you use async/await style programming, you can encrypt and decrypt in as little as two lines of code:

```
let {data} = await cryptozoa.encrypt("my data","mypassword");
{data} = await cryptozoa.decrypt(data,"mypassword"); // the final assigment of `data` will equal "my data"

```

This is an ALPHA release, things are likely to change.

# Installation

npm install cryptozoa

The browser file is `browser\cryptozoa.js`.

# Usage


`cryptozoa.symmetric.encrypt(data[,keyOrPassword[,iv]])` returns a Promise for `{key:<a key>,data:<base64 encrypted data>[,iv:<base64 generated iv>}`. `iv`
will only be populated if no `iv` or `password` was provided in the initial call. Make sure to save it so you can provide it to the decryption function. If a
`keyOrPassword` is provided, then no `iv` is returned because the same `iv` will be generated when decrypting with just a password. Encryption without an `iv`
is completely dependent on the strength of the password and is suceptible to brute force or dictionary based attacks.

`cryptozoa.symmetric.decrypt(base64data,keyOrPassword[,base64iv]])` returns a Promise for the decrypted data.

`cryptozoa.asymmetric.encrypt(data[,publicKey])` returns a Promise for `{keys:{publicKey:<a key>[,privateKey:<a key>]},data:<encypted data>}`.
`privateKey` will only be populated if no `publicKey` was provided to do the encryption (an indication keys should be automatically generated). Make sure
to save them unless you are just using the encryption for transient network communication.

`cryptozoa.asymmetric.decrypt(data,privateKey)` returns the decrypted data.

`cryptozoa.sign(text2sign[,privateKey)` returns a Promise for `{keys:{privateKey:<a key>[,publicKey:<a key>]},signature:<signature>}`. 
`publicKey` will only be populated if no `privateKey` was provided to do the signing (an indication keys should be automatically generated). Make sure
to save them unless you are just using the signing for transient network communication.

`cryptozoa.verify(text2verify,publicKey,sigature)` returns a Promise for `true` or `false`.

```
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
	
	cryptozoa.sign(data).then(result => {
		cryptozoa.verify(data,result.keys.publicKey,result.signature).then(result => {
			console.log(result);
		})
	});
	
```

# Release History (reverse chronological order)

v0.0.5 2017-07-12 ALPHA: Converted WebCrypt keys to use PEM format.

v0.0.4 2017-07-11 ALPHA: Added `sign` and `verify`.

v0.0.3 2017-07-10 ALPHA: encrypt now returns a base64 encoded string, decrypt consumes a base64 encoded string

v0.0.2 2017-07-10 ALPHA: Removed testing code that was accidentally deployed, added browser file

v0.0.1 2017-07-10 ALPHA: Initial public release
