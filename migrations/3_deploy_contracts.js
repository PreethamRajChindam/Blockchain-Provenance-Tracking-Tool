var SupplyChainRegistry = artifacts.require("./SupplyChainRegistry.sol");
var ProductFactory = artifacts.require("./ProductFactory.sol");

module.exports = function(deployer){
    deployer.deploy(SupplyChainRegistry);
    deployer.deploy(SupplyChainRegistry).then(function() {
        return deployer.deploy(ProductFactory, SupplyChainRegistry.address);
      });
}