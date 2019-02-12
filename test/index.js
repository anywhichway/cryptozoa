var chai,
	expect,
	cryptozoa,
	_;
if(typeof(window)==="undefined") {
	chai = require("chai");
	expect = chai.expect;
	cryptozoa = require("../index.js");
	_ = require("lodash");
	
}

describe("Test",function() {
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
		const {keys:{publicKey,privateKey}} = await cryptozoa.asymmetric.encrypt(""), // generate keys by encryting nothing
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
});