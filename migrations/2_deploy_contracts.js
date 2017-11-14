var ProductDatabase = artifacts.require("./ProductDatabase.sol");

module.exports = function(deployer){
    deployer.deploy(ProductDatabase);
}