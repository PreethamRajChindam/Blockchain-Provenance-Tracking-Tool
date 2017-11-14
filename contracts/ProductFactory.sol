pragma solidity ^0.4.18;

import "./Product.sol";
import "./SupplyChainRegistry.sol";

contract ProductFactory {

    address REGISTRY;

    function ProductFactory(address _registry) public {
        REGISTRY = _registry;
    }

    function () public {
        revert();
    }

    modifier onlyManufacturer {
        SupplyChainRegistry scRegistry = SupplyChainRegistry(REGISTRY);
        require(scRegistry.getActorType(msg.sender) == SupplyChainRegistry.ActorType.Manufacturer);
        _;
    }

    function createProduct(string _name) onlyManufacturer public returns (address) {
        return new Product(_name, this, msg.sender, REGISTRY);
    }
}