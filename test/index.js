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
	it("symmetric", function(done) {
		cryptozoa.symmetric.encrypt("my data").then(edata => {
			expect(edata.data).to.not.equal("my data");
			expect(edata.password.length).to.equal(32);
			cryptozoa.symmetric.decrypt(edata.data,edata.password,edata.iv).then(decrypted => {
				expect(decrypted).to.equal("my data");
				done();
			});
		})
	});
	it("symmetric with password",function(done) {
		cryptozoa.symmetric.encrypt("my data","mypassword").then(edata => {
			expect(edata.password.trim()).to.equal("mypassword");
			expect(edata.password.length).to.equal(32);
			expect(edata.data).to.not.equal("my data");
			cryptozoa.symmetric.decrypt(edata.data,edata.password).then(decrypted => {
				expect(decrypted).to.equal("my data");
				done();
			})
		});
	});
	it("asymmetric",function(done) {
		cryptozoa.asymmetric.encrypt("my data").then(edata => {
			expect(edata.data).to.not.equal("my data");
			cryptozoa.asymmetric.decrypt(edata.data,edata.keys.privateKey).then(decrypted => {
				expect(decrypted).to.equal("my data");
				done();
			});
		})
	});
	it("asymmetric with password",function(done) {
		cryptozoa.asymmetric.encrypt("").then(edata => { // generate keys by encryting nothing
			const password = edata.keys.publicKey,
				privateKey =  edata.keys.privateKey;
			cryptozoa.asymmetric.encrypt("my data",password).then(edata => {
				expect(edata.data).to.not.equal("my data");
				cryptozoa.asymmetric.decrypt(edata.data,privateKey).then(decrypted => {
					expect(decrypted).to.equal("my data");
					done();
				});
			});
		})
	});
	it("sign",function(done) {
		cryptozoa.sign("my data").then(result => {
			cryptozoa.verify("my data",result.keys.publicKey,result.signature).then(result => {
				expect(result).to.equal(true);
				done();
			})
		});
	});
	it("random password", function(done) {
		cryptozoa.randomPassword().then(result => {
			expect(result.length).to.equal(8);
			done();
		});
	});
});