# cryptozoa

1) Dead simple isomorphic encryption wrapper around window.crypto and Node crypto.

2) The collective name for small animals who live in darkness in many places [...](https://en.wikipedia.org/wiki/Cryptozoa)

Cryptozoa supports:

1) AES-256-CBC symmetric encryption with both externally provided passwords or auto-generated secret keys. Initialization vectors can also be provided or auto-generated.

2) RSA-OAEP 1024 asymmetric encryption with both externally provided key pairs or automatically generated key pairs.

If you use async/await style programming, you can encrypt and decrypt in as little as two lines of code:

```
let {data} = await cryptozoa.encrypt("my data","mypassword");
{data} = await cryptozoa.decrypt(data,"mypassword"); // the final assigment of `data` will equal "my data"

```

This is an ALPHA release, things are likely to change.

# Installation

npm install cryptozoa

The `index.js` file can be loaded directly into a browser.

# Usage

The focus is on SIMPLE. `utf8` encoding is assumed for encryptable data input and output. No key size options are available.

`cryptozoa.symmetric.encrypt(data[,keyOrPassword[,iv]])` returns `{key:<a key>,data:<encrypted data>[,iv:<generated iv>}`. `iv`
will only be populated if no `iv` or `password` was provided in the initial call. Make sure to save it so you can provide it to the decryption function. If a
`keyOrPassword` is provided, then no `iv` is returned because the same `iv` will be generated when decrypting with just a password.

`cryptozoa.symmetric.decrypt(data,keyOrPassword[,iv]])` returns the decrypted data.

`cryptozoa.asymmetric.encrypt(data[,publicKey])` returns `{keys:{publicKey:<a key>[,privateKey:<a key>]},data:<encypted data>}`.
`privateKey` will only be populated if no `publicKey` was provided to do the encryption (an indication keys should be automatically generated). Make sure
to save them unless you are just using the encryption for transient network communication.

`cryptozoa.asymmetric.decrypt(data,privateKey)` returns the decrypted data.

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
```

# Release History (reverse chronological order)

v0.0.1 2017-07-10 ALPHA: Initial public release
