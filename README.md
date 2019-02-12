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
let {data} = await cryptozoa.symmetric.encrypt("my data","mypassword");
{data} = await cryptozoa.symmetric.decrypt(data,"mypassword"); // the final assigment of `data` will equal "my data"

```


# Installation

npm install cryptozoa

The browser file is `browser\cryptozoa.js`.

# Usage

Note: All functions currently take an optional, unused `options` argument to support enhances encryption control in the future.


`async cryptozoa.symmetric.encrypt(data[,string keyOrPassword[,iv[,options={}]])` 

* Returns a Promise for 

```javascript
{
	password:string password,
	data:<base64 encrypted data>
	[,iv:<base64 generated iv>
}
```

* `iv` will only be populated if no `iv` or `keyOrPassword` was provided in the initial call. Make sure to save it so you can provide it to the decryption function. No `iv` is returned because the same `iv` will be generated when decrypting with just a password. Encryption without an `iv` is completely dependent on the strength of the password and is suceptible to brute force or dictionary based attacks. 

* The encryption is `AES-CBC`. 

* If a password is generated it is a random 32 characters. If a password is provided and is less than 32 characters, it is padded with blanks to 32 characters. If no `iv` is provided, it is a random 16 bytes.

`async cryptozoa.symmetric.decrypt(base64data,string keyOrPassword[,base64iv[,options={}]])` 

* Returns a Promise for the decrypted data.

`async cryptozoa.asymmetric.encrypt(data[,publicKey[,options={}]])`

* Returns a Promise for 

```javascript
{
	keys: 
	{
		publicKey:<a key>
		[,privateKey:<a key>]
	},
	data:<base64data>
}
```

* `privateKey` will only be populated if no `publicKey` was provided to do the encryption (an indication keys should be automatically generated). The generated keys are `RSA-OAEP` `SHA-256` modulus `1024` in `spki` and `pkcs8` format. Make sure to save them unless you are just using the encryption for transient network communication. You may wish to encrypt the privateKey using symmetric encyrption with a strong password.

`async cryptozoa.asymmetric.decrypt(data,privateKey[,options={}])` 

* Returns a Prpomise for the `utf-8` decrypted data string.

`async cryptozoa.sign(string text2sign[,privateKey)` 

* Returns a Promise for 

```javascript
{
	keys:
	{
		privateKey:<a key>
		[,publicKey:<a key>]
	},
	signature:<signature>
}
```

`publicKey` will only be populated if no `privateKey` was provided to do the signing (an indication keys should be automatically generated). The generated keys are `RSASSA-PKCS1-v1_5` `SHA-1` modulus `1024` in `spki` and `pkcs8` format. Make sure to save them unless you are just using the encryption for transient network communication.

`async cryptozoa.verify(string text2verify,publicKey,sigature[,options={}])` 

* Returns a Promise for `true` or `false`.

`async cryptozoa.randomPassword([options={}])`

* Returns a {romise for an 8 character mixed case and number random password.

# Examples

By way of example there are unit tests below:

```javascript
it("symmetric", async function() {
	const {password,data,iv} = await cryptozoa.symmetric.encrypt("my data");
	expect(data).to.not.equal("my data");
	expect(password.length).to.equal(32);
	const decrypted = await cryptozoa.symmetric.decrypt(data,password,iv);
	expect(decrypted).to.equal("my data");
});

it("symmetric with password",async function() {
	const {password,data} = await cryptozoa.symmetric.encrypt("my data","mypassword");
	expect(password.trim()).to.equal("mypassword"); // passwords get padded
	expect(password.length).to.equal(32);
	expect(data).to.not.equal("my data");
	const decrypted = await cryptozoa.symmetric.decrypt(data,password);
	expect(decrypted).to.equal("my data");
});

it("asymmetric",async function() {
	const {data,keys:{privateKey}} = await cryptozoa.asymmetric.encrypt("my data");
	expect(data).to.not.equal("my data");
	const decrypted = await cryptozoa.asymmetric.decrypt(data,privateKey);
	expect(decrypted).to.equal("my data");
});

it("asymmetric with password",async function() {
	// generate keys by encryting nothing
	const {keys:{publicKey,privateKey}} = await cryptozoa.asymmetric.encrypt(""), 
			edata = await cryptozoa.asymmetric.encrypt("my data",publicKey);
	expect(edata.data).to.not.equal("my data");
	const decrypted = await cryptozoa.asymmetric.decrypt(edata.data,privateKey);
	expect(decrypted).to.equal("my data");
});

it("sign",async function() {
	const {keys:{publicKey},signature} = await cryptozoa.sign("my data"),
		verified = await cryptozoa.verify("my data",publicKey,signature);
	expect(verified).to.equal(true);
});

it("random password", async function() {
	const pwd = await cryptozoa.randomPassword();
	expect(pwd.length).to.equal(8);
});
```

# Release History (reverse chronological order)

v1.0.0 2019-02-12 Improved documentation. Functions explictly tagged as `async`.

v0.0.11 2017-12-10 BETA: symmetric and asymmetric now both consume and return strings.

v0.0.10 2017-12-06 BETA: Minor README.md corrections.

v0.0.9 2017-12-06 BETA: Improved unit tests and docs.

v0.0.8 2017-12-06 ALPHA: Added unit tests. Simplified asymmetric encryption/decryption.

v0.0.7 2017-07-17 ALPHA: Reduced `sign` and `verify` to use `SHA1` since anything higher than that does not seem to be compatible between browser and server.

v0.0.6 2017-07-17 ALPHA: Added `'node-wbecrypto-ossl` on server to simplify initial development. Will make permanent if PeculiarVentures endorses production use.

v0.0.5 2017-07-12 ALPHA: Converted WebCrypt keys to use PEM format.

v0.0.4 2017-07-11 ALPHA: Added `sign` and `verify`.

v0.0.3 2017-07-10 ALPHA: encrypt now returns a base64 encoded string, decrypt consumes a base64 encoded string

v0.0.2 2017-07-10 ALPHA: Removed testing code that was accidentally deployed, added browser file

v0.0.1 2017-07-10 ALPHA: Initial public release
