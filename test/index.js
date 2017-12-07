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
			cryptozoa.symmetric.decrypt(edata.data,edata.password,edata.iv).then(decrypted => {
				expect(decrypted).to.equal("my data");
				done();
			});
		})
	});
	it("symmetric with password",function(done) {
		cryptozoa.symmetric.encrypt("my data","mypassword").then(edata => {
			expect(edata.password.trim()).to.equal("mypassword");
			cryptozoa.symmetric.decrypt(edata.data,edata.password).then(decrypted => {
				expect(decrypted).to.equal("my data");
				done();
			})
		});
	});
	it("asymmetric",function(done) {
		cryptozoa.asymmetric.encrypt("my data").then(edata => {
			cryptozoa.asymmetric.decrypt(edata.data,edata.keys.privateKey).then(decrypted => {
				expect(decrypted).to.equal("my data");
				done();
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